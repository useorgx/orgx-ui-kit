/**
 * Entry for dist/elements-avatar.iife.js: <ox-avatar> and <ox-agent-card> (the
 * avatar's hover card). Needs elements-core.iife.js (or the full bundle) loaded
 * first; the card's state chip comes from core.
 */
import { OxAgentCard } from './agent-card.js';
import { OxAvatar } from './avatar.js';
import { install } from './shared.js';

install({ 'ox-avatar': OxAvatar, 'ox-agent-card': OxAgentCard });
