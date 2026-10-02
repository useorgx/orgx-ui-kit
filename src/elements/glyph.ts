import { FIELD, OxEl, QUESTION, SOLID, svg24 } from './shared.js';

/*
 * G1 "One shape per kind of work": 24-point grid, 1.8 stroke, round caps.
 * A tinted field says what kind of thing it is; one solid mark is the unit.
 * Muted by default, amber when it needs you, teal when accepted.
 * Inner SVG copied from the canvas glyph set (LiveWidgetIcons grammar);
 * `~` stands for the tinted-field fill and `@` for a solid mark, expanded below.
 * A shape that is both a field and an outline is one element with fill and
 * stroke (the canvas drew it twice).
 */
const SRC = {
  goal: '<circle cx="12" cy="12" r="9.5" ~/><path d="M4.6 18.2 6.9 14.6h10.3l1.9 3.6z" fill="currentColor" fill-opacity=".55" stroke="none"/><path d="M3.8 18.2 10 8.6l2.5 3.5 2.3-2.9 5.4 9"/><path d="M3.8 18.2h16.4"/>',
  initiative: '<circle cx="12" cy="12" r="9" ~/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" @/>',
  workstream:
    '<rect x="2" y="2" width="20" height="20" rx="6" ~/><path d="M6 6c3 0 5 6 8 6"/><path d="M6 18c3 0 5-6 8-6"/><path d="M6 12h12"/><path d="m14 8 4 4-4 4"/><circle cx="6" cy="6" r="1.5" @/><circle cx="6" cy="12" r="1.5" @/><circle cx="6" cy="18" r="1.5" @/>',
  milestone: '<path d="M5 3v18"/><path d="m5 4 12 1-2 4 2 4-12-1z" fill="currentColor" fill-opacity=".1"/>',
  task: '<rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" fill-opacity=".12" stroke="none"/><path d="M9 12.2 11 14.2 15.2 10"/>',
  run: '<circle cx="12" cy="12" r="9" ~/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor"/>',
  decision:
    '<path d="M12 2.8 21.2 12 12 21.2 2.8 12z" ~/><path d="M12 17.5v-5"/><path d="M12 12.5 8.5 8.2"/><path d="M12 12.5l3.5-4.3"/><circle cx="8.5" cy="8.2" r="1.4" @/><circle cx="15.5" cy="8.2" r="1.4" @/>',
  question: QUESTION,
  artifact: '<path d="M6 3h8l4 4v14H6z" fill="currentColor" fill-opacity=".1"/><path d="M14 3v4h4"/><path d="M9 12h6M9 15.5h4"/>',
  receipt:
    '<path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" fill="currentColor" fill-opacity=".1"/><path d="M9 10.6 11 12.6 15 8.6"/><path d="M9 16h6"/>',
};

export type GlyphKind = keyof typeof SRC;
export const GLYPH_KINDS = Object.keys(SRC) as GlyphKind[];

/** Inner SVG markup per kind (24 x 24 viewBox). */
export const GLYPHS = Object.fromEntries(
  GLYPH_KINDS.map((k) => [k, SRC[k].replace(/~/g, FIELD).replace(/@/g, SOLID)]),
) as Record<GlyphKind, string>;

export const glyphSvg = (kind: string, size = 18): string => svg24(GLYPHS[kind as GlyphKind] ?? GLYPHS.task, size);

const CSS = `
:host{display:inline-grid;place-items:center;vertical-align:middle;flex:none;color:var(--ox-text-muted);line-height:0}
:host([tone=amber]){color:var(--ox-warning)}
:host([tone=teal]){color:var(--ox-teal)}
:host([tone=red]){color:var(--ox-danger)}
:host([tone=text]){color:var(--ox-text-2)}
:host([tone=current]){color:inherit}
span{display:contents}
`;

/**
 * <ox-glyph kind="decision" tone="amber" size="18" label="Decision">
 *
 * kind: goal | initiative | workstream | milestone | task | run | decision |
 * question | artifact | receipt. tone: muted (default) | amber |
 * teal | red | text | current. Decorative unless `label` is set
 * (label="auto" reads the kind name). --ox-glyph-size sizes every glyph in a
 * container at once.
 */
export class OxGlyph extends OxEl {
  static observedAttributes = 'kind size label'.split(' ');

  constructor() {
    super('<span></span>', CSS);
  }

  protected _render() {
    const raw = (this._a('kind') ?? '').toLowerCase();
    const kind = raw in SRC ? raw : 'task';
    this._q('span').innerHTML = glyphSvg(kind, +this._a('size')! || 18);
    this.dataset.kind = kind;
    const label = this._a('label')?.trim();
    if (label) {
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', label == 'auto' ? kind[0]!.toUpperCase() + kind.slice(1) : label);
      this.removeAttribute('aria-hidden');
    } else {
      this.removeAttribute('role');
      this.removeAttribute('aria-label');
      this.setAttribute('aria-hidden', 'true');
    }
  }
}
