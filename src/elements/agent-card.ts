import { AGENTS, resolveAgent } from './avatar.js';
import { ICON, OxEl, emit, esc } from './shared.js';

const CSS = `
:host{display:inline-flex;vertical-align:middle;max-width:100%;min-width:0}
.t{position:relative;display:inline-flex;align-items:center;gap:8px;max-width:100%;min-width:0;margin:0;padding:0;border:0;border-radius:999px;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.t::after{content:"";position:absolute;left:50%;top:50%;width:max(100%,44px);height:max(100%,44px);transform:translate(-50%,-50%)}
.t ox-avatar{transition:filter .16s}
.t:hover ox-avatar,.t[aria-expanded=true] ox-avatar{filter:brightness(1.08)}
::slotted(*){min-width:0}
.p{position:fixed;inset:auto;margin:0;box-sizing:border-box;width:min(288px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;padding:14px 14px 6px;border-radius:14px;border:1px solid var(--ox-border-strong);background:var(--ox-panel-solid);color:var(--ox-text);box-shadow:0 18px 40px -16px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.12);z-index:2147483000;text-align:left;font:400 13px/1.45 var(--ox-font);animation:ox-pop .16s var(--ox-ease-out,ease-out)}
.p[hidden]{display:none}
@keyframes ox-pop{from{opacity:0;transform:translateY(var(--dy,4px))}}
.h{display:flex;align-items:center;gap:10px;min-width:0}
.id{display:grid;gap:1px;min-width:0}
.n{font-size:14px;font-weight:650;letter-spacing:-.01em;overflow-wrap:anywhere}
.r{font-size:12.5px;color:var(--ox-text-muted)}
.s{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin-top:12px;font-size:12px;color:var(--ox-text-muted)}
.k{margin-top:12px;display:grid;gap:2px}
.l{font-size:12px;color:var(--ox-text-muted)}
.v{font-size:13px;line-height:1.4;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.o{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;margin-top:10px;border-top:1px solid var(--ox-border);font-size:13px;font-weight:600;color:var(--ox-text);text-decoration:none}
.o:hover{color:var(--ox-primary)}
.o svg{color:var(--ox-text-muted)}
`;

const ATTRS = 'agent name role state status-label detail task href size form variant base-url'.split(' ');

/**
 * <ox-agent-card agent="eli" name="Eli" state="running" task="Run the conformance checks"
 *   href="https://useorgx.com/command/agents/eli" size="24">Eli</ox-agent-card>
 *
 * An avatar that reveals who the agent is. The trigger is a button holding an
 * <ox-avatar> (agent, name, size, form, variant and base-url pass through) and
 * any slotted label; the card shows the name, role or domain (`role`, else the
 * agent's domain), the current state as an <ox-state-chip> (`state`, with
 * `status-label` to override its wording and `detail` beside it), the current
 * `task`, and an "Open in OrgX" link (`href`).
 *
 * Opens on hover (after a short delay), on keyboard focus and on tap or click;
 * Esc, a click outside, or focus leaving closes it, and Esc returns focus to
 * the trigger. The card renders in the top layer (popover) where the browser
 * has it, placed below the trigger or flipped above, and shifted sideways to
 * stay inside the viewport (the widget iframe). Its link dispatches a
 * cancelable `ox-open` event first, so widgets route it through the host.
 */
export class OxAgentCard extends OxEl {
  static observedAttributes = ATTRS;

  #b: HTMLButtonElement;
  #p: HTMLElement;
  #open = false;
  #pinned = false;
  #press = false;
  #timer = 0;
  #off: (() => void) | null = null;

  constructor() {
    super(
      '<button type="button" class="t" part="trigger" aria-expanded="false" aria-haspopup="dialog" aria-controls="p"><ox-avatar></ox-avatar><slot></slot></button>' +
        '<div class="p" id="p" part="card" role="dialog" aria-labelledby="n" hidden></div>',
      CSS,
    );
    this.#b = this._q('button');
    this.#p = this._q('.p');
    if ('popover' in this.#p) this.#p.setAttribute('popover', 'manual');
    const b = this.#b;
    b.addEventListener('click', () => {
      if (this.#open && this.#pinned) return this.hide();
      this.#pinned = true;
      this.show();
    });
    // Keyboard focus opens the card; focus from a press (mouse or touch) leaves it to the click.
    b.addEventListener('pointerdown', () => (this.#press = true));
    b.addEventListener('focus', () => {
      if (!this.#press) this.show();
      this.#press = false;
    });
    this.addEventListener('pointerenter', (e) => {
      if (e.pointerType != 'mouse') return;
      this.#defer(() => this.show(), this.#open ? 0 : 140);
    });
    this.addEventListener('pointerleave', (e) => {
      if (e.pointerType == 'mouse' && !this.#pinned) this.#defer(() => this.hide(), 180);
    });
    this.addEventListener('focusout', (e) => {
      const to = e.relatedTarget as Node | null;
      if (!to || !(this.contains(to) || this._r.contains(to))) this.hide();
    });
    this.#p.addEventListener('click', (e) => {
      const a = (e.target as Element).closest?.('a');
      if (a && !emit(this, 'ox-open', { href: a.getAttribute('href') }, true)) e.preventDefault();
    });
  }

  /** True while the card is showing. */
  get expanded(): boolean {
    return this.#open;
  }

  #defer(fn: () => void, ms: number) {
    clearTimeout(this.#timer);
    this.#timer = ms ? (setTimeout(fn, ms) as unknown as number) : (fn(), 0);
  }

  /** Open the card (no-op when open). */
  show(): void {
    clearTimeout(this.#timer);
    if (this.#open || !this.isConnected) return;
    this.#open = true;
    this.#fill();
    const p = this.#p;
    p.hidden = false;
    try {
      (p as HTMLElement & { showPopover?: () => void }).showPopover?.();
    } catch {
      /* not supported or detached: the fixed fallback still shows */
    }
    this.#b.setAttribute('aria-expanded', 'true');
    this.#place();
    const doc = this.ownerDocument;
    const win = doc.defaultView!;
    const outside = (e: Event) => {
      if (!e.composedPath().includes(this)) this.hide();
    };
    const keys = (e: KeyboardEvent) => {
      if (e.key != 'Escape') return;
      e.stopPropagation();
      this.hide(true);
    };
    const place = () => this.#place();
    doc.addEventListener('pointerdown', outside, true);
    doc.addEventListener('keydown', keys, true);
    win.addEventListener('resize', place);
    win.addEventListener('scroll', place, true);
    this.#off = () => {
      doc.removeEventListener('pointerdown', outside, true);
      doc.removeEventListener('keydown', keys, true);
      win.removeEventListener('resize', place);
      win.removeEventListener('scroll', place, true);
    };
    emit(this, 'ox-agent-card-toggle', { open: true });
  }

  /** Close the card; `refocus` returns focus to the trigger (Esc). */
  hide(refocus = false): void {
    clearTimeout(this.#timer);
    if (!this.#open) return;
    this.#open = this.#pinned = false;
    this.#off?.();
    this.#off = null;
    try {
      (this.#p as HTMLElement & { hidePopover?: () => void }).hidePopover?.();
    } catch {
      /* already hidden */
    }
    this.#p.hidden = true;
    this.#b.setAttribute('aria-expanded', 'false');
    if (refocus) {
      // Returning focus must not reopen the card through the focus handler.
      this.#press = true;
      this.#b.focus();
      this.#press = false;
    }
    emit(this, 'ox-agent-card-toggle', { open: false });
  }

  disconnectedCallback(): void {
    this.hide();
  }

  /** Below the trigger, or above when that has more room; shifted to stay inside the viewport. */
  #place() {
    const p = this.#p;
    const doc = this.ownerDocument.documentElement;
    const vw = doc.clientWidth || innerWidth;
    const vh = doc.clientHeight || innerHeight;
    const r = this.#b.getBoundingClientRect();
    const m = 8;
    const gap = 8;
    p.style.maxHeight = '';
    const w = p.offsetWidth;
    const h = p.offsetHeight;
    const below = vh - r.bottom - gap - m;
    const above = r.top - gap - m;
    const up = h > below && above > below;
    const room = up ? above : below;
    if (h > room) p.style.maxHeight = `${Math.max(120, room)}px`;
    const ph = Math.min(h, Math.max(120, room));
    const top = up ? r.top - gap - ph : r.bottom + gap;
    const left = Math.min(Math.max(m, r.left + r.width / 2 - w / 2), Math.max(m, vw - m - w));
    p.style.top = `${Math.round(Math.max(m, Math.min(top, vh - m - ph)))}px`;
    p.style.left = `${Math.round(left)}px`;
    p.dataset.side = up ? 'top' : 'bottom';
    p.style.setProperty('--dy', up ? '-4px' : '4px');
  }

  #fill() {
    const a = (n: string) => (this._a(n) ?? '').trim();
    const key = resolveAgent(a('agent')) ?? resolveAgent(a('name'));
    const name = a('name') || (key ? key[0]!.toUpperCase() + key.slice(1) : 'OrgX');
    const role = a('role') || (key ? AGENTS[key] : '');
    const state = a('state');
    const detail = a('detail');
    const task = a('task');
    const href = a('href');
    const safe = /^(https?:|[/?#])/i.test(href);
    const label = a('status-label');
    this.#p.innerHTML =
      `<div class="h"><ox-avatar agent="${esc(a('agent'))}" name="${esc(name)}" size="header"${a('variant') ? ` variant="${esc(a('variant'))}"` : ''}${a('base-url') ? ` base-url="${esc(a('base-url'))}"` : ''}></ox-avatar>` +
      `<div class="id"><span class="n" id="n">${esc(name)}</span>${role ? `<span class="r">${esc(role)}</span>` : ''}</div></div>` +
      (state || detail
        ? `<div class="s">${state ? `<ox-state-chip state="${esc(state)}"${label ? ` label="${esc(label)}"` : ''}></ox-state-chip>` : ''}${detail ? `<span>${esc(detail)}</span>` : ''}</div>`
        : '') +
      (task ? `<div class="k"><span class="l">Current task</span><span class="v">${esc(task)}</span></div>` : '') +
      (href && safe ? `<a class="o" part="link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">Open in OrgX${ICON.ext}</a>` : '<div style="height:8px"></div>');
  }

  protected _render() {
    const av = this._q('ox-avatar');
    for (const n of ['agent', 'name', 'size', 'form', 'variant', 'base-url']) {
      const v = this._a(n);
      if (v == null) av.removeAttribute(n);
      else if (av.getAttribute(n) != v) av.setAttribute(n, v);
    }
    // Default: legible beside text (the inline preset, 28 px).
    if (!this._a('size')) av.setAttribute('size', 'inline');
    const name = (this._a('name') ?? '').trim() || (resolveAgent(this._a('agent')) ?? '');
    const who = name ? name[0]!.toUpperCase() + name.slice(1) : 'OrgX';
    this.#b.setAttribute('aria-label', `${who}: show details`);
    if (this.#open) this.#fill();
  }
}
