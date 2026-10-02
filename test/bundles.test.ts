import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import { unabbr } from '../src/elements/shared.js';

/*
 * The IIFE bundles as a widget loads them: each case evaluates dist files in a
 * fresh window, in order, the way inlined <script> tags run.
 */
const root = resolve(__dirname, '..');
const dist = (f: string) => readFileSync(resolve(root, 'dist', f), 'utf8');
const ALL = ['ox-state-chip', 'ox-attention-line', 'ox-receipt-row', 'ox-footer', 'ox-glyph', 'ox-avatar'];
const CORE = ['ox-state-chip', 'ox-attention-line', 'ox-receipt-row'];
const SPLIT = ['elements-core.iife.js', 'elements-footer.iife.js', 'elements-glyph.iife.js', 'elements-avatar.iife.js'];
let src: Record<string, string> = {};

type Win = JSDOM['window'] & {
  OrgXElements: { ELEMENTS: Record<string, unknown>; avatarConfig: { baseUrl: string }; defineElements(): void };
};

function load(...files: string[]): Win {
  const w = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' }).window as Win;
  for (const f of files) w.eval(src[f]!);
  return w;
}

const defined = (w: Win) => ALL.filter((t) => w.customElements.get(t));

/** Shadow markup and styles of an element, as a page would get them. */
function render(w: Win, tag: string, attrs: Record<string, string>) {
  const el = w.document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  w.document.body.append(el);
  const r = el.shadowRoot!;
  const css = [...(r.adoptedStyleSheets ?? [])].map((s) => [...s.cssRules].map((x) => x.cssText).join('')).join('') +
    [...r.querySelectorAll('style')].map((s) => s.textContent).join('');
  return { html: [...r.children].filter((n) => n.tagName != 'STYLE').map((n) => n.outerHTML).join(''), css };
}

beforeAll(() => {
  execFileSync(process.execPath, [resolve(root, 'scripts/build-bundles.mjs')], { cwd: root });
  src = Object.fromEntries(['elements.iife.js', ...SPLIT].map((f) => [f, dist(f)]));
});

describe('split IIFE bundles', () => {
  it('core defines the chip, attention line and receipt row, and exposes the global', () => {
    const w = load('elements-core.iife.js');
    expect(defined(w)).toEqual(CORE);
    expect(Object.keys(w.OrgXElements.ELEMENTS)).toEqual(CORE);
    expect(w.OrgXElements.avatarConfig.baseUrl).toMatch(/^https:\/\/mcp\.useorgx\.com\//);
    expect(typeof w.OrgXElements.defineElements).toBe('function');
  });

  it('each add-on defines only its element on top of core', () => {
    for (const [file, tag] of [
      ['elements-footer.iife.js', 'ox-footer'],
      ['elements-glyph.iife.js', 'ox-glyph'],
      ['elements-avatar.iife.js', 'ox-avatar'],
    ] as const) {
      expect(defined(load('elements-core.iife.js', file))).toEqual([...CORE, tag]);
    }
    expect(defined(load(...SPLIT))).toEqual(ALL);
  });

  it('is idempotent: every bundle twice, and the full bundle next to the split ones', () => {
    const w = load(...SPLIT, ...SPLIT);
    const ctors = ALL.map((t) => w.customElements.get(t));
    expect(() => w.eval(src['elements.iife.js']!)).not.toThrow();
    expect(() => w.OrgXElements.defineElements()).not.toThrow();
    expect(ALL.map((t) => w.customElements.get(t))).toEqual(ctors);
    // Split add-ons also run on top of the full bundle.
    expect(defined(load('elements.iife.js', ...SPLIT, 'elements.iife.js'))).toEqual(ALL);
  });

  it('an add-on without core fails with a clear message', () => {
    const w = new JSDOM('', { runScripts: 'outside-only' }).window as Win;
    expect(() => w.eval(src['elements-footer.iife.js']!)).toThrow(/load elements-core\.iife\.js .*before elements-footer\.iife\.js/);
    expect(w.customElements.get('ox-footer')).toBeUndefined();
  });

  it('add-ons share the core avatarConfig', () => {
    const w = load('elements-core.iife.js');
    w.OrgXElements.avatarConfig.baseUrl = 'https://cdn.test/a';
    w.eval(src['elements-avatar.iife.js']!);
    const el = w.document.createElement('ox-avatar');
    el.setAttribute('agent', 'eli');
    w.document.body.append(el);
    expect(el.shadowRoot!.querySelector('img')!.getAttribute('src')).toBe('https://cdn.test/a/eli-base-48.webp');
  });

  it('renders exactly like the full bundle', () => {
    const full = load('elements.iife.js');
    const split = load(...SPLIT);
    const cases: [string, Record<string, string>][] = [
      ['ox-state-chip', { state: 'held', seconds: '8', reserve: 'all' }],
      ['ox-attention-line', { tone: 'blocking', count: '2', blocks: '3', oldest: '5h' }],
      ['ox-receipt-row', { status: 'yours', label: 'Ship it?', value: '2d', href: 'https://x.test' }],
      ['ox-footer', { variant: 'queues-work', state: 'held', hold: '' }],
      ['ox-footer', { variant: 'reads', state: 'loading' }],
      ['ox-glyph', { kind: 'receipt', tone: 'amber', label: 'auto' }],
      ['ox-avatar', { agent: 'dana', form: 'asking', size: '96' }],
    ];
    for (const [tag, attrs] of cases) {
      const a = render(full, tag, attrs);
      expect(render(split, tag, attrs), tag).toEqual(a);
      // Abbreviated CSS is expanded before the browser sees it.
      expect(a.css, tag).toContain('var(--ox-');
      expect(a.css, tag).not.toMatch(/[~^|&?¦-¶¸-¿]/);
    }
  });
});

describe('CSS abbreviations', () => {
  it('leave CSS without abbreviation characters unchanged', () => {
    const css = ':host{display:block;color:var(--ox-text);content:"·"}';
    expect(unabbr(css)).toBe(css);
    expect(unabbr('^block;|~text)')).toBe('display:block;color:var(--ox-text)');
  });
});
