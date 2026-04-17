# @orgx/ui-kit

React components + tokens for every OrgX surface. Each component passes the orgx-design Stage 1–5 discipline before it lands.

## Sovereign Execution surfaces (v0.1.0-alpha)

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

## Install

```bash
npm add @orgx/ui-kit
# peer deps
npm add react react-dom
```

## Usage

```tsx
import { PreFlightCheck } from '@orgx/ui-kit';

<PreFlightCheck
  matches={matches}
  enforcement="advisory"
  onResolved={({ confirmed, skipped }) => dispatch(...)}
/>
```

Components accept plain data props. Pair with [`@orgx/data`](https://github.com/useorgx/data) for typed contracts + hooks that fetch those props.

## Styling

Components use Tailwind class names against the OrgX token palette (lime-300 for primary, amber-300 for attention, iris-400 for creation, etc.). Consumers must have Tailwind configured; the class names are applied directly rather than via a CSS-in-JS runtime so the tree shakes cleanly.

## Status

Alpha — part of the Sovereign Execution initiative (`993cabeb`).
