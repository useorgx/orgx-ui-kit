import { act, createElement, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OxAttentionLine, OxAvatar, OxFooter, OxGlyph, OxReceiptRow, OxStateChip } from '../src/react/index.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
function render(node: Parameters<ReturnType<typeof createRoot>['render']>[0]) {
  host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return root;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('React wrappers', () => {
  it('render the custom elements with kebab-case attributes', () => {
    render(
      createElement(
        'div',
        null,
        createElement(OxStateChip, { state: 'partially_succeeded', detail: '2 of 3' }),
        createElement(OxAttentionLine, { tone: 'blocking', count: 2, blocks: 3, meta: 'Acme · synced 14:02' }),
        createElement(OxReceiptRow, { status: 'met', label: 'CI run 1182 · passed', value: '2d ago' }),
        createElement(OxGlyph, { kind: 'decision', tone: 'amber', label: 'auto' }),
        createElement(OxAvatar, { agent: 'eli', form: 'working', variant: 'render', size: 96, baseUrl: 'https://cdn.test/a' }),
        createElement(OxFooter, { variant: 'queues-work', state: 'needs-you', primaryLabel: 'Queue 3', hold: true, holdMs: 600 }),
      ),
    );
    const chip = host.querySelector('ox-state-chip')!;
    expect(chip.getAttribute('aria-label')).toBe('Partly done · 2 of 3');
    const line = host.querySelector('ox-attention-line')!;
    expect(line.getAttribute('aria-label')).toBe('2 need your decision · blocking 3 tasks');
    expect(line.querySelector('[slot="meta"]')!.textContent).toBe('Acme · synced 14:02');
    expect(host.querySelector('ox-glyph')!.getAttribute('aria-label')).toBe('Decision');
    const avatar = host.querySelector('ox-avatar')!;
    expect(avatar.getAttribute('base-url')).toBe('https://cdn.test/a');
    expect(avatar.shadowRoot!.querySelector('img')!.getAttribute('src')).toBe('https://cdn.test/a/eli-working-96.webp');
    const footer = host.querySelector('ox-footer')!;
    expect(footer.getAttribute('primary-label')).toBe('Queue 3');
    expect(footer.hasAttribute('hold')).toBe(true);
    expect(footer.getAttribute('hold-ms')).toBe('600');
  });

  it('wire element events to on* props and forward refs', () => {
    const onPrimary = vi.fn();
    const onOpen = vi.fn((e: CustomEvent<{ href: string }>) => e.preventDefault());
    const ref = createRef<HTMLElement>();
    render(
      createElement(
        'div',
        null,
        createElement(OxFooter, { ref, variant: 'finishes-here', state: 'needs-you', primaryLabel: 'Send', onPrimary }),
        createElement(OxReceiptRow, { status: 'fail', label: 'Runbook', href: 'https://useorgx.com/x', onOpen }),
      ),
    );
    expect(ref.current?.tagName).toBe('OX-FOOTER');
    act(() => (ref.current!.shadowRoot!.querySelector('button.p') as HTMLButtonElement).click());
    expect(onPrimary).toHaveBeenCalledOnce();
    expect(onPrimary.mock.calls[0]![0].detail).toMatchObject({ state: 'needs-you', held: false });
    const a = host.querySelector('ox-receipt-row')!.shadowRoot!.querySelector('a')!;
    act(() => a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('update attributes when props change', () => {
    const root = render(createElement(OxStateChip, { state: 'running' }));
    act(() => root.render(createElement(OxStateChip, { state: 'succeeded' })));
    expect(host.querySelector('ox-state-chip')!.getAttribute('aria-label')).toBe('Done');
  });
});
