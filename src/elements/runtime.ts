/**
 * The shared runtime the IIFE add-ons (footer, glyph, avatar) read from
 * window.OrgXElements._rt instead of bundling their own copy of shared.ts.
 * scripts/build-bundles.mjs maps every `./shared.js` import in an add-on to
 * these keys, so an add-on that needs another helper fails the build until it
 * is listed here.
 */
import { FIELD, ICON, OxEl, QUESTION, SOLID, avatarConfig, emit, esc, install, ring, slug, svg24 } from './shared.js';

export const runtime = { OxEl, ICON, ring, emit, esc, slug, svg24, FIELD, SOLID, QUESTION, avatarConfig, install };
