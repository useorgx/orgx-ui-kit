'use client';
/**
 * @useorgx/orgx-ui-kit/react
 *
 * Thin typed React wrappers over the framework-free elements. Each renders
 * the custom element, maps camelCase props to attributes, wires the element's
 * CustomEvents to on* props, and forwards a ref to the element. Works with
 * React 18 and 19 (React stays a peer dependency).
 */
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ForwardRefExoticComponent,
  type ReactNode,
  type RefAttributes,
} from 'react';
import '../elements/index.js';
import type {
  ActionState,
  AgentKey,
  AvatarForm,
  FooterVariant,
  GlyphKind,
  OxAttentionLine as OxAttentionLineEl,
  OxAvatar as OxAvatarEl,
  OxFooter as OxFooterEl,
  OxGlyph as OxGlyphEl,
  OxReceiptRow as OxReceiptRowEl,
  OxStateChip as OxStateChipEl,
  ReceiptStatus,
} from '../elements/index.js';

type AnyString = string & {};

export interface OxBaseProps {
  id?: string;
  className?: string;
  style?: CSSProperties;
  slot?: string;
  /** Overrides the element's generated accessible name. */
  'aria-label'?: string;
  children?: ReactNode;
}

type Spec<P> = {
  /** prop -> attribute name */
  attrs: Partial<Record<keyof P, string>>;
  /** prop -> event name */
  events?: Partial<Record<keyof P, string>>;
  /** props assigned as DOM properties */
  props?: (keyof P)[];
  /** props rendered as light-DOM children in a named slot */
  slots?: Partial<Record<keyof P, string>>;
};

function toAttr(v: unknown): string | undefined {
  if (v === undefined || v === null || v === false) return undefined;
  if (v === true) return '';
  return String(v);
}

function wrap<P extends OxBaseProps, E extends HTMLElement>(
  tag: string,
  displayName: string,
  spec: Spec<P>,
): ForwardRefExoticComponent<P & RefAttributes<E>> {
  const C = forwardRef<E, P>(function OxWrapper(rawProps, ref) {
    const props = rawProps as P;
    const node = useRef<E | null>(null);
    const latest = useRef(props);
    latest.current = props;
    useImperativeHandle(ref, () => node.current as E, []);

    // One listener per event for the element's lifetime; it calls the latest handler.
    useEffect(() => {
      const target = node.current;
      if (!target || !spec.events) return;
      const offs: (() => void)[] = [];
      for (const [prop, type] of Object.entries(spec.events) as [keyof P, string][]) {
        const fn = (e: Event) => {
          const h = latest.current[prop];
          if (typeof h === 'function') (h as (e: Event) => void)(e);
        };
        target.addEventListener(type, fn);
        offs.push(() => target.removeEventListener(type, fn));
      }
      return () => offs.forEach((off) => off());
    }, []);

    // DOM properties (objects) are assigned, not stringified.
    useEffect(() => {
      const target = node.current as unknown as Record<string, unknown> | null;
      if (!target || !spec.props) return;
      for (const p of spec.props) {
        const v = props[p];
        if (v !== undefined) target[p as string] = v;
      }
    });

    const domProps: Record<string, unknown> = { ref: node };
    if (props.id) domProps.id = props.id;
    if (props.className) domProps.className = props.className;
    if (props.style) domProps.style = props.style;
    if (props.slot) domProps.slot = props.slot;
    if (props['aria-label']) domProps['aria-label'] = props['aria-label'];
    for (const [prop, attr] of Object.entries(spec.attrs) as [keyof P, string][]) {
      const v = toAttr(props[prop]);
      if (v !== undefined) domProps[attr] = v;
    }
    const kids: ReactNode[] = [];
    if (spec.slots) {
      for (const [prop, slot] of Object.entries(spec.slots) as [keyof P, string][]) {
        const content = props[prop] as ReactNode;
        if (content !== undefined && content !== null && content !== false) {
          kids.push(createElement('span', { key: `slot-${slot}`, slot }, content));
        }
      }
    }
    if (props.children !== undefined) kids.unshift(props.children);
    return createElement(tag, domProps, ...kids);
  });
  C.displayName = displayName;
  return C as ForwardRefExoticComponent<P & RefAttributes<E>>;
}

/* ------------------------------------------------------------------ chip -- */
export interface OxStateChipProps extends OxBaseProps {
  state: ActionState | AnyString;
  label?: string;
  detail?: string;
  /** For state="held": seconds left in the undo window. */
  seconds?: number;
  /** "all", or space-separated states whose labels the chip reserves width for. */
  reserve?: 'all' | AnyString;
}
export const OxStateChip = wrap<OxStateChipProps, OxStateChipEl>('ox-state-chip', 'OxStateChip', {
  attrs: { state: 'state', label: 'label', detail: 'detail', seconds: 'seconds', reserve: 'reserve' },
});

/* -------------------------------------------------------- attention line -- */
export interface OxAttentionLineProps extends OxBaseProps {
  tone?: 'needs-you' | 'blocking' | 'calm';
  count?: number;
  oldest?: string;
  blocks?: number;
  label?: string;
  /** Right-side context, e.g. "Acme · synced 14:02" (hidden under 420px). */
  meta?: ReactNode;
  /** Trailing control, e.g. a refresh button. */
  action?: ReactNode;
}
export const OxAttentionLine = wrap<OxAttentionLineProps, OxAttentionLineEl>('ox-attention-line', 'OxAttentionLine', {
  attrs: { tone: 'tone', count: 'count', oldest: 'oldest', blocks: 'blocks', label: 'label' },
  slots: { meta: 'meta', action: 'action' },
});

/* ----------------------------------------------------------- receipt row -- */
export interface OxReceiptRowProps extends OxBaseProps {
  status: ReceiptStatus | AnyString;
  label: string;
  value?: string;
  detail?: string;
  href?: string;
  target?: string;
  /** Cancelable. Call e.preventDefault() to route the link yourself (e.g. openWidgetLink). */
  onOpen?: (e: CustomEvent<{ href: string }>) => void;
}
export const OxReceiptRow = wrap<OxReceiptRowProps, OxReceiptRowEl>('ox-receipt-row', 'OxReceiptRow', {
  attrs: { status: 'status', label: 'label', value: 'value', detail: 'detail', href: 'href', target: 'target' },
  events: { onOpen: 'ox-open' },
});

/* ---------------------------------------------------------------- footer -- */
export interface OxFooterEventDetail {
  variant: FooterVariant;
  state: string;
  held?: boolean;
  action?: string;
}
export interface OxFooterProps extends OxBaseProps {
  variant: FooterVariant;
  state: string;
  heading?: string;
  /** "{s}" is replaced with the seconds left in the undo window. */
  detail?: string;
  primaryLabel?: string;
  actionLabel?: string;
  /** Primary becomes hold-to-confirm. */
  hold?: boolean;
  holdMs?: number;
  undoSeconds?: number;
  /** Epoch ms when the server commits the held action. */
  undoDeadline?: number;
  disabled?: boolean;
  flush?: boolean;
  /** Replaces the built-in primary button. */
  primary?: ReactNode;
  /** Replaces the built-in text action. */
  action?: ReactNode;
  onPrimary?: (e: CustomEvent<OxFooterEventDetail>) => void;
  onConfirm?: (e: CustomEvent<OxFooterEventDetail>) => void;
  onAction?: (e: CustomEvent<OxFooterEventDetail>) => void;
  onUndo?: (e: CustomEvent<OxFooterEventDetail>) => void;
  onUndoExpired?: (e: CustomEvent<OxFooterEventDetail>) => void;
}
export const OxFooter = wrap<OxFooterProps, OxFooterEl>('ox-footer', 'OxFooter', {
  attrs: {
    variant: 'variant',
    state: 'state',
    heading: 'heading',
    detail: 'detail',
    primaryLabel: 'primary-label',
    actionLabel: 'action-label',
    hold: 'hold',
    holdMs: 'hold-ms',
    undoSeconds: 'undo-seconds',
    undoDeadline: 'undo-deadline',
    disabled: 'disabled',
    flush: 'flush',
  },
  events: {
    onPrimary: 'ox-primary',
    onConfirm: 'ox-confirm',
    onAction: 'ox-action',
    onUndo: 'ox-undo',
    onUndoExpired: 'ox-undo-expired',
  },
  slots: { primary: 'primary', action: 'action' },
});

/* ----------------------------------------------------------------- glyph -- */
export interface OxGlyphProps extends OxBaseProps {
  kind: GlyphKind | AnyString;
  tone?: 'muted' | 'amber' | 'teal' | 'red' | 'text' | 'current';
  size?: number;
  /** Set to make the glyph meaningful on its own ("auto" reads the kind). */
  label?: string;
}
export const OxGlyph = wrap<OxGlyphProps, OxGlyphEl>('ox-glyph', 'OxGlyph', {
  attrs: { kind: 'kind', tone: 'tone', size: 'size', label: 'label' },
});

/* ---------------------------------------------------------------- avatar -- */
export interface OxAvatarProps extends OxBaseProps {
  agent: AgentKey | AnyString;
  form?: AvatarForm;
  size?: 48 | 96 | 192 | number;
  baseUrl?: string;
  /** Display name for agents outside the seven. */
  name?: string;
  onFallback?: (e: Event) => void;
}
export const OxAvatar = wrap<OxAvatarProps, OxAvatarEl>('ox-avatar', 'OxAvatar', {
  attrs: { agent: 'agent', form: 'form', size: 'size', baseUrl: 'base-url', name: 'name' },
  events: { onFallback: 'ox-avatar-fallback' },
});

export type { ActionState, AgentKey, AvatarForm, FooterVariant, GlyphKind, ReceiptStatus };
