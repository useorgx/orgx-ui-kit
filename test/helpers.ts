import '../src/elements/index.js';

export function mount<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  html = '',
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (html) el.innerHTML = html;
  document.body.append(el);
  return el;
}

export const shadow = (el: Element) => el.shadowRoot!;
export const $ = <T extends Element = HTMLElement>(el: Element, sel: string) => el.shadowRoot!.querySelector<T>(sel)!;
export const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

export function pointer(target: Element, type: string) {
  const Ctor = (globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
  target.dispatchEvent(new Ctor(type, { bubbles: true, composed: true, button: 0 }));
}

export function key(target: Element, type: 'keydown' | 'keyup', k: string, repeat = false) {
  target.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, composed: true, cancelable: true, repeat }));
}
