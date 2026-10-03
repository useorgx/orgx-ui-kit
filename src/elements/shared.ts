/**
 * Shared runtime for the framework-free OrgX elements.
 *
 * - No runtime dependencies. Every element styles itself only through the
 *   --ox-* custom properties from tokens.css, so one stylesheet themes light
 *   and dark.
 * - Constructable stylesheets are shared across instances; when the browser
 *   (or jsdom) has no adoptedStyleSheets, a <style> element is used instead.
 * - Safe to import during SSR: nothing touches the DOM until an element is
 *   constructed, and define() is a no-op without customElements.
 * - Written for size: the full IIFE must stay under 25 KB minified, and the
 *   split IIFEs (core + footer / glyph / avatar add-ons) share this module
 *   through window.OrgXElements._rt instead of each carrying a copy.
 */

/** HTMLElement in the browser; an inert class elsewhere so SSR imports do not throw. */
export const Base: typeof HTMLElement = typeof HTMLElement != 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement);

const sheets = new Map<string, CSSStyleSheet>();

/*
 * CSS abbreviations. The bundles inline into every MCP widget, so bytes count:
 * scripts/build-bundles.mjs minifies each element stylesheet and then writes
 * ABBR[i] for every ABBR_WORDS[i] (in order); adoptStyles expands them back
 * before the browser sees the CSS. No source stylesheet contains these
 * characters (the build fails if one does), so unbundled CSS (tsc output,
 * tests) passes through unchanged. Keep both lists in step; the add-on bundles
 * rely on the core bundle's copy, so change them only with a version bump.
 */
const ABBR = '~^|&?¦§¨©ª«¬®¯°±²³´µ¶¸¹º»¼½¾¿';
const ABBR_WORDS =
  'var(--ox-,display:,color:,width:,border,height:,-items:center,background,;overflow:hidden,white-space:nowrap,tion:,}[data-,text-muted),;text-overflow:ellipsis,-radius:,trans,tone,var(--,font-size:1,}@keyframes ox-,padding,line-,:host,;font-variant-numeric:ta,none,;vertical-align:middle;,currentColor,flex,px solid '.split(
    ',',
  );
export const unabbr = (css: string): string => css.replace(/[~^|&?¦-¿]/g, (c) => ABBR_WORDS[ABBR.indexOf(c)] ?? c);

/** Attach styles to a shadow root: shared constructable sheets, else a <style>. */
export function adoptStyles(root: ShadowRoot, ...css: string[]): void {
  css = css.map(unabbr);
  if (root.adoptedStyleSheets && 'replaceSync' in CSSStyleSheet.prototype) {
    try {
      root.adoptedStyleSheets = css.map((t) => {
        let s = sheets.get(t);
        if (!s) (sheets.set(t, (s = new CSSStyleSheet())), s.replaceSync(t));
        return s;
      });
      return;
    } catch {
      /* fall through to <style> */
    }
  }
  const style = document.createElement('style');
  style.textContent = css.join('');
  root.prepend(style);
}

/** Open a shadow root, adopt BASE_CSS plus the element's CSS, and stamp its markup. */
export function mount(host: HTMLElement, html: string, ...css: string[]): ShadowRoot {
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = html;
  adoptStyles(root, BASE_CSS, ...css);
  return root;
}

/**
 * Base for every element: a shadow root with BASE_CSS + the element's CSS and
 * markup, rendered on connect and whenever an observed attribute changes.
 */
export class OxEl extends Base {
  protected _r: ShadowRoot;
  constructor(html: string, css: string) {
    super();
    this._r = mount(this, html, css);
  }
  connectedCallback(): void {
    this._render();
  }
  attributeChangedCallback(_name?: string, was?: string | null, now?: string | null): void {
    if (this.isConnected && was !== now) this._render();
  }
  protected _q<T extends HTMLElement = HTMLElement>(sel: string): T {
    return this._r.querySelector<T>(sel)!;
  }
  /** getAttribute, short (it is called on every render of every element). */
  protected _a(name: string): string | null {
    return this.getAttribute(name);
  }
  protected _render(): void {}
}

/** Define once. Importing the bundle twice, or two copies of it, never throws. */
export function define(name: string, ctor: CustomElementConstructor): void {
  if (typeof customElements != 'undefined' && !customElements.get(name)) customElements.define(name, ctor);
}

/**
 * Where avatar renders live (see avatar.ts). It lives here so the core IIFE
 * exposes OrgXElements.avatarConfig even when the avatar add-on is not loaded,
 * and the add-on shares the same object.
 */
export const avatarConfig: {
  /** The animated-set renders, `<agent>-<form>-<size>.webp` (variant="render"). */
  baseUrl: string;
  /** The original headshots, `<agent>-<size>.webp` (variant="photo"). */
  photoBaseUrl: string;
  /** Which set every <ox-avatar> without a variant attribute shows. */
  variant: 'photo' | 'render';
} = {
  baseUrl: 'https://mcp.useorgx.com/widgets/shared/avatars',
  photoBaseUrl: 'https://mcp.useorgx.com/avatars/agents/photo',
  variant: 'photo',
};

/** The global the IIFE bundles share: window.OrgXElements. */
export interface OrgXElementsGlobal {
  ELEMENTS: Record<string, CustomElementConstructor>;
  avatarConfig: typeof avatarConfig;
  /** Define every element registered so far (idempotent). */
  defineElements(): void;
  /** The shared runtime (this module), for the add-on bundles. Internal. */
  _rt?: unknown;
}

/**
 * IIFE entries only: merge elements into window.OrgXElements and define them.
 * First copy wins everywhere (runtime, avatarConfig, constructors), so loading
 * a bundle twice, or the full bundle next to the split ones, is a no-op.
 */
export function install(els: Record<string, unknown>, rt?: unknown): OrgXElementsGlobal {
  const g = ((globalThis as { OrgXElements?: OrgXElementsGlobal }).OrgXElements ??= {} as OrgXElementsGlobal);
  const all = (g.ELEMENTS ??= {});
  g._rt ??= rt;
  g.avatarConfig ??= avatarConfig;
  g.defineElements ??= () => {
    for (const n in all) define(n, all[n]!);
  };
  for (const n in els) define(n, (all[n] ??= els[n] as CustomElementConstructor));
  return g;
}

/** Normalise free-form status strings: "Partly done" -> "partly_done". */
export const slug = (v: string | null | undefined): string =>
  (v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

export const emit = <T>(target: HTMLElement, type: string, detail: T, cancelable = false): boolean =>
  target.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true, cancelable }));

export const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Tone vocabulary shared by every element. amber = needs you, teal = moving or done. */
export type Tone = 'amber' | 'teal' | 'red' | 'mute' | 'ink';

/* ---------------------------------------------------------------- icons -- */
/* 16-unit icons from the canvas icon set (stroke = currentColor). */
const svg16 = (w: number, inner: string, sw = 1.7) =>
  `<svg width="${w}" height="${w}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ICON = {
  check: svg16(14, '<path d="M3 8.5l3.2 3L13 4.5"/>', 1.9),
  alert: svg16(16, '<path d="M8 1.8L15 14H1L8 1.8z"/><path d="M8 6.5v3.2M8 11.8v.1"/>'),
  clock: svg16(14, '<circle cx="8" cy="8" r="6.2"/><path d="M8 4.8V8l2.2 1.6"/>', 1.6),
  lock: svg16(14, '<rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>', 1.6),
  x: svg16(12, '<path d="M4 4l8 8M12 4l-8 8"/>', 1.9),
  ext: svg16(14, '<path d="M6 3H3.5A1.5 1.5 0 002 4.5v8A1.5 1.5 0 003.5 14h8a1.5 1.5 0 001.5-1.5V10"/><path d="M9 2h5v5M14 2L7.5 8.5"/>'),
  dot: '<i class="dot"></i>',
  spin: '<i class="spin"></i>',
};

/** The undo ring (SM3): a 22-unit track with an arc in currentColor. */
export const ring = (w: number, sw: number, dash: string): string =>
  `<svg class="ring" width="${w}" height="${w}" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="8.5" fill="none" stroke="var(--ox-ring-track)" stroke-width="${sw}"/><circle class="arc" cx="11" cy="11" r="8.5" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${dash}" transform="rotate(-90 11 11)"/></svg>`;

/**
 * A 24-unit G1 glyph (see glyph.ts). `--ox-glyph-size` sizes every glyph in a
 * container. Lives here because <ox-receipt-row> draws the question glyph
 * without the glyph add-on.
 */
export const svg24 = (inner: string, size = 18): string =>
  `<svg width="${size}" height="${size}" style="width:var(--ox-glyph-size,${size}px);height:var(--ox-glyph-size,${size}px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

/** Tinted field / solid mark attributes used by the G1 glyphs. */
export const FIELD = 'fill="currentColor" fill-opacity=".1" stroke="none"';
export const SOLID = 'fill="currentColor" stroke="none"';

/** The G1 question glyph (inner markup), shared by <ox-glyph> and <ox-receipt-row>. */
export const QUESTION = `<path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v6a3.5 3.5 0 0 1-3.5 3.5H11l-4.5 4v-4A3.5 3.5 0 0 1 4 12.5z" ${FIELD}/><path d="M9.6 8.2a2.5 2.5 0 0 1 4.8.8c0 1.6-2.4 1.9-2.4 3.2"/><circle cx="12" cy="14.6" r="1.1" ${SOLID}/>`;

/**
 * The G1 person glyph ("needs you"): a head and shoulders on a tinted body.
 * Shared by <ox-glyph kind="person"> and the receipt row's "your call" mark.
 */
export const PERSON = `<circle cx="12" cy="7.6" r="3.6" ${FIELD}/><circle cx="12" cy="7.6" r="3.6"/><path d="M4.8 20.2c.7-3.7 3.6-6 7.2-6s6.5 2.3 7.2 6z" fill="currentColor" fill-opacity=".1"/>`;

/* --------------------------------------------------------------- styles -- */
/** Base CSS adopted by every element: type, focus ring, tones, reduced motion. */
export const BASE_CSS = `
:host{box-sizing:border-box;font-family:var(--ox-font);color:var(--ox-text)}
:host([hidden]){display:none!important}
*,*::before,*::after{box-sizing:inherit}
svg{display:block;flex:none}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
button,a{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--ox-focus);outline-offset:2px}
.dot{width:7px;height:7px;border-radius:50%;background:currentColor;display:block}
.spin{width:16px;height:16px;border-radius:50%;border:2px solid var(--ox-ring-track);border-top-color:var(--ox-teal);animation:ox-rot .9s linear infinite}
@keyframes ox-rot{to{transform:rotate(360deg)}}
@keyframes ox-fade{from{opacity:0}}
[data-tone=amber]{--tone:var(--ox-warning);--tone-rgb:var(--ox-edge-amber-rgb)}
[data-tone=teal]{--tone:var(--ox-teal);--tone-rgb:var(--ox-edge-teal-rgb)}
[data-tone=red]{--tone:var(--ox-danger);--tone-rgb:var(--ox-edge-red-rgb)}
[data-tone=mute]{--tone:var(--ox-text-muted);--tone-rgb:var(--ox-edge-mute-rgb)}
[data-tone=ink]{--tone:var(--ox-text-2);--tone-rgb:var(--ox-edge-mute-rgb)}
@media (prefers-reduced-motion:reduce){
*:not(.fill),*::before,*::after{animation-duration:0s!important;animation-iteration-count:1!important;transition-duration:0s!important}
.spin{border-right-color:var(--ox-teal)}
}
`;
