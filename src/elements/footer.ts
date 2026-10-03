import { FOOTER_FRAMES, resolveFooter, type FooterFrame, type FooterVariant } from './frames.js';
import { ICON, OxEl, emit, esc, ring, slug } from './shared.js';

/** Footer icon -> ICON key (the ring is drawn here; skel has none). */
const ICON_OF: Partial<Record<FooterFrame['icon'], keyof typeof ICON>> = { seal: 'check', app: 'lock', part: 'alert' };
const icon = (k: FooterFrame['icon']): string =>
  k == 'ring' ? ring(22, 3, '53.4') : k == 'skel' ? '' : ICON[ICON_OF[k] ?? (k as keyof typeof ICON)];

const CSS = `
:host{display:block;min-width:0}
.f{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;min-height:64px;padding:10px 14px 10px 18px;border-top:1px solid var(--ox-border)}
:host([flush]) .f{border-top:0}
.i{width:22px;height:22px;display:grid;place-items:center;flex:none;color:var(--ox-text-muted)}
[data-k=seal],[data-k=check]{color:var(--ox-teal)}
[data-k=alert]{color:var(--ox-danger)}
[data-k=lock],[data-k=part]{color:var(--ox-warning)}
[data-k=ring]{color:rgb(var(--ox-edge-amber-rgb))}
[data-k=skel]{display:none}
.i .spin{width:18px;height:18px}
.arc{animation:ox-drain var(--u) linear var(--ud) forwards}
@keyframes ox-drain{to{stroke-dashoffset:53.4}}
.t{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 0;font-size:13.5px;line-height:1.25}
.s .t{flex-basis:100%}
.n{animation:ox-fade .12s}
.h{font-weight:600}
[data-tone=red] .h{color:var(--ox-danger)}
.d{font-size:12.5px;color:var(--ox-text-muted);font-variant-numeric:tabular-nums}
.h,.d{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}
.h:empty,.d:empty{display:none}
.k{display:block;height:8px;width:110px;border-radius:4px;background:var(--ox-skeleton)}
.d .k{width:70px;margin-top:4px}
.a,.g{display:grid;justify-items:end;align-items:center}
.a{flex:none;max-width:100%;margin-left:auto}
.a>*,.g>*{grid-area:1/1}
.g{visibility:hidden}
.v{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px 6px}
.b{position:relative;min-height:36px;border-radius:9px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:650;border:1px solid transparent;background:none;color:var(--ox-text-2);white-space:nowrap;cursor:pointer;transition:background .16s}
.b::after{content:"";position:absolute;inset:-4px -2px}
.b[hidden]{display:none}
.b svg{width:12px}
.x:hover{color:var(--ox-text);background:var(--ox-hover)}
.p{background:var(--ox-action);color:var(--ox-action-fg);border-color:var(--ox-action-border);box-shadow:inset 0 1px #fff4}
[aria-disabled=true]{cursor:default;opacity:.55}
.busy{opacity:.85!important}
.c{position:absolute;inset:0;border-radius:inherit;overflow:hidden}
.fill{position:absolute;inset:0;background:var(--ox-action-hold);transform-origin:left;transform:scaleX(0);transition:transform .16s}
.holding .fill{transform:none;transition:transform var(--hold) linear}
.busy .c::after{content:"";position:absolute;bottom:0;height:2px;width:40%;background:currentColor;opacity:.55;animation:ox-sweep 1s linear infinite}
@keyframes ox-sweep{from{transform:translate(-100%)}to{transform:translate(260%)}}
.l{position:relative;display:inline-flex;align-items:center;gap:6px}
.hold{touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
@media (max-width:420px){.f{gap:8px;padding:10px 12px}.b{padding:0 8px;gap:4px;font-size:12px}}
@media (prefers-reduced-motion:reduce){.ring{display:none}[data-k=ring]::before{content:"";width:9px;height:9px;border-radius:50%;background:currentColor}.holding .fill{transition-timing-function:steps(4)}.busy .c::after{display:none}}
`;

const btn = (text: string, ext?: unknown) => `<span>${esc(text)}</span>${ext ? ICON.ext : ''}`;
const clean = (t: string) => t.replace(/\s*↗$/, '');

/**
 * <ox-footer variant="finishes-here" state="needs-you" primary-label="Approve">
 *
 * SM3: four footers cover every widget. The same 64 px row in every state:
 * status icon, two lines of text (what happened · what it means), at most one
 * text action and one primary. The action area reserves the width of every
 * label it shows, so the row never reflows as the state moves. The heading
 * and detail wrap to two lines beside the actions; when either would need
 * more (phones), the text takes the row and the actions move below it,
 * right-aligned, wrapping again if they still don't fit. Actions are never
 * clipped. The primary is
 * the action lime (--ox-action, --ox-action-fg) in every widget; the needs-you
 * amber stays on the status icon and the card edge.
 *
 * Variants and states
 *   finishes-here     needs-you · sending · held · running · done · failed
 *   confirms-in-orgx  needs-you · saving · draft · waiting · confirmed · rejected
 *   queues-work       needs-you · held · queued · running · partial · done
 *   reads             loading · fresh · stale · refreshing · failed · caught-up
 *
 * Attributes: heading, detail ("{s}" = undo seconds left), primary-label,
 * action-label (a trailing ↗ marks a link to OrgX), hold (primary is
 * hold-to-confirm; for launches only, approvals are one click), hold-ms (default 1000), undo-seconds (default 10),
 * undo-deadline (epoch ms; survives reloads), disabled (view only / offline:
 * controls stay, read-only), flush (no top rule).
 * Slots: "primary" and "action" replace the built-in buttons.
 * Events (bubbling, composed): ox-primary, ox-confirm (hold completed),
 * ox-action, ox-undo, ox-undo-expired.
 */
export class OxFooter extends OxEl {
  static observedAttributes = 'variant state heading detail primary-label action-label hold hold-ms undo-seconds undo-deadline disabled'.split(' ');

  #seen = new Set<string>();
  #ghost = '';
  #key = '';
  #locked = false;
  #state = '';
  #variant = '';
  #detail = '';
  #primary = '';
  #deadline = 0;
  #tick?: ReturnType<typeof setInterval>;
  #expired = false;
  #restart = false;
  #hold?: ReturnType<typeof setTimeout>;
  #holdKey = '';
  #p: HTMLButtonElement;
  #x: HTMLButtonElement;

  constructor() {
    super(
      '<div class="f" part="footer"><span class="i" aria-hidden="true"></span>' +
        '<div class="t" aria-live="polite"><b class="h" part="heading"></b><span class="d" part="detail"></span><span class="sr"></span></div>' +
        '<div class="a"><span class="g" aria-hidden="true"></span><span class="v">' +
        '<slot name="action"><button type="button" class="b x" part="action"></button></slot>' +
        '<slot name="primary"><button type="button" class="b p" part="primary"><span class="c"><span class="fill" part="fill"></span></span><span class="l"></span><span class="sr" id="hh"></span></button></slot>' +
        '</span></div></div>',
      CSS,
    );
    const p = (this.#p = this._q('.p'));
    this.#x = this._q('.x');
    this.#x.onclick = () => this.#onAction();
    // Hold to confirm: pointer or Space/Enter held for hold-ms. A click is never enough.
    const isHold = () => p.classList.contains('hold');
    const end = () => this.#endHold();
    p.onclick = (e) => (isHold() ? e.preventDefault() : this.#fire(false));
    p.onpointerdown = (e) => {
      if (!isHold() || e.button) return;
      try {
        p.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic pointer */
      }
      this.#startHold();
    };
    p.onpointerup = p.onpointercancel = p.onblur = end;
    p.addEventListener('lostpointercapture', end);
    p.oncontextmenu = (e) => isHold() && e.preventDefault();
    p.onkeydown = (e) => {
      if (!isHold() || (e.key != ' ' && e.key != 'Enter')) return;
      e.preventDefault();
      if (!e.repeat) ((this.#holdKey = e.key), this.#startHold());
    };
    p.onkeyup = (e) => {
      if (isHold() && e.key == this.#holdKey) (e.preventDefault(), end());
    };
    if (typeof ResizeObserver != 'undefined') new ResizeObserver(() => this.#fit()).observe(this);
  }

  /** Side by side while heading and detail fit in two lines each; else stack (class "s"). */
  #fit() {
    const f = this._q('.f');
    const over = (s: string) => {
      const e = this._q(s);
      return e.scrollHeight > e.clientHeight + 1;
    };
    f.classList.remove('s');
    const w = this._q('.t').clientWidth;
    // w is 0 before layout (hidden, or no layout engine): decide on the next resize.
    if (w && (w < 64 || over('.h') || over('.d'))) f.classList.add('s');
  }

  disconnectedCallback() {
    this.#stopUndo();
    this.#endHold();
  }

  attributeChangedCallback(name: string, was: string | null, now: string | null) {
    if (name == 'state') this.#locked = false;
    if (name.startsWith('undo')) this.#restart = true;
    super.attributeChangedCallback(name, was, now);
  }

  /** The resolved state; setting it sets the attribute (React 19 assigns properties). */
  get state(): string {
    return this.#state;
  }
  set state(v: string) {
    this.setAttribute('state', v);
  }
  /** Whole seconds left in the undo window (0 outside the held state). */
  get undoRemaining(): number {
    return this.#deadline ? Math.max(0, Math.ceil((this.#deadline - Date.now()) / 1e3)) : 0;
  }

  protected _render() {
    const { variant, state, frame } = resolveFooter(this._a('variant'), this._a('state'));
    const was = this.#state;
    const focused = this.matches(':focus-within');
    const pick = (attr: string, k: 'heading' | 'detail' | 'primary' | 'action') =>
      k == 'heading' || k == 'detail' || frame[k] != null ? (this._a(attr) ?? frame[k] ?? '') : '';
    const key = variant + state;
    const changed = key != this.#key;
    const off = this.hasAttribute('disabled');
    const p = this.#p;
    const t = this._q('.t');
    const skel = frame.icon == 'skel';
    const action = pick('action-label', 'action');
    this.#variant = variant;
    this.#state = state;
    this.#detail = pick('detail', 'detail');
    this.#primary = pick('primary-label', 'primary');
    this._q('.f').dataset.tone = this.dataset.tone = frame.tone;
    this.dataset.state = state;
    this.dataset.variant = variant;

    if (changed) {
      const i = this._q('.i');
      i.dataset.k = frame.icon;
      i.innerHTML = icon(frame.icon);
      // SM0: footer content crossfades in place (120 ms).
      if (this.#key) (t.classList.remove('n'), t.offsetWidth, t.classList.add('n'));
    }
    this.#key = key;

    this._q('.h').innerHTML = skel ? '<i class="k"></i>' : esc(pick('heading', 'heading'));
    t.toggleAttribute('aria-busy', skel);
    this.#set(this.#x, action, frame.ext && frame.action);
    this.#set(p, this.#primary, frame.ext && frame.primary);
    p.classList.toggle('busy', !!frame.busy);
    p.setAttribute('aria-disabled', String(!!frame.busy || off || this.#locked));
    this.#x.setAttribute('aria-disabled', String(off || this.#expired));

    const hold = this.hasAttribute('hold') && !!this.#primary && !frame.busy;
    const ms = +this._a('hold-ms')! || 1e3;
    p.classList.toggle('hold', hold);
    p.style.setProperty('--hold', ms + 'ms');
    // The button's name stays its label; the hold instruction is its description.
    p.lastElementChild!.textContent = hold ? `Press and hold ${ms / 1e3} s to confirm` : '';
    p.toggleAttribute('aria-describedby', hold);
    if (hold) p.setAttribute('aria-describedby', 'hh');
    if (!hold) this.#endHold();

    // Ghost copies of every label this footer can show hold the action area's width.
    const add = (k: string, l?: string, e?: unknown) => l && this.#seen.add(`${k}|${e || /↗$/.test(l) ? 1 : ''}|${clean(l)}`);
    for (const f of Object.values(FOOTER_FRAMES[variant])) (add('p', f.primary, f.ext), add('x', f.action, f.ext));
    add('p', this.#primary, frame.ext);
    add('x', action, frame.ext);
    if (hold) add('p', 'Holding…');
    const ghost = [...this.#seen]
      .map((s) => {
        const [k, e, l] = s.split('|');
        return `<span class="b ${k}"><span class="l">${btn(l!, e)}</span></span>`;
      })
      .join('');
    if (this.#ghost != ghost) this._q('.g').innerHTML = this.#ghost = ghost;

    if (state != 'held') this.#stopUndo();
    else if (was != 'held' || changed || this.#restart) this.#startUndo();
    if (skel) this._q('.d').innerHTML = '<i class="k"></i>';
    else this.#renderDetail();
    if (this.isConnected) this.#fit();

    // SM5: when the state moves under focus (e.g. to Failed), focus moves to the new control.
    if (changed && focused) (p.hidden ? this.#x : p).focus();
  }

  #set(b: HTMLButtonElement, text: string, ext?: unknown) {
    b.hidden = !text;
    const c = clean(text);
    ext = ext || c != text;
    (b == this.#p ? b.querySelector('.l')! : b).innerHTML = btn(b.classList.contains('holding') ? 'Holding…' : c, ext);
    b.setAttribute('aria-label', ext ? c + ', opens OrgX' : c);
  }

  #renderDetail() {
    this._q('.d').textContent = this.#detail.replace(/\{s\}/g, '' + this.undoRemaining);
  }

  /* ------------------------------------------------------ undo window -- */
  #startUndo() {
    this.#stopUndo();
    this.#restart = false;
    const secs = +this._a('undo-seconds')! || 10;
    const now = Date.now();
    const dl = (this.#deadline = +this._a('undo-deadline')! || now + secs * 1e3);
    const left = Math.max(0, dl - now);
    const total = Math.max(secs * 1e3, left);
    const ring = this._q('.ring');
    ring.style.setProperty('--u', total + 'ms');
    ring.style.setProperty('--ud', left - total + 'ms');
    // The ticking seconds are visual only; the window is announced once.
    this._q('.d').setAttribute('aria-hidden', 'true');
    this._q('.t .sr').textContent = `Undo available for ${this.undoRemaining} seconds`;
    this.#tick = setInterval(() => {
      this.#renderDetail();
      if (Date.now() >= dl) this.#expire();
    }, 250);
    if (!left) this.#expire();
  }

  #expire() {
    if (this.#expired) return;
    this.#expired = true;
    clearInterval(this.#tick);
    this.#x.setAttribute('aria-disabled', 'true');
    emit(this, 'ox-undo-expired', { variant: this.#variant, state: this.#state });
  }

  #stopUndo() {
    clearInterval(this.#tick);
    this.#deadline = 0;
    this.#expired = false;
    this._q('.d').removeAttribute('aria-hidden');
    this._q('.t .sr').textContent = '';
  }

  /* ---------------------------------------------------------- actions -- */
  #onAction() {
    if (this.#x.getAttribute('aria-disabled') == 'true') return;
    const undo = this.#state == 'held';
    const d = {
      variant: this.#variant,
      state: this.#state,
      action: undo ? 'undo' : slug(this.#x.getAttribute('aria-label')!.replace(/, opens OrgX$/, '')),
    };
    emit(this, 'ox-action', d);
    if (undo) (this.#stopUndo(), emit(this, 'ox-undo', d));
  }

  #fire(held: boolean) {
    const p = this.#p;
    if (p.getAttribute('aria-disabled') == 'true') return;
    // Lock in the same frame as the press; the next state change unlocks.
    this.#locked = true;
    p.setAttribute('aria-disabled', 'true');
    const d = { variant: this.#variant, state: this.#state, held };
    if (held) emit(this, 'ox-confirm', d);
    emit(this, 'ox-primary', d);
  }

  #startHold() {
    const p = this.#p;
    if (this.#hold || p.getAttribute('aria-disabled') == 'true') return;
    p.classList.add('holding');
    p.setAttribute('aria-pressed', 'true');
    p.querySelector('.l span')!.textContent = 'Holding…';
    this.#hold = setTimeout(() => (this.#endHold(), this.#fire(true)), +this._a('hold-ms')! || 1e3);
  }

  #endHold() {
    const p = this.#p;
    clearTimeout(this.#hold);
    this.#hold = undefined;
    if (!p.classList.contains('holding')) return;
    p.classList.remove('holding');
    p.removeAttribute('aria-pressed');
    p.querySelector('.l span')!.textContent = clean(this.#primary);
  }
}

export type { FooterVariant };
