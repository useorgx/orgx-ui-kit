import { OxEl, avatarConfig, esc, slug } from './shared.js';

/** The seven agents and their domains. Hues live in tokens (--agent-<key>). */
export const AGENTS = {
  pace: 'Product',
  eli: 'Engineering',
  mark: 'Marketing',
  sage: 'Sales',
  orion: 'Operations',
  dana: 'Design',
  xandy: 'Orchestrator',
} as const;
export type AgentKey = keyof typeof AGENTS;
export const AGENT_KEYS = Object.keys(AGENTS) as AgentKey[];

/**
 * Other names an agent goes by in payloads: its domain, its `<domain>-agent`
 * id and the stem of its original headshot. Matched as whole slugs only, so
 * "Developer" or "Scope" never resolve to an agent.
 */
const ALIASES: Record<string, AgentKey> = {};
const STEMS = ['product_orchestrator', 'engineering_autopilot', 'launch_captain', 'pipeline_intelligence', 'control_tower', 'design_codex', 'xandy_orchestrator'];
AGENT_KEYS.forEach((k, i) => {
  const d = slug(AGENTS[k]);
  ALIASES[k] = ALIASES[d] = ALIASES[`${d}_agent`] = ALIASES[STEMS[i]!] = k;
});
ALIASES.ops = 'orion';

/** "Engineering-Agent", "eli", "launch_captain" -> the agent key; null for anyone else. */
export const resolveAgent = (v: string | null | undefined): AgentKey | null => ALIASES[slug(v)] ?? null;

/** Owners that are OrgX itself rather than a person or agent: they get the OrgX mark. */
const SYSTEM = new Set(['orgx', 'system', 'orgx_system', 'automation', 'auto', 'automatic']);

/** T6: one signal per form. Base is the resting face. Rendered forms are opt-in (variant="render"). */
export const AVATAR_FORMS = ['base', 'strategic', 'proactive', 'working', 'asking', 'verifying'] as const;
export type AvatarForm = (typeof AVATAR_FORMS)[number];
export const AVATAR_SIZES = [48, 96, 192] as const;
/** photo: the original headshots (default). render: the animated-set renders, one per form. */
export const AVATAR_VARIANTS = ['photo', 'render'] as const;
export type AvatarVariant = (typeof AVATAR_VARIANTS)[number];

/**
 * Where the images live. Photos are `<agent>-<size>.webp` under
 * avatarConfig.photoBaseUrl; renders are `<agent>-<form>-<size>.webp` under
 * avatarConfig.baseUrl. Set either once for the page, or base-url per element.
 */
export { avatarConfig };

export const avatarUrl = (baseUrl: string, agent: string, form: string, size: number | 'full'): string =>
  `${baseUrl.replace(/\/+$/, '')}/${agent}-${form}-${size}.webp`;
export const photoUrl = (baseUrl: string, agent: string, size: number): string => `${baseUrl.replace(/\/+$/, '')}/${agent}-${size}.webp`;

/** "Ada Lovelace" -> "AL", "eli" -> "E", "" -> "". */
export const initials = (name: string): string =>
  name
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** The OrgX mark: two crossed rounded bars in the homepage gradient. */
export const ORGX_MARK = `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="oxm" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#facc15"/><stop offset=".5" stop-color="#4ade80"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs><g fill="none" stroke="url(#oxm)" stroke-width="2.4"><rect x="2.6" y="8.4" width="18.8" height="7.2" rx="3.6" transform="rotate(45 12 12)"/><rect x="2.6" y="8.4" width="18.8" height="7.2" rx="3.6" transform="rotate(-45 12 12)"/></g></svg>`;

const CSS = `
:host{display:inline-block;vertical-align:middle;flex:none;line-height:0}
.a{position:relative;display:block;width:var(--z);height:var(--z);border-radius:50%;padding:var(--g);border:var(--r) solid var(--hue);background:var(--ox-panel-solid);overflow:hidden;transition:border-color .6s}
img,.f{width:100%;height:100%;border-radius:50%;display:block;background:rgba(var(--hue-rgb),.18)}
img{object-fit:cover}
.f{display:none;place-items:center;color:var(--ox-text);font:650 calc(var(--z)*var(--fs,.36))/1 var(--ox-font);letter-spacing:-.02em}
.f svg{width:64%;height:64%}
[data-failed] img,[data-kind=mark] img,[data-kind=initials] img{display:none}
[data-failed] .f,[data-kind=mark] .f,[data-kind=initials] .f{display:grid}
[data-kind=mark] .f{background:var(--ox-well-bg)}
`;

/**
 * <ox-avatar agent="eli" size="32">                 the original headshot (photo, the default)
 * <ox-avatar agent="eli" form="working" variant="render">  the animated-set render for a form
 * <ox-avatar agent="system">                        the OrgX mark (also: orgx, automation, or no owner)
 * <ox-avatar name="Ada Lovelace">                   initials for a person who is not an agent
 *
 * `agent` takes a key (eli), a domain (engineering), an id (engineering-agent)
 * or a headshot stem (engineering_autopilot). Known agents get their hue ring;
 * everyone else a neutral one. The wrapper reserves the whole footprint before
 * the image arrives, and if the image fails the initial takes its place, so
 * nothing shifts. `form` is kept on every variant (data-form) so the rendered
 * set can come back by switching avatarConfig.variant to "render".
 */
export class OxAvatar extends OxEl {
  static observedAttributes = 'agent form size base-url name variant'.split(' ');

  #a: HTMLElement;
  #img: HTMLImageElement;
  #f: HTMLElement;

  constructor() {
    super('<span class="a" part="avatar"><img decoding="async"><span class="f" role="img"></span></span>', CSS);
    this.#a = this._q('.a');
    this.#img = this._q('img');
    this.#f = this._q('.f');
    this.#img.onerror = () => {
      this.#a.setAttribute('data-failed', '');
      this.dispatchEvent(new Event('ox-avatar-fallback', { bubbles: true, composed: true }));
    };
    this.#img.onload = () => this.#a.removeAttribute('data-failed');
  }

  /** True once the image failed and the initial is showing. */
  get failed(): boolean {
    return this.#a.hasAttribute('data-failed');
  }

  /** "Eli" (photo), "Eli, working" (render), the person's name, or "OrgX". */
  get alt(): string {
    return this.#f.getAttribute('aria-label') ?? '';
  }

  /** The resolved agent key, or null for OrgX/system owners and people. */
  get agentKey(): AgentKey | null {
    return resolveAgent(this._a('agent')) ?? resolveAgent(this._a('name'));
  }

  protected _render() {
    const rawAgent = (this._a('agent') ?? '').trim();
    const key = this.agentKey;
    const rawName = (this._a('name') ?? '').trim();
    const isMark = !key && (SYSTEM.has(slug(rawAgent)) || SYSTEM.has(slug(rawName)) || (!rawAgent && !rawName));
    const name = rawName || (key ? key[0]!.toUpperCase() + key.slice(1) : isMark ? 'OrgX' : rawAgent);
    const f = slug(this._a('form'));
    const form = (AVATAR_FORMS as readonly string[]).includes(f) ? f : 'base';
    const variant: AvatarVariant = (this._a('variant') ?? avatarConfig.variant) == 'render' ? 'render' : 'photo';
    const size = Math.max(16, Math.round(+this._a('size')! || 48));
    const ring = size < 80 ? 2 : size < 160 ? 3 : 4;
    const hue = key ? `--agent-${key}` : '--ox-mute';
    const kind = key ? 'agent' : isMark ? 'mark' : 'initials';
    const letters = key ? key[0]!.toUpperCase() : initials(name) || '?';
    // The wrapper reserves the full footprint before the image arrives.
    this.#a.setAttribute(
      'style',
      `--z:${size}px;--r:${ring}px;--g:${ring < 3 ? 2 : 3}px;--hue:var(${key ? hue : '--ox-border-strong'});--hue-rgb:var(${hue}-rgb);--fs:${letters.length > 1 ? 0.32 : 0.38}`,
    );
    this.#a.dataset.kind = kind;
    this.dataset.agent = key ?? (isMark ? 'orgx' : '');
    this.dataset.form = form;
    this.dataset.variant = variant;
    const alt = key && variant == 'render' && form != 'base' ? `${name}, ${form}` : name;
    const img = this.#img;
    if (key) {
      const photo = variant == 'photo';
      const base = this._a('base-url') ?? (photo ? avatarConfig.photoBaseUrl : avatarConfig.baseUrl);
      // Smallest image at least as large as the display size, plus a 2x source.
      const asset = AVATAR_SIZES.find((s) => s >= size) ?? 192;
      const retina = AVATAR_SIZES.find((s) => s >= size * 2);
      const url = (s: number) => (photo ? photoUrl(base, key, s) : avatarUrl(base, key, form, s));
      const src = url(asset);
      if (img.getAttribute('src') != src) {
        this.#a.removeAttribute('data-failed');
        img.src = src;
      }
      if (retina && retina != asset) img.srcset = `${src} 1x, ${url(retina)} 2x`;
      else img.removeAttribute('srcset');
    } else {
      img.removeAttribute('src');
      img.removeAttribute('srcset');
    }
    img.width = img.height = size;
    img.alt = alt;
    this.#f.innerHTML = isMark ? ORGX_MARK : esc(letters);
    this.#f.setAttribute('aria-label', alt);
  }
}
