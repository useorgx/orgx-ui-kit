/**
 * @useorgx/orgx-ui-kit/elements
 *
 * Framework-free OrgX elements. Importing this module defines every element
 * once (re-importing, or loading the IIFE too, never throws). Theme them by
 * loading tokens.css; they read nothing but --ox-* and --agent-* variables.
 */
import { OxAgentCard } from './agent-card.js';
import { OxAttentionLine } from './attention-line.js';
import { OxAvatar } from './avatar.js';
import { OxFooter } from './footer.js';
import { OxGlyph } from './glyph.js';
import { OxReceiptRow } from './receipt-row.js';
import { OxStateChip } from './state-chip.js';
import { ELEMENTS, defineElements } from './define.js';

export { OxAgentCard, OxAttentionLine, OxAvatar, OxFooter, OxGlyph, OxReceiptRow, OxStateChip };
export { ACTION_STATES, STATE_ALIASES, resolveState } from './states.js';
export type { ActionState, StateDef } from './states.js';
export { FOOTER_FRAMES, FOOTER_VARIANTS, resolveFooter } from './frames.js';
export type { FooterVariant, FooterFrame } from './frames.js';
export { GLYPHS, GLYPH_KINDS, glyphSvg } from './glyph.js';
export type { GlyphKind } from './glyph.js';
export { RECEIPT_STATUSES, resolveReceiptStatus } from './receipt-row.js';
export type { ReceiptStatus } from './receipt-row.js';
export {
  AGENTS,
  AGENT_KEYS,
  AVATAR_FORMS,
  AVATAR_SIZES,
  AVATAR_VARIANTS,
  ORGX_MARK,
  avatarConfig,
  avatarUrl,
  initials,
  photoUrl,
  resolveAgent,
} from './avatar.js';
export type { AgentKey, AvatarForm, AvatarVariant } from './avatar.js';

export { ELEMENTS, defineElements };

defineElements();

declare global {
  interface HTMLElementTagNameMap {
    'ox-state-chip': OxStateChip;
    'ox-attention-line': OxAttentionLine;
    'ox-receipt-row': OxReceiptRow;
    'ox-footer': OxFooter;
    'ox-glyph': OxGlyph;
    'ox-avatar': OxAvatar;
    'ox-agent-card': OxAgentCard;
  }
}
