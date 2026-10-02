import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const json = JSON.parse(readFileSync(resolve(root, 'tokens/tokens.json'), 'utf8'));
let css = '';

beforeAll(() => {
  execFileSync(process.execPath, [resolve(root, 'scripts/build-tokens.mjs')], { cwd: root });
  css = readFileSync(resolve(root, 'dist/tokens.css'), 'utf8');
});

describe('tokens', () => {
  it('emits light by default and dark for [data-theme] and prefers-color-scheme', () => {
    expect(css).toMatch(/:root\{[^}]*--ox-bg:#ffffff/);
    expect(css).toMatch(/\[data-theme="dark"\]\{[^}]*--ox-bg:#02040a/);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)\{\s*:root:not\(\[data-theme="light"\]\)\{[^}]*--ox-bg:#02040a/);
  });

  it('defines every color token in both themes, with rgb channels for tints', () => {
    const light = Object.keys(json.color.light);
    expect(Object.keys(json.color.dark).sort()).toEqual(light.sort());
    for (const k of [...light, 'teal-rgb', 'warning-rgb', 'danger-rgb', 'primary']) expect(css, k).toContain(`--ox-${k}:`);
    expect(css).toContain('--ox-teal-rgb:0,201,167');
  });

  it('defines all seven agent hues', () => {
    const hues: Record<string, string> = {
      pace: '#14b8a6',
      eli: '#22c55e',
      mark: '#f97316',
      sage: '#ec4899',
      orion: '#84cc16',
      dana: '#a855f7',
      xandy: '#6366f1',
    };
    for (const [k, hex] of Object.entries(hues)) {
      expect(css).toContain(`--agent-${k}:${hex}`);
      expect(css).toContain(`--agent-${k}-rgb:`);
    }
  });

  it('builds a Tailwind preset and an ESM token object from the same source', async () => {
    const preset = createRequire(import.meta.url)(resolve(root, 'dist/tailwind-preset.cjs'));
    expect(preset.theme.extend.colors.ox.teal).toBe('rgba(var(--ox-teal-rgb), <alpha-value>)');
    expect(preset.theme.extend.colors.ox.bg).toBe('var(--ox-bg)');
    expect(preset.theme.extend.colors.agent.dana).toBe('rgba(var(--agent-dana-rgb), <alpha-value>)');
    const mod = await import(resolve(root, 'dist/tokens.js'));
    expect(mod.tokens.agent.xandy.hue).toBe('#6366f1');
    expect(mod.default).toEqual(json);
  });
});
