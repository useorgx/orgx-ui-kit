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
    for (const k of [...light, 'teal-rgb', 'warning-rgb', 'danger-rgb', 'primary', 'action']) expect(css, k).toContain(`--ox-${k}:`);
    expect(css).toContain('--ox-teal-rgb:0,201,167');
  });

  it('makes the primary action the homepage lime with readable text in both themes', () => {
    const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const rgb = (v: string) =>
      v.startsWith('#') ? [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) : v.split(',').map(Number);
    const lum = (v: string) => {
      const [r, g, b] = rgb(v);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const { dark, light } = json.color;
    // The homepage .ox-btn-primary: --ox-action rgb(191,255,0) with --ox-action-fg #0b1203.
    expect(dark['action-rgb']).toBe('191,255,0');
    expect(dark['action-fg']).toBe('#0b1203');
    expect(light['action-fg']).toBe('#0b1203');
    for (const t of [dark, light]) {
      expect(ratio(t['action-fg'], t['action-rgb'])).toBeGreaterThanOrEqual(7);
      expect(ratio(t['action-fg'], t['action-hold'])).toBeGreaterThanOrEqual(4.5);
    }
    // On white: the edge reads, and lime is never text on white (primary is the deep lime).
    expect(ratio(light['action-border'], light.bg)).toBeGreaterThanOrEqual(3);
    expect(ratio(light['primary-rgb'], light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(light.focus, light.bg)).toBeGreaterThanOrEqual(3);
    // Amber stays the needs-you tone only.
    expect(dark.warning).toBe('#FBBF24');
    expect(dark['edge-amber-rgb']).toBe('251,191,36');
    for (const t of [dark, light]) for (const k of ['action-rgb', 'primary-rgb', 'focus']) expect(t[k]).not.toMatch(/251,\s*191,\s*36/);
    expect(css).toContain('--ox-action:rgb(var(--ox-action-rgb))');
    expect(css).toMatch(/\[data-theme="dark"\]\{[^}]*--ox-action-rgb:191,255,0/);
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
