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
```

When touching visual components, also verify the downstream surface that consumes the component. Static TypeScript success is not visual QA.
