/**
 * @useorgx/orgx-ui-kit — public entry.
 *
 * React components + tokens for every OrgX surface. Each component passes
 * the orgx-design Stage 1–5 discipline; the upstream monorepo CI enforces
 * a scorecard on every PR touching this package.
 */

export { PreFlightCheck } from './components/preflight/PreFlightCheck';
export type { PreFlightCheckProps } from './components/preflight/PreFlightCheck';

export { PlanningCanvas } from './components/planning-canvas/PlanningCanvas';
export type {
  PlanningCanvasProps,
  PlanCanvasData,
  PlanVersion,
  PlanWorkstream,
  PlanMilestone,
  PlanTask,
} from './components/planning-canvas/PlanningCanvas';
export { PlanVersionDiff } from './components/planning-canvas/PlanVersionDiff';
export type { PlanVersionDiffProps } from './components/planning-canvas/PlanVersionDiff';

export { LowConfidenceReviewSurface } from './components/reviews/LowConfidenceReviewSurface';
export type {
  LowConfidenceReviewSurfaceProps,
  ReviewRow,
} from './components/reviews/LowConfidenceReviewSurface';

export { ParallelRunBoard } from './components/parallel-runs/ParallelRunBoard';
export type {
  ParallelRunBoardProps,
  LiveRun,
} from './components/parallel-runs/ParallelRunBoard';

export { ExecutionReceiptsSurface } from './components/execution-receipts/ExecutionReceiptsSurface';
export type {
  ExecutionReceiptsSurfaceProps,
  ReceiptRow,
} from './components/execution-receipts/ExecutionReceiptsSurface';

export { VaultAndBudgetsSurface } from './components/vault/VaultAndBudgetsSurface';
export type {
  VaultAndBudgetsSurfaceProps,
  VaultProviderRow,
  VaultBudgetRow,
  VaultPendingDecision,
} from './components/vault/VaultAndBudgetsSurface';

export { AuditLogSurface } from './components/audit-log/AuditLogSurface';
export type {
  AuditLogSurfaceProps,
  AuditRow,
} from './components/audit-log/AuditLogSurface';

/** Bring the shared PreFlightMatch type along for consumers. */
export type { PreFlightMatch } from './lib/preflight-types';

/** Classname helper exported for consumers that want to extend. */
export { cn } from './lib/utils';
