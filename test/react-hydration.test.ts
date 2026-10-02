import { act, createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OxAttentionLine, OxAvatar, OxGlyph, OxReceiptRow, OxStateChip } from '../src/react/index.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/** Server-render, insert (the elements upgrade and stamp their hosts), then hydrate. */
async function hydrate(node: Parameters<typeof renderToString>[0]) {
  const host = document.createElement('div');
  host.innerHTML = renderToString(node);
  document.body.append(host);
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  await act(async () => {
    hydrateRoot(host, node);
  });
  return { host, messages: errors.mock.calls.map((c) => String(c[0])) };
}

describe('React wrappers and SSR hydration', () => {
  it('hydrate server-rendered elements that stamped their own hosts without a mismatch', async () => {
    const { host, messages } = await hydrate(
      createElement(
        'div',
        null,
        createElement(OxAvatar, { agent: 'eli', form: 'working', size: 48 }),
        createElement(OxStateChip, { state: 'running', reserve: 'all' }),
        createElement(OxReceiptRow, { status: 'met', label: 'CI passed' }),
        createElement(OxGlyph, { kind: 'decision', label: 'auto' }),
        createElement(OxAttentionLine, { tone: 'needs-you', count: 2, meta: 'Acme' }),
      ),
    );
    // The upgrade really did stamp attributes React never rendered...
    expect(host.querySelector('ox-avatar')!.getAttribute('data-agent')).toBe('eli');
    expect(host.querySelector('ox-state-chip')!.getAttribute('role')).toBe('status');
    expect(host.querySelector('ox-glyph')!.getAttribute('role')).toBe('img');
    // ...and hydration does not report them.
    expect(messages).toEqual([]);
  });

  it('still reports a mismatch in React-rendered children (suppression is host-only)', async () => {
    const server = renderToString(createElement(OxAttentionLine, { count: 1, meta: 'server' }));
    const host = document.createElement('div');
    host.innerHTML = server;
    document.body.append(host);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      hydrateRoot(host, createElement(OxAttentionLine, { count: 1, meta: 'client' }), {
        onRecoverableError: (e) => console.error(String(e)),
      });
    });
    expect(errors.mock.calls.length).toBeGreaterThan(0);
  });
});
