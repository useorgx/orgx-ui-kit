#!/usr/bin/env node
/**
 * Generates the token outputs from tokens/tokens.json (the single source):
 *   dist/tokens.css            --ox-* custom properties, light default + dark
 *   dist/tokens.js / .d.ts     ESM export of the token object
 *   dist/tailwind-preset.cjs   Tailwind preset mapping colors to the CSS variables
 *
 * No dependencies; run with `node scripts/build-tokens.mjs`.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(resolve(root, 'tokens/tokens.json'), 'utf8'));
const out = resolve(root, 'dist');
mkdirSync(out, { recursive: true });

/** Solid hex colors also get an `-rgb` channel triplet so alpha tints work. */
const RGB_KEYS = ['teal', 'warning', 'danger', 'lime', 'iris', 'mute'];

function hexToRgb(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Expected hex color, got ${hex}`);
  let h = m[1];
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function colorVars(theme) {
  const lines = [];
  for (const [k, v] of Object.entries(theme)) lines.push(`--ox-${k}:${v}`);
  for (const k of RGB_KEYS) lines.push(`--ox-${k}-rgb:${hexToRgb(theme[k])}`);
  lines.push('--ox-primary:rgb(var(--ox-primary-rgb))');
  return lines;
}

function sharedVars() {
  const lines = [];
  lines.push(`--ox-font:${tokens.font.font}`);
  lines.push(`--ox-mono:${tokens.font.mono}`);
  for (const [k, v] of Object.entries(tokens.radius)) lines.push(`--ox-radius-${k}:${v}`);
  for (const [k, v] of Object.entries(tokens.space)) lines.push(`--ox-space-${String(k).replace('.', '_')}:${v}`);
  for (const [k, v] of Object.entries(tokens.size)) lines.push(`--ox-size-${k}:${v}`);
  for (const [k, t] of Object.entries(tokens.type)) {
    lines.push(`--ox-type-${k}-size:${t.size}`);
    lines.push(`--ox-type-${k}-line:${t.lineHeight}`);
    lines.push(`--ox-type-${k}-weight:${t.weight}`);
    lines.push(`--ox-type-${k}-tracking:${t.tracking}`);
  }
  for (const [k, v] of Object.entries(tokens.motion.duration)) lines.push(`--ox-dur-${k}:${v}`);
  for (const [k, v] of Object.entries(tokens.motion.easing)) lines.push(`--ox-ease-${k}:${v}`);
  lines.push('--ox-ease:var(--ox-ease-out)');
  for (const [k, a] of Object.entries(tokens.agent)) {
    lines.push(`--agent-${k}:${a.hue}`);
    lines.push(`--agent-${k}-rgb:${hexToRgb(a.hue)}`);
  }
  return lines;
}

const block = (sel, lines) => `${sel}{\n  ${lines.join(';\n  ')};\n}`;
const light = colorVars(tokens.color.light);
const dark = colorVars(tokens.color.dark);

const css = [
  `/* @useorgx/orgx-ui-kit tokens ${tokens.version}. Generated from tokens/tokens.json; do not edit. */`,
  block(':root', [...sharedVars(), 'color-scheme:light', ...light]),
  block('[data-theme="light"]', ['color-scheme:light', ...light]),
  `@media (prefers-color-scheme: dark){\n${block(':root:not([data-theme="light"])', ['color-scheme:dark', ...dark])}\n}`,
  block('[data-theme="dark"]', ['color-scheme:dark', ...dark]),
  '',
].join('\n');
writeFileSync(resolve(out, 'tokens.css'), css);

const js = `/* Generated from tokens/tokens.json; do not edit. */\nexport const tokens = ${JSON.stringify(tokens, null, 2)};\nexport default tokens;\n`;
writeFileSync(resolve(out, 'tokens.js'), js);
writeFileSync(
  resolve(out, 'tokens.d.ts'),
  `/* Generated from tokens/tokens.json; do not edit. */\ndeclare const tokens: ${JSON.stringify(tokens, null, 2)};\nexport { tokens };\nexport default tokens;\n`,
);

// Tailwind preset: every color resolves to a CSS variable, so one class works in both
// themes and no dark: variant is needed.
const v = (name) => `var(--ox-${name})`;
const rgbA = (name) => `rgba(var(--ox-${name}-rgb), <alpha-value>)`;
const colors = {
  ox: {
    bg: v('bg'),
    panel: v('panel'),
    'panel-solid': v('panel-solid'),
    well: v('well-bg'),
    border: v('border'),
    'border-strong': v('border-strong'),
    text: v('text'),
    'text-2': v('text-2'),
    'text-muted': v('text-muted'),
    teal: rgbA('teal'),
    warning: rgbA('warning'),
    danger: rgbA('danger'),
    lime: rgbA('lime'),
    iris: rgbA('iris'),
    mute: rgbA('mute'),
    primary: rgbA('primary'),
    'on-primary': v('on-primary'),
    focus: v('focus'),
  },
  agent: Object.fromEntries(Object.keys(tokens.agent).map((k) => [k, `rgba(var(--agent-${k}-rgb), <alpha-value>)`])),
  // The 0.1 React surfaces use iris-400; keep that class working.
  iris: { DEFAULT: rgbA('iris'), 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5' },
};
const preset = {
  theme: {
    extend: {
      colors,
      fontFamily: { ox: [v('font')], 'ox-mono': [v('mono')] },
      borderRadius: Object.fromEntries(Object.keys(tokens.radius).map((k) => [`ox-${k}`, `var(--ox-radius-${k})`])),
      boxShadow: { ox: v('shadow'), 'ox-well': v('well-shadow') },
      transitionTimingFunction: { ox: v('ease-out') },
      transitionDuration: Object.fromEntries(Object.keys(tokens.motion.duration).map((k) => [`ox-${k}`, `var(--ox-dur-${k})`])),
      minHeight: { touch: v('size-touch') },
      minWidth: { touch: v('size-touch') },
    },
  },
};
writeFileSync(
  resolve(out, 'tailwind-preset.cjs'),
  `/* Generated from tokens/tokens.json; do not edit. Load dist/tokens.css (or @useorgx/orgx-ui-kit/tokens.css) for the variables. */\nmodule.exports = ${JSON.stringify(preset, null, 2)};\n`,
);
writeFileSync(
  resolve(out, 'tailwind-preset.d.cts'),
  `declare const preset: { theme: { extend: Record<string, unknown> } };\nexport = preset;\n`,
);

console.log(`tokens: wrote tokens.css (${css.length} B), tokens.js, tailwind-preset.cjs`);
