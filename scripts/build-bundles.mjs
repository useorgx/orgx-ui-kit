#!/usr/bin/env node
/**
 * Bundles the framework-free elements with esbuild (types come from tsc):
 *   dist/elements.iife.js         everything, self-contained, minified; inline into
 *                                 MCP widget HTML. Defines every element and
 *                                 exposes window.OrgXElements.
 *   dist/elements-core.iife.js    the shared runtime + <ox-state-chip>,
 *                                 <ox-attention-line>, <ox-receipt-row>.
 *   dist/elements-footer.iife.js  <ox-footer>   } add-ons: each needs core (or the
 *   dist/elements-glyph.iife.js   <ox-glyph>    } full bundle) loaded first and
 *   dist/elements-avatar.iife.js  <ox-avatar>   } reuses its runtime.
 *   dist/elements.min.js          everything as one minified ES module (CDN / <script type=module>).
 * Every IIFE registers idempotently (first copy wins), so any combination may
 * be loaded, in any number, as long as core (or the full bundle) comes first.
 *
 * Size budgets (minified bytes): IIFES below. The full IIFE targets 33 KB
 * (warn above it) and fails above 34 KB; every split bundle fails above its
 * own budget, so a regression cannot slip in unnoticed. Raise a budget only
 * on purpose, in the same change that grows the bundle.
 */
import { build, transform } from 'esbuild';
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'src/elements/index.ts');
const KB = 1024;
/** name -> [entry, budget in bytes (fail above), add-on (reads the core runtime)] */
const IIFES = {
  // 0.3.0-alpha.0: +7.3 KB for photo avatars (alias resolution, OrgX mark and
  // initials fallbacks) and the <ox-agent-card> hover card. Was 25.0 KB.
  'elements.iife.js': ['iife.ts', 34 * KB, false], // 33.0 KB
  'elements-core.iife.js': ['iife-core.ts', 12 * KB, false], // 11.6 KB
  'elements-footer.iife.js': ['iife-footer.ts', 10.5 * KB, true], // 10.3 KB
  'elements-glyph.iife.js': ['iife-glyph.ts', 3 * KB, true], // 2.5 KB
  'elements-avatar.iife.js': ['iife-avatar.ts', 10 * KB, true], // 9.4 KB: <ox-avatar> 3.6 + <ox-agent-card> 5.7 (was 2.2 KB)
};
const TARGET = 33 * KB; // the full IIFE also warns above this
const banner = `/* @useorgx/orgx-ui-kit elements ${JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version} */`;

/**
 * The element styles live in `const ...CSS = \`...\`` template literals. Minify
 * them with esbuild's CSS minifier before bundling (interpolations are kept),
 * then abbreviate them with the dictionary in src/elements/shared.ts (ABBR /
 * ABBR_WORDS), which adoptStyles expands at runtime.
 */
const sharedSrc = readFileSync(resolve(root, 'src/elements/shared.ts'), 'utf8');
const ABBR = [.../const ABBR = '([^']+)'/.exec(sharedSrc)[1]];
const ABBR_WORDS = /const ABBR_WORDS =\s*'([^']+)'/.exec(sharedSrc)[1].split(',');
if (ABBR.length != ABBR_WORDS.length) throw new Error('shared.ts: ABBR and ABBR_WORDS differ in length');
const abbreviate = (css, where) => {
  const clash = ABBR.find((c) => css.includes(c));
  if (clash) throw new Error(`${where}: CSS contains "${clash}", which shared.ts ABBR reserves; pick another abbreviation`);
  ABBR_WORDS.forEach((w, i) => (css = css.split(w).join(ABBR[i])));
  return css;
};
/**
 * IIFE only: drop the quotes around plain markup attribute values in the
 * elements' HTML strings (` class="dot"` -> ` class=dot`). The parsed DOM is the
 * same; a value followed by `/` (self-closing tag) or `${` keeps its quotes.
 * The ES module keeps them, since it exports GLYPHS / glyphSvg markup that
 * consumers may parse as XML.
 */
const MARKUP_ATTRS =
  'class|part|aria-hidden|aria-live|fill|stroke|stroke-linecap|stroke-linejoin|stroke-width|fill-opacity|cx|cy|r|x|y|rx|width|height|type|name|id|role|decoding';
const unquoteAttrs = (code) => code.replace(new RegExp(`(\\s)(${MARKUP_ATTRS})="([\\w.#%:-]+)"(?=[\\s>])`, 'g'), '$1$2=$3');

const minifyCssLiterals = {
  name: 'minify-css-literals',
  setup(b) {
    b.onLoad({ filter: /src[\\/]elements[\\/].*\.ts$/ }, async (args) => {
      let code = readFileSync(args.path, 'utf8');
      const re = /(const [A-Z_]*CSS[A-Z_]* = `)([\s\S]*?)(`;)/g;
      const jobs = [];
      code.replace(re, (m, a, body, z) => {
        jobs.push(
          (async () => {
            const holes = [];
            const masked = body.replace(/\$\{[^}]+\}/g, (h) => `__OXI${holes.push(h) - 1}__`);
            const { code: min } = await transform(masked, { loader: 'css', minify: true, target: ['chrome100', 'safari15', 'firefox100'] });
            const restored = abbreviate(min.trim(), args.path).replace(/__OXI(\d+)__/g, (_, i) => holes[Number(i)]);
            return [m, a + restored + z];
          })(),
        );
        return m;
      });
      for (const [from, to] of await Promise.all(jobs)) code = code.replace(from, () => to);
      if (b.initialOptions.format == 'iife') code = unquoteAttrs(code);
      return { contents: code, loader: 'ts' };
    });
  },
};

const common = {
  bundle: true,
  minify: true,
  target: 'es2022',
  legalComments: 'none',
  banner: { js: banner },
  logLevel: 'warning',
  plugins: [minifyCssLiterals],
};

/**
 * Add-ons: every `./shared.js` import resolves to the runtime the core bundle
 * published on window.OrgXElements._rt (the keys of `runtime` in
 * src/elements/runtime.ts), so the add-on carries no second copy of it.
 */
const rtKeys = /export const runtime = \{([^}]*)\}/
  .exec(readFileSync(resolve(root, 'src/elements/runtime.ts'), 'utf8'))[1]
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);
const useCoreRuntime = (name) => ({
  name: 'core-runtime',
  setup(b) {
    b.onResolve({ filter: /^\.\/shared\.js$/ }, () => ({ path: 'ox-runtime', namespace: 'ox-runtime' }));
    b.onLoad({ filter: /.*/, namespace: 'ox-runtime' }, () => ({
      contents:
        `const r=globalThis.OrgXElements?._rt;` +
        `if(!r)throw Error("@useorgx/orgx-ui-kit: load elements-core.iife.js (or elements.iife.js) before ${name}");` +
        `export const{${rtKeys.join(',')}}=r;`,
      loader: 'js',
    }));
  },
});

const sizes = {};
for (const [file, [src, , addon]] of Object.entries(IIFES)) {
  const out = await build({
    ...common,
    plugins: addon ? [useCoreRuntime(file), ...common.plugins] : common.plugins,
    entryPoints: [resolve(root, 'src/elements', src)],
    format: 'iife',
    outfile: resolve(root, 'dist', file),
    metafile: true,
    charset: 'utf8',
  });
  if (process.env.OX_BUNDLE_REPORT) {
    console.log(file);
    for (const [f, { bytesInOutput }] of Object.entries(Object.values(out.metafile.outputs)[0].inputs)) console.log(`  ${f} ${bytesInOutput}`);
  }
}
await build({ ...common, entryPoints: [entry], format: 'esm', outfile: resolve(root, 'dist/elements.min.js'), charset: 'utf8' });

let failed = false;
for (const f of [...Object.keys(IIFES), 'elements.min.js']) {
  const p = resolve(root, 'dist', f);
  const size = statSync(p).size;
  const gz = gzipSync(readFileSync(p)).length;
  const budget = IIFES[f]?.[1];
  console.log(`bundle: ${f.padEnd(24)} ${(size / KB).toFixed(1).padStart(5)} KB min, ${(gz / KB).toFixed(1).padStart(4)} KB gzip${budget ? ` (budget ${(budget / KB).toFixed(1)} KB)` : ''}`);
  if (budget && size > budget) {
    console.error(`bundle: ${f} is ${size} B, over its ${budget} B budget (scripts/build-bundles.mjs)`);
    failed = true;
  }
  if (f == 'elements.iife.js' && size > TARGET) console.warn(`bundle: ${f} is above the ${TARGET / KB} KB target`);
}
if (failed) process.exit(1);
