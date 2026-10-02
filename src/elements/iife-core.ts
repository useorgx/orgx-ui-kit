/**
 * Entry for dist/elements-core.iife.js: the shared runtime, <ox-state-chip>,
 * <ox-attention-line> and <ox-receipt-row>. Load it before any add-on
 * (elements-footer / -glyph / -avatar.iife.js), which reuse its runtime.
 */
import { OxAttentionLine } from './attention-line.js';
import { OxReceiptRow } from './receipt-row.js';
import { runtime } from './runtime.js';
import { install } from './shared.js';
import { OxStateChip } from './state-chip.js';

install({ 'ox-state-chip': OxStateChip, 'ox-attention-line': OxAttentionLine, 'ox-receipt-row': OxReceiptRow }, runtime);
