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

Choose checks for the files and behavior changed. The commands below cover code
changes; documentation-only edits need a diff and reference review, not a full
build. Keep required CI checks in place and report any checks that could not run.

```bash
npm run type-check
npm run build
npm test
```

Tokens live in `tokens/tokens.json`; edit it, never the generated `dist/tokens.*` files. The framework-free elements in `src/elements` must stay dependency-free and themed only through `--ox-*` variables; `npm run build` reports every IIFE size and fails above its budget (full bundle: target 25 KB, fails above 26 KB; core / footer / glyph / avatar split bundles: see `scripts/build-bundles.mjs`). `demo/index.html` shows every element in every state.

When changing visual behavior, inspect the component and an affected downstream
surface when available. Static TypeScript success is not visual QA. If a consumer
or browser environment is unavailable, report the unverified surface and continue
with the checks that can run; do not require every consuming repo to be checked out.
