#!/usr/bin/env node
/**
 * Bundles the framework-free elements with esbuild (types come from tsc):
 *   dist/elements.iife.js     self-contained, minified; inline into MCP widget HTML.
 *                             Defines every element and exposes window.OrgXElements.
 *   dist/elements.min.js      the same as one minified ES module (CDN / <script type=module>).
 * Size: the target for the IIFE is 25 KB minified (warn above it); the build
 * fails above 32 KB so regressions cannot slip in unnoticed.
 */
import { build, transform } from 'esbuild';
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'src/elements/index.ts');
const iifeEntry = resolve(root, 'src/elements/iife.ts');
const TARGET = 25 * 1024;
const LIMIT = 32 * 1024;
const banner = `/* @useorgx/orgx-ui-kit elements ${JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version} */`;

/**
 * The element styles live in `const ...CSS = \`...\`` template literals. Minify
 * them with esbuild's CSS minifier before bundling (interpolations are kept).
 */
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
            const restored = min.trim().replace(/__OXI(\d+)__/g, (_, i) => holes[Number(i)]);
            return [m, a + restored + z];
          })(),
        );
        return m;
      });
      for (const [from, to] of await Promise.all(jobs)) code = code.replace(from, () => to);
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

const iife = await build({
  ...common,
  entryPoints: [iifeEntry],
  format: 'iife',
  globalName: 'OrgXElements',
  outfile: resolve(root, 'dist/elements.iife.js'),
  metafile: true,
  charset: 'utf8',
});
if (process.env.OX_BUNDLE_REPORT) {
  for (const [file, { bytesInOutput }] of Object.entries(Object.values(iife.metafile.outputs)[0].inputs))
    console.log(`  ${file} ${bytesInOutput}`);
}
await build({ ...common, entryPoints: [entry], format: 'esm', outfile: resolve(root, 'dist/elements.min.js'), charset: 'utf8' });

for (const f of ['elements.iife.js', 'elements.min.js']) {
  const p = resolve(root, 'dist', f);
  const size = statSync(p).size;
  const gz = gzipSync(readFileSync(p)).length;
  console.log(`bundle: ${f} ${(size / 1024).toFixed(1)} KB min, ${(gz / 1024).toFixed(1)} KB gzip`);
  if (f === 'elements.iife.js' && size > LIMIT) {
    console.error(`bundle: ${f} is over the ${LIMIT / 1024} KB limit`);
    process.exit(1);
  }
  if (f === 'elements.iife.js' && size > TARGET) console.warn(`bundle: ${f} is above the ${TARGET / 1024} KB target`);
}
