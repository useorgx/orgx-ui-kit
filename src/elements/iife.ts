/**
 * Entry for dist/elements.iife.js (everything): defines every element on load
 * and exposes window.OrgXElements = { defineElements, avatarConfig, ELEMENTS }.
 * Loading it next to the split bundles, or twice, is a no-op.
 */
import { ELEMENTS } from './define.js';
import { runtime } from './runtime.js';
import { install } from './shared.js';

install(ELEMENTS, runtime);
