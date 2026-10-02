# AGENTS.md

Guidelines for Codex and other agents working in `useorgx/orgx-ui-kit`.

## Project

This repo contains shared React components and token-driven UI primitives for OrgX surfaces.

## Setup

For Codex cloud, use:

```bash
bash .codex/setup-cloud.sh
```

Maintenance script for cached environments:

```bash
bash .codex/maintenance-cloud.sh
```

## Verification

```bash
npm run type-check
npm run build
npm test
```

Tokens live in `tokens/tokens.json`; edit it, never the generated `dist/tokens.*` files. The framework-free elements in `src/elements` must stay dependency-free and themed only through `--ox-*` variables; `npm run build` reports every IIFE size and fails above its budget (full bundle: target 25 KB, fails above 26 KB; core / footer / glyph / avatar split bundles: see `scripts/build-bundles.mjs`). `demo/index.html` shows every element in every state.

When touching visual components, also verify the downstream surface that consumes the component. Static TypeScript success is not visual QA.
