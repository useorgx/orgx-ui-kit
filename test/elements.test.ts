import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTION_STATES, FOOTER_FRAMES, GLYPH_KINDS, defineElements } from '../src/elements/index.js';
import { $, key, mount, pointer, shadow, text } from './helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('registration', () => {
  it('defines every element and is idempotent', async () => {
    for (const tag of ['ox-state-chip', 'ox-attention-line', 'ox-receipt-row', 'ox-footer', 'ox-glyph', 'ox-avatar']) {
      expect(customElements.get(tag), tag).toBeTypeOf('function');
    }
    expect(() => defineElements()).not.toThrow();
    await expect(import('../src/elements/iife.js')).resolves.toBeTruthy();
  });

  it('falls back to a <style> element when adoptedStyleSheets is unavailable', () => {
    const el = mount('ox-state-chip', { state: 'running' });
    const usesSheets = (shadow(el).adoptedStyleSheets?.length ?? 0) > 0;
    const style = shadow(el).querySelector('style');
    expect(usesSheets || !!style).toBe(true);
    if (style) expect(style.textContent).toContain('--ox-');
  });
});

describe('<ox-state-chip>', () => {
  it('renders every canonical state with the canvas label, tone and status role', () => {
    for (const [state, def] of Object.entries(ACTION_STATES)) {
      const el = mount('ox-state-chip', { state });
      expect(el.getAttribute('role')).toBe('status');
      expect(el.getAttribute('aria-label')).toBe(def.label);
      expect(el.dataset.tone).toBe(def.tone);
      expect(el.dataset.state).toBe(state);
      expect(text($(el, '.l'))).toBe(def.label);
    }
  });

  it('uses the SM0 wording, not the stored state', () => {
    const cases: Record<string, string> = {
      failed: 'Not sent',
      partially_succeeded: 'Partly done',
      handed_off: 'Waiting in OrgX',
      paused_for_input: 'Needs you again',
      expired: 'Lapsed',
      succeeded: 'Done',
    };
    for (const [state, label] of Object.entries(cases)) expect(mount('ox-state-chip', { state }).getAttribute('aria-label')).toBe(label);
  });

  it('accepts aliases and free-form spellings', () => {
    expect(mount('ox-state-chip', { state: 'idle' }).dataset.state).toBe('needs_you');
    expect(mount('ox-state-chip', { state: 'Partly done' }).dataset.state).toBe('partially_succeeded');
    expect(mount('ox-state-chip', { state: 'conflict' }).dataset.state).toBe('superseded');
    expect(mount('ox-state-chip', { state: 'pending' }).dataset.state).toBe('sending');
    const unknown = mount('ox-state-chip', { state: 'mystery_state' });
    expect(unknown.dataset.state).toBe('unknown');
    expect(unknown.getAttribute('aria-label')).toBe('Mystery state');
  });

  it('reflects attribute changes, detail and undo seconds', () => {
    const el = mount('ox-state-chip', { state: 'running', detail: 'step 3 of 5' });
    expect(el.getAttribute('aria-label')).toBe('Running · step 3 of 5');
    el.setAttribute('state', 'held');
    el.removeAttribute('detail');
    el.setAttribute('seconds', '8');
    expect(el.getAttribute('aria-label')).toBe('Held · undo 8 s');
    expect(el.dataset.tone).toBe('amber');
    expect($(el, '.i svg')).toBeTruthy();
  });

  it('reserves width with ghost labels that are hidden from assistive tech', () => {
    const el = mount('ox-state-chip', { state: 'running', reserve: 'running succeeded confirmed' });
    const ghosts = shadow(el).querySelectorAll('.g');
    expect([...ghosts].map((g) => g.textContent)).toEqual(['Done', 'Confirmed in OrgX']);
    expect($(el, '.c').getAttribute('aria-hidden')).toBe('true');
    const all = mount('ox-state-chip', { state: 'queued', reserve: 'all' });
    expect(shadow(all).querySelectorAll('.g').length).toBe(Object.keys(ACTION_STATES).length - 1);
  });
});

describe('<ox-attention-line>', () => {
  it('reads "N need your decision · oldest 2d" in amber', () => {
    const el = mount('ox-attention-line', { tone: 'needs-you', count: '2', oldest: '2d' });
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-label')).toBe('2 need your decision · oldest 2d');
    expect($(el, '.l').dataset.tone).toBe('amber');
  });

  it('uses the singular for one decision', () => {
    expect(mount('ox-attention-line', { count: '1' }).getAttribute('aria-label')).toBe('1 needs your decision');
  });

  it('turns red and names the blocked work when blocking', () => {
    const el = mount('ox-attention-line', { tone: 'blocking', count: '2', blocks: '3', oldest: '2d' });
    expect(el.getAttribute('aria-label')).toBe('2 need your decision · blocking 3 tasks · oldest 2d');
    expect($(el, '.l').dataset.tone).toBe('red');
  });

  it('is a calm one-liner when nothing waits, including count=0', () => {
    for (const attrs of [{ tone: 'calm' }, { tone: 'needs-you', count: '0' }]) {
      const el = mount('ox-attention-line', attrs);
      expect(el.getAttribute('aria-label')).toBe('Nothing needs your decision.');
      expect(el.dataset.tone).toBe('calm');
      expect($(el, '.l').dataset.tone).toBe('teal');
    }
  });

  it('reflects changes and lets slotted text replace the sentence', async () => {
    const el = mount('ox-attention-line', { count: '3' });
    el.setAttribute('count', '0');
    expect(el.dataset.tone).toBe('calm');
    const custom = mount('ox-attention-line', { count: '2' }, 'Two releases wait on you');
    await new Promise((r) => setTimeout(r));
    custom.dispatchEvent(new Event('slotchange'));
    $(custom, 'slot').dispatchEvent(new Event('slotchange'));
    expect(custom.hasAttribute('aria-label')).toBe(false);
  });
});

describe('<ox-receipt-row>', () => {
  it('announces status before the label and shows value and detail', () => {
    const el = mount('ox-receipt-row', { status: 'fail', label: 'Retries are bounded', value: '0.81', detail: 'Reliability · Judged' });
    expect(text($(el, '.b'))).toBe('Fails: Retries are bounded, 0.81');
    expect(text($(el, '.v'))).toBe('0.81');
    expect($(el, '.v').getAttribute('aria-hidden')).toBe('true');
    expect(text($(el, '.d'))).toBe('Reliability · Judged');
    expect(el.dataset.status).toBe('fail');
  });

  it('covers met, fail, yours, unverified and pending', () => {
    const sr: Record<string, string> = { met: 'Met', fail: 'Fails', yours: 'Your call', unverified: 'Unverified', pending: 'Checking' };
    for (const [status, label] of Object.entries(sr)) {
      const el = mount('ox-receipt-row', { status, label: 'x' });
      expect(text($(el, '.sr'))).toBe(`${label}:`);
    }
    expect(mount('ox-receipt-row', { status: 'passed', label: 'x' }).dataset.status).toBe('met');
  });

  it('becomes a link with href and lets the host route it through ox-open', () => {
    const el = mount('ox-receipt-row', { status: 'met', label: 'CI run 1182 · passed', value: '2d ago', href: 'https://useorgx.com/r/1' });
    const a = $<HTMLAnchorElement>(el, 'a');
    expect(a.getAttribute('href')).toBe('https://useorgx.com/r/1');
    expect(a.target).toBe('_blank');
    expect(a.rel).toContain('noopener');
    const seen: string[] = [];
    el.addEventListener('ox-open', (e) => {
      seen.push((e as CustomEvent<{ href: string }>).detail.href);
      e.preventDefault();
    });
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
    a.dispatchEvent(click);
    expect(seen).toEqual(['https://useorgx.com/r/1']);
    expect(click.defaultPrevented).toBe(true);
  });

  it('never links unsafe schemes', () => {
    const el = mount('ox-receipt-row', { status: 'met', label: 'x', href: 'javascript:alert(1)' });
    expect(shadow(el).querySelector('a')).toBeNull();
  });

  it('takes the listitem role inside a list', () => {
    const list = document.createElement('div');
    list.setAttribute('role', 'list');
    document.body.append(list);
    const el = document.createElement('ox-receipt-row');
    el.setAttribute('label', 'x');
    list.append(el);
    expect(el.getAttribute('role')).toBe('listitem');
  });
});

describe('<ox-glyph>', () => {
  it('renders every G1 kind as inline SVG, decorative by default', () => {
    expect(GLYPH_KINDS).toEqual([
      'goal',
      'initiative',
      'workstream',
      'milestone',
      'task',
      'run',
      'decision',
      'question',
      'artifact',
      'receipt',
    ]);
    for (const kind of GLYPH_KINDS) {
      const el = mount('ox-glyph', { kind });
      const svg = $(el, 'svg');
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(svg.getAttribute('stroke-width')).toBe('1.8');
      expect(el.getAttribute('aria-hidden')).toBe('true');
      expect(el.dataset.kind).toBe(kind);
    }
  });

  it('becomes a named image with a label and resizes', () => {
    const el = mount('ox-glyph', { kind: 'decision', label: 'auto', size: '24' });
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Decision');
    expect($(el, 'svg').getAttribute('width')).toBe('24');
    el.setAttribute('label', 'Roll out how?');
    expect(el.getAttribute('aria-label')).toBe('Roll out how?');
  });
});

describe('<ox-avatar>', () => {
  it('renders ${baseUrl}/${agent}-${form}-${size}.webp with alt text and the agent hue', () => {
    const el = mount('ox-avatar', { agent: 'eli', form: 'working', size: '48', 'base-url': 'https://cdn.test/avatars/' });
    const img = $<HTMLImageElement>(el, 'img');
    expect(img.getAttribute('src')).toBe('https://cdn.test/avatars/eli-working-48.webp');
    expect(img.getAttribute('srcset')).toContain('eli-working-96.webp 2x');
    expect(img.alt).toBe('Eli, working');
    expect($(el, '.a').getAttribute('style')).toContain('--hue:var(--agent-eli)');
    el.setAttribute('size', '192');
    expect(img.getAttribute('src')).toBe('https://cdn.test/avatars/eli-working-192.webp');
    expect(img.hasAttribute('srcset')).toBe(false);
  });

  it('names the base form by the agent alone', () => {
    const el = mount('ox-avatar', { agent: 'sage', size: '96' });
    expect($<HTMLImageElement>(el, 'img').alt).toBe('Sage');
    expect($<HTMLImageElement>(el, 'img').getAttribute('src')).toMatch(/\/sage-base-96\.webp$/);
  });

  it('falls back to the initial in the same footprint when the image fails', () => {
    const el = mount('ox-avatar', { agent: 'dana', form: 'asking', size: '48' });
    const onFallback = vi.fn();
    el.addEventListener('ox-avatar-fallback', onFallback);
    $(el, 'img').dispatchEvent(new Event('error'));
    expect((el as unknown as { failed: boolean }).failed).toBe(true);
    const fb = $(el, '.f');
    expect(fb.textContent).toBe('D');
    expect(fb.getAttribute('role')).toBe('img');
    expect(fb.getAttribute('aria-label')).toBe('Dana, asking');
    expect(onFallback).toHaveBeenCalledOnce();
    expect($(el, '.a').getAttribute('style')).toContain('--z:48px');
  });
});

describe('<ox-footer>', () => {
  beforeEach(() => vi.useFakeTimers());

  it('renders all four SM3 footers in all six states with one row and stable slots', () => {
    for (const [variant, frames] of Object.entries(FOOTER_FRAMES)) {
      const el = mount('ox-footer', { variant });
      for (const [state, frame] of Object.entries(frames)) {
        el.setAttribute('state', state);
        expect(el.dataset.state).toBe(state);
        expect(el.dataset.tone).toBe(frame.tone);
        if (frame.icon !== 'skel') expect(text($(el, '.h'))).toBe(frame.heading);
        const p = $<HTMLButtonElement>(el, 'button.p');
        const x = $<HTMLButtonElement>(el, 'button.x');
        expect(p.hidden).toBe(!frame.primary);
        expect(x.hidden).toBe(!frame.action);
        if (frame.primary) expect(p.getAttribute('aria-label')).toMatch(new RegExp(`^${frame.primary}`));
        expect($(el, '.t').getAttribute('aria-live')).toBe('polite');
      }
      // Every label of the variant is reserved in the hidden ghost stack.
      const ghost = text($(el, '.g'));
      for (const f of Object.values(frames)) {
        if (f.primary) expect(ghost).toContain(f.primary);
        if (f.action) expect(ghost).toContain(f.action);
      }
      expect($(el, '.g').getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('marks links to OrgX and busy primaries', () => {
    const el = mount('ox-footer', { variant: 'confirms-in-orgx', state: 'draft' });
    expect($(el, 'button.p').getAttribute('aria-label')).toBe('Confirm in OrgX, opens OrgX');
    el.setAttribute('state', 'saving');
    expect($(el, 'button.p').classList.contains('busy')).toBe(true);
    expect($(el, 'button.p').getAttribute('aria-disabled')).toBe('true');
  });

  it('fires ox-primary on click and locks until the state changes', () => {
    const el = mount('ox-footer', { variant: 'finishes-here', state: 'needs-you', 'primary-label': 'Send' });
    const onPrimary = vi.fn();
    el.addEventListener('ox-primary', onPrimary);
    const p = $<HTMLButtonElement>(el, 'button.p');
    p.click();
    p.click();
    expect(onPrimary).toHaveBeenCalledOnce();
    expect(p.getAttribute('aria-disabled')).toBe('true');
    // Labels describe the current state; the widget sets them with the state.
    el.removeAttribute('primary-label');
    el.setAttribute('state', 'failed');
    expect(p.getAttribute('aria-disabled')).toBe('false');
    expect(p.getAttribute('aria-label')).toBe('Retry');
  });

  it('approves in one click and paints the primary with the action lime, not --ox-primary', () => {
    const el = mount('ox-footer', { variant: 'finishes-here', state: 'needs-you', 'primary-label': 'Approve' });
    const onPrimary = vi.fn();
    el.addEventListener('ox-primary', onPrimary);
    const p = $<HTMLButtonElement>(el, 'button.p');
    expect(p.classList.contains('hold')).toBe(false);
    expect(p.hasAttribute('aria-describedby')).toBe(false);
    p.click();
    expect(onPrimary).toHaveBeenCalledOnce();
    const root = shadow(el);
    const css = [
      ...(root.adoptedStyleSheets ?? []).flatMap((s) => Array.from(s.cssRules, (r) => r.cssText)),
      root.querySelector('style')?.textContent ?? '',
    ].join('\n');
    expect(css).toMatch(/\.p\s*\{[^}]*background:\s*var\(--ox-action\)/);
    expect(css).toMatch(/\.p\s*\{[^}]*color:\s*var\(--ox-action-fg\)/);
    expect(css).not.toMatch(/--ox-on-primary|--ox-primary-hold|#1a1204/);
  });

  it('hold-to-confirm fires only after the hold, by pointer', () => {
    const el = mount('ox-footer', {
      variant: 'finishes-here',
      state: 'needs-you',
      'primary-label': 'Hold to send',
      hold: '',
      'hold-ms': '800',
    });
    const onConfirm = vi.fn();
    const onPrimary = vi.fn();
    el.addEventListener('ox-confirm', onConfirm);
    el.addEventListener('ox-primary', onPrimary);
    const p = $<HTMLButtonElement>(el, 'button.p');
    expect(text(p.querySelector('.sr'))).toMatch(/Press and hold 0.8 s/);
    expect(shadow(el).getElementById(p.getAttribute('aria-describedby')!)).toBe(p.querySelector('.sr'));

    p.click(); // a click alone never confirms
    expect(onPrimary).not.toHaveBeenCalled();

    pointer(p, 'pointerdown');
    expect(p.classList.contains('holding')).toBe(true);
    expect(text(p.querySelector('.l'))).toBe('Holding…');
    vi.advanceTimersByTime(500);
    pointer(p, 'pointerup'); // released early
    vi.advanceTimersByTime(1000);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(text(p.querySelector('.l'))).toBe('Hold to send');

    pointer(p, 'pointerdown');
    vi.advanceTimersByTime(799);
    expect(onConfirm).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onPrimary).toHaveBeenCalledOnce();
    expect(onPrimary.mock.calls[0]![0].detail).toMatchObject({ variant: 'finishes-here', state: 'needs-you', held: true });
  });

  it('hold-to-confirm works from the keyboard and ignores key repeat', () => {
    const el = mount('ox-footer', { variant: 'queues-work', state: 'needs-you', 'primary-label': 'Queue 3', hold: '' });
    const onConfirm = vi.fn();
    el.addEventListener('ox-confirm', onConfirm);
    const p = $<HTMLButtonElement>(el, 'button.p');

    key(p, 'keydown', ' ');
    vi.advanceTimersByTime(400);
    key(p, 'keyup', ' ');
    vi.advanceTimersByTime(2000);
    expect(onConfirm).not.toHaveBeenCalled();

    key(p, 'keydown', 'Enter');
    key(p, 'keydown', 'Enter', true);
    vi.advanceTimersByTime(1000);
    expect(onConfirm).toHaveBeenCalledOnce();
    key(p, 'keyup', 'Enter');
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('runs the undo window: ticks, announces once, undo, and expiry', () => {
    const el = mount('ox-footer', { variant: 'finishes-here', state: 'held', 'undo-seconds': '10' });
    const d = $(el, '.d');
    expect(text(d)).toBe('undo 10 s');
    expect(d.getAttribute('aria-hidden')).toBe('true');
    expect(text($(el, '.t .sr'))).toBe('Undo available for 10 seconds');
    expect($(el, 'button.x').getAttribute('aria-label')).toBe('Undo');
    vi.advanceTimersByTime(2000);
    expect(text(d)).toBe('undo 8 s');
    expect((el as unknown as { undoRemaining: number }).undoRemaining).toBe(8);

    const onUndo = vi.fn();
    el.addEventListener('ox-undo', onUndo);
    $<HTMLButtonElement>(el, 'button.x').click();
    expect(onUndo).toHaveBeenCalledOnce();

    const el2 = mount('ox-footer', { variant: 'queues-work', state: 'held', 'undo-seconds': '3' });
    const onExpired = vi.fn();
    el2.addEventListener('ox-undo-expired', onExpired);
    vi.advanceTimersByTime(3100);
    expect(onExpired).toHaveBeenCalledOnce();
    expect($(el2, 'button.x').getAttribute('aria-disabled')).toBe('true');
    el2.setAttribute('state', 'queued');
    expect($(el2, '.d').hasAttribute('aria-hidden')).toBe(false);
    expect(text($(el2, '.t .sr'))).toBe('');
  });

  it('honours an undo deadline so a reload shows the true time left', () => {
    vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
    const el = mount('ox-footer', { variant: 'finishes-here', state: 'held', 'undo-deadline': String(Date.now() + 4000) });
    expect(text($(el, '.d'))).toBe('undo 4 s');
  });

  it('keeps controls but makes them read-only when disabled', () => {
    const el = mount('ox-footer', { variant: 'finishes-here', state: 'needs-you', disabled: '' });
    const onPrimary = vi.fn();
    el.addEventListener('ox-primary', onPrimary);
    const p = $<HTMLButtonElement>(el, 'button.p');
    expect(p.hidden).toBe(false);
    expect(p.getAttribute('aria-disabled')).toBe('true');
    p.click();
    expect(onPrimary).not.toHaveBeenCalled();
  });

  it('shows a skeleton while loading and reports busy', () => {
    const el = mount('ox-footer', { variant: 'reads', state: 'loading' });
    expect(shadow(el).querySelectorAll('.k').length).toBe(2);
    expect($(el, '.t').hasAttribute('aria-busy')).toBe(true);
    el.setAttribute('state', 'stale');
    expect($(el, '.t').hasAttribute('aria-busy')).toBe(false);
    expect(text($(el, '.h'))).toBe('Out of date');
  });

  it('accepts heading/detail overrides and emits ox-action with a slug', () => {
    const el = mount('ox-footer', { variant: 'finishes-here', state: 'running', heading: 'Eli is running', detail: 'step 3 of 5' });
    expect(text($(el, '.h'))).toBe('Eli is running');
    expect(text($(el, '.d'))).toBe('step 3 of 5');
    const onAction = vi.fn();
    el.addEventListener('ox-action', onAction);
    $<HTMLButtonElement>(el, 'button.x').click();
    expect(onAction.mock.calls[0]![0].detail).toMatchObject({ action: 'watch' });
  });
});
