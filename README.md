# @useorgx/orgx-ui-kit

The OrgX design core: one token source, framework-free custom elements for MCP widgets, and React for the app. Quiet when fine, loud only when it needs you: amber means it needs you, teal means accepted or moving, red means it failed and can be retried. The one primary action is the homepage lime (`--ox-action`) with dark text, in every widget and both themes.

| Entry point | What it is | Use it in |
| --- | --- | --- |
| `@useorgx/orgx-ui-kit/tokens.css` | `--ox-*` variables (light default, dark via `[data-theme="dark"]` or the OS) and `--agent-<key>` / `--agent-<key>-rgb` hues | everywhere |
| `@useorgx/orgx-ui-kit/elements` | ES module; importing it defines every element once | apps with a bundler |
| `@useorgx/orgx-ui-kit/elements.iife.js` | self-contained script (no dependencies); exposes `window.OrgXElements` | inline in MCP widget HTML |
| `@useorgx/orgx-ui-kit/react` | typed React wrappers for each element (React 18 or 19, peer dependency) | the app |
| `@useorgx/orgx-ui-kit/tailwind-preset` | Tailwind preset whose colors resolve to the CSS variables | the app |
| `@useorgx/orgx-ui-kit/tokens` | the token object as ESM (`tokens.json` is also exported) | scripts, charts |
| `@useorgx/orgx-ui-kit` | the 0.1 React surfaces (unchanged) | the app |

## Widgets (MCP HTML)

Inline both files into the widget HTML so it renders with no network round-trip:

```html
<style>/* contents of node_modules/@useorgx/orgx-ui-kit/dist/tokens.css */</style>
<script>/* contents of node_modules/@useorgx/orgx-ui-kit/dist/elements.iife.js */</script>

<article class="card">
  <ox-attention-line tone="needs-you" count="2" oldest="2d">
    <span slot="meta">Acme · synced 14:02</span>
  </ox-attention-line>

  <ox-receipt-row status="met" label="CI run 1182 · passed" value="2d ago" href="https://useorgx.com/..."></ox-receipt-row>
  <ox-receipt-row status="fail" label="Runbook covers the new retry behavior" detail="Docs · Judged · runbook not updated"></ox-receipt-row>

  <ox-footer id="ft" variant="finishes-here" state="needs-you" heading="Finishes here" detail="undo 10 s" primary-label="Send"></ox-footer>
</article>

<script>
  const ft = document.getElementById('ft');
  ft.addEventListener('ox-primary', async () => {
    ft.state = 'sending';
    await callTool('answer_question', { /* ... */ });
    ft.setAttribute('undo-deadline', String(Date.now() + 10_000)); // the server holds the action
    ft.state = 'held';
  });
  ft.addEventListener('ox-undo', () => callTool('cancel_hold', { /* ... */ }));
  ft.addEventListener('ox-undo-expired', () => { ft.state = 'running'; });
  // Raw anchors are not allowed in MCP widgets: route receipt links through the host.
  document.addEventListener('ox-open', (e) => { e.preventDefault(); openWidgetLink(e.detail.href); });
</script>
```

Theme: the widget SDK sets `data-theme` on `<html>` from `?theme=`; without it the OS preference applies. The elements read nothing but `--ox-*` and `--agent-*` variables, so there is nothing else to configure.

Size: `elements.iife.js` is 28.6 KB minified, 10.4 KB gzip (`npm run build` prints it; the target is 25 KB and the build fails above 32 KB).

## The app (React + Tailwind)

```ts
// once, at the root
import '@useorgx/orgx-ui-kit/tokens.css';
```

```js
// tailwind.config.js
module.exports = {
  presets: [require('@useorgx/orgx-ui-kit/tailwind-preset')],
  content: ['./src/**/*.{ts,tsx}'],
};
// bg-ox-panel, text-ox-text-muted, border-ox-border, text-ox-warning, bg-ox-teal/10, ring-agent-eli,
// rounded-ox-card, shadow-ox, duration-ox-edge, ease-ox ... all follow the theme with no dark: variant.
```

```tsx
import { OxAttentionLine, OxAvatar, OxFooter, OxGlyph, OxReceiptRow, OxStateChip } from '@useorgx/orgx-ui-kit/react';

<OxAttentionLine tone="blocking" count={1} blocks={3} oldest="5h" meta="Acme · synced 14:02" />
<OxStateChip state={run.status} detail="step 3 of 5" reserve="running succeeded failed" />
<OxReceiptRow status="yours" label="Ship on by default, or behind the flag?" onOpen={(e) => { e.preventDefault(); router.push(e.detail.href); }} />
<OxFooter variant="queues-work" state={state} heading="Queue 3 for Xandy" detail="est. $70 · undo 10 s"
  primaryLabel="Queue 3" hold onConfirm={queue} onUndo={cancel} />
<OxGlyph kind="decision" tone="amber" label="auto" />
<OxAvatar agent="eli" form="working" size={48} baseUrl={AVATAR_BASE} />
```

Wrappers map camelCase props to attributes, `on*` props to the element's events, and forward a ref to the element. They import `/elements`, so the elements are defined when React renders them (and the import is SSR-safe).

## Elements

All elements use shadow DOM with shared constructable stylesheets (a `<style>` fallback where `adoptedStyleSheets` is missing), keep a fixed footprint in every state, have visible `:focus-visible` rings, respect `prefers-reduced-motion`, and fit 375 px.

### `<ox-state-chip state>`

One pill for every action state (canvas SM0 lifecycle + SM2 columns). The chip shows the canvas wording, never the stored name. `role="status"`; the accessible name is the label.

| state | label | tone |
| --- | --- | --- |
| `needs_you` (`idle`, `open`) | Needs you | amber |
| `sending` (`pending`, `received`) | Sending | ink |
| `held` | Held · undo (`seconds="8"` → "Held · undo 8 s") | amber |
| `committed` | Committed | teal |
| `queued` | Queued | teal |
| `running` | Running | teal |
| `verifying` | Verifying | teal |
| `succeeded` (`done`, `completed`) | Done | teal |
| `undone` | Undone | mute |
| `cancelled` (`canceled`) | Cancelled | mute |
| `paused_for_input` | Needs you again | amber |
| `failed` (`error`) | Not sent | red |
| `retrying` | Retrying | amber |
| `failed_step` (`run_failed`) | Run failed | red |
| `partially_succeeded` (`partial`) | Partly done | amber |
| `draft` | Draft saved | amber |
| `handed_off` (`waiting`) | Waiting in OrgX | mute |
| `confirmed` | Confirmed in OrgX | teal |
| `rejected` | Rejected in OrgX | mute |
| `expired` (`lapsed`) | Lapsed | mute |
| `superseded` (`conflict`) | Superseded | mute |
| `stale` | Stale | amber |
| `offline` | Offline | mute |
| `view_only` | View only | mute |
| `blocked` | Blocked | red |
| `delivered` | Delivered | teal |

Attributes: `label` (override), `detail` ("Running · step 3 of 5"), `seconds`, `reserve` (`all` or a list of states whose labels the chip reserves width for, so rows never reflow).

### `<ox-attention-line tone count oldest>`

The one line that opens a surface. `needs-you` (amber): "2 need your decision · oldest 2d". `blocking` (red, with `blocks="3"`): "1 needs your decision · blocking 3 tasks · oldest 5h". `calm`, or `count="0"`: "Nothing needs your decision." Always one 44 px row (the sentence wraps under 420 px instead of truncating). Slots: default (custom sentence), `meta`, `action`.

### `<ox-receipt-row status label value detail href>`

One line of proof. `status`: `met` (teal check), `fail` (red alert), `yours` (amber question, "Your call"), `unverified` (muted hatch), `pending` (checking). The status is announced before the label. With `href` the row is a link that first dispatches a cancelable `ox-open` event (`detail.href`) so widgets can use `openWidgetLink`. Inside a `role="list"` parent it takes `role="listitem"`.

### `<ox-footer variant state>`

The four footers from SM3. One 64 px row in every state: status icon, two lines of text, at most one text action and one primary. The action area reserves the width of every label it will show, so the row never reflows.

| variant | states |
| --- | --- |
| `finishes-here` | `needs-you` · `sending` · `held` · `running` · `done` · `failed` |
| `confirms-in-orgx` | `needs-you` · `saving` · `draft` · `waiting` · `confirmed` · `rejected` |
| `queues-work` | `needs-you` · `held` · `queued` · `running` · `partial` · `done` |
| `reads` | `loading` · `fresh` · `stale` · `refreshing` · `failed` · `caught-up` |

- Copy: `heading`, `detail`, `primary-label`, `action-label` describe the current state (set them with the state); a trailing ` ↗` or a frame that opens OrgX adds the external arrow and ", opens OrgX" to the name. Defaults are the SM3 wording.
- Undo window (`held`): `undo-seconds` (default 10) or `undo-deadline` (epoch ms, so a reload shows the true time left). The ring drains linearly, `{s}` in `detail` ticks in tabular figures, and "Undo available for N seconds" is announced once. Events: `ox-undo`, `ox-undo-expired`.
- Hold to confirm: `hold` (and `hold-ms`, default 1000), for launches only ("Hold to launch"); approvals are a single click. Pointer down or Space/Enter held for the full time fires `ox-confirm` then `ox-primary`; releasing early cancels, a click alone never sends, key repeat is ignored. Reduced motion fills in four still steps.
- The primary locks in the same frame as the press (no double send) until `state` changes. `disabled` keeps the controls but makes them read-only (view only, offline). When the state moves under focus, focus moves to the new control (SM5: failure focuses Retry).
- Events (bubbling, composed): `ox-primary`, `ox-confirm`, `ox-action` (`detail.action`), `ox-undo`, `ox-undo-expired`. Slots `primary` / `action` replace the built-in buttons.

### `<ox-glyph kind tone size label>`

The G1 set: `goal`, `initiative`, `workstream`, `milestone`, `task`, `run`, `decision`, `question`, `artifact`, `receipt`. 24-unit grid, 1.8 stroke. `tone`: muted (default), `amber`, `teal`, `red`, `text`, `current`. Decorative unless `label` is set (`label="auto"` reads the kind). `--ox-glyph-size` sizes every glyph in a container.

### `<ox-avatar agent form size base-url>`

Renders `${baseUrl}/${agent}-${form}-${size}.webp` in a circle with the agent's hue ring, plus a 2x `srcset` when a larger render exists. Alt text is "Eli, working" (the base form reads "Eli"). If the image fails, the agent's initial takes its place in the same footprint and `ox-avatar-fallback` fires.

## Avatar renders

Agents: `pace` (Product, #14b8a6), `eli` (Engineering, #22c55e), `mark` (Marketing, #f97316), `sage` (Sales, #ec4899), `orion` (Operations, #84cc16), `dana` (Design, #a855f7), `xandy` (Orchestrator, #6366f1). Forms: `base`, `strategic`, `proactive`, `working`, `asking`, `verifying`.

Host every render in one folder, named:

```
<agent>-<form>-48.webp     48 x 48
<agent>-<form>-96.webp     96 x 96
<agent>-<form>-192.webp    192 x 192
<agent>-<form>-full.webp   600 x 800 figure
```

and point the elements at it with `base-url` (or `baseUrl` in React), or once per page:

```js
OrgXElements.avatarConfig.baseUrl = 'https://cdn.example.com/orgx/avatars'; // IIFE
import { avatarConfig } from '@useorgx/orgx-ui-kit/elements';               // ESM
```

The default is `https://mcp.useorgx.com/widgets/shared/avatars`. The renders are not part of this package.

## Tokens

`tokens/tokens.json` is the single source: light and dark colors (from the OrgX design canvas), type, radius, space, sizes, motion durations and easings, and agent hues.

The primary button matches the OrgX homepage (`.ox-btn-primary`): `--ox-action` / `--ox-action-rgb` is the fill, `--ox-action-fg` the text, `--ox-action-border` its edge and `--ox-action-hold` the hold fill. `--ox-primary` / `--ox-primary-rgb` is the lime accent for text and tints, and `--ox-focus` the focus ring. Widgets restyle their own accents freely; the kit's primary reads only `--ox-action*`, so it stays lime.

| Token | Dark | Light | Contrast |
| --- | --- | --- | --- |
| `--ox-action-rgb` | `191,255,0` (homepage lime) | `132,204,22` (the app's light-mode lime) | |
| `--ox-action-fg` | `#0b1203` (app `--ox-action-fg`) | `#0b1203` | 15.9:1 dark, 9.7:1 light |
| `--ox-action-border` | `transparent` | `#65a30d` | 3.1:1 on white |
| `--ox-action-hold` | `#65a30d` | `#65a30d` | text 6.2:1 |
| `--ox-primary-rgb` | `191,255,0` | `77,124,15` | 5.0:1 on white (never lime text on white) |
| `--ox-focus` | `rgba(191,255,0,.8)` | `#4d7c0f` | 10.8:1 dark, 5.0:1 light |

Amber (`--ox-warning`, `--ox-edge-amber-rgb`) is reserved for "needs you": the attention line, needs-you chips and glyphs, held and draft states. `npm run build:tokens` writes `dist/tokens.css`, `dist/tokens.js` and `dist/tailwind-preset.cjs`. Edit the JSON, never the outputs.

## Development

```bash
npm install
npm run type-check
npm run build        # tokens, tsc (types + ESM), esbuild bundles
npm test             # vitest + jsdom
open demo/index.html # every element in every state; ?theme=light|dark&avatars=<base url>
```

## 0.1 React surfaces

| Component | Widget type | Target score |
|---|---|---|
| `PreFlightCheck` | Action | ≥ 88 overall, ≥ 92 hierarchy |
| `PlanningCanvas` | Process (marquee) | ≥ 90 overall, ≥ 93 hierarchy |
| `PlanVersionDiff` | Process (Readout) | ≥ 85 overall |
| `LowConfidenceReviewSurface` | Action | ≥ 87 overall, ≥ 90 hierarchy |
| `ParallelRunBoard` | State | ≥ 86 overall, ≥ 85 distinctiveness |
| `ExecutionReceiptsSurface` | Executive Readout | ≥ 86 overall, ≥ 85 distinctiveness |
| `VaultAndBudgetsSurface` | State | ≥ 85 overall, ≥ 90 security-feel |
| `AuditLogSurface` | State | ≥ 86 overall |

These components use Tailwind class names; with the preset above, `iris-*` resolves too. Pair with [`@useorgx/orgx-data`](https://github.com/useorgx/data) for typed contracts and hooks.

## Status

Alpha. Part of the Sovereign Execution initiative (`993cabeb`).
