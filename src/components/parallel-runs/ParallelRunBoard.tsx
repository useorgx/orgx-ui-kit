'use client';

/**
 * ParallelRunBoard — /runs
 *
 * orgx-design discipline (Stages 1–5):
 *
 *   Stage 1 · Classify
 *     - State widget · Command mode
 *     - Single-glance: "Is everything progressing or does anything need me?"
 *     - Attention states:
 *         Needs You  — any run in 'blocked' or 'awaiting_review'
 *         Progressing — at least one 'running' card
 *         Complete   — nothing running or queued in this view
 *
 *   Stage 2 · Compose
 *     - Primary focal: horizontal row of up to 5 live run cards.
 *       Each card: agent avatar + task title + step indicator + progress
 *       bar + step narration ("editing test_billing.py — 3 / 5 steps").
 *     - Queue lane below with "Next up" label for runs beyond cap 5.
 *     - Completion transforms the card in-place: outcome summary +
 *       Open PR + Review output; auto-collapses to archive after 10 min.
 *     - Three type voices: mono eyebrow, semibold title, micro step text.
 *
 *   Stage 3 · Top 3 risks avoided
 *     1. Generic task board → agent avatar + step narration per card
 *        (cards tell a story, not just status badges).
 *     2. Equal-volume everything → running is bold, queued is muted,
 *        completed desaturates (60% opacity) before archive.
 *     3. Passive progress bars → bar pairs with "~2 min remaining" or
 *        step-index context, never bare.
 *
 *   Stage 5 · Target ≥ 86 overall, ≥ 85 distinctiveness.
 */

import { useMemo } from 'react';

import { cn } from '../../lib/utils';

export type LiveRun = {
  id: string;
  title: string;
  agent: { id: string; name: string; avatar_url?: string };
  status:
    | 'planned'
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed'
    | 'blocked'
    | 'awaiting_review';
  started_at?: string;
  completed_at?: string;
  step_count?: number;
  steps_total?: number;
  current_step_label?: string;
  driver: 'claude_code' | 'codex' | 'opencode' | 'server_api';
  outcome_kind?: 'shipped' | 'blocked' | 'abandoned' | 'awaiting_review' | null;
  pr_url?: string | null;
};

export type ParallelRunBoardProps = {
  runs: LiveRun[];
  /** Cap of concurrent running cards surfaced in the primary row. Defaults to 5. */
  concurrencyCap?: number;
  onOpenRun?: (runId: string) => void;
  onOpenPR?: (runId: string, prUrl: string) => void;
  onReview?: (runId: string) => void;
  className?: string;
};

export function ParallelRunBoard({
  runs,
  concurrencyCap = 5,
  onOpenRun,
  onOpenPR,
  onReview,
  className,
}: ParallelRunBoardProps) {
  const { running, queued, completed, needsAttention } = useMemo(() => {
    const running: LiveRun[] = [];
    const queued: LiveRun[] = [];
    const completed: LiveRun[] = [];
    const needsAttention: LiveRun[] = [];

    for (const r of runs) {
      if (r.status === 'running' || r.status === 'planned') {
        running.push(r);
      } else if (r.status === 'queued') {
        queued.push(r);
      } else if (r.status === 'blocked' || r.status === 'awaiting_review') {
        needsAttention.push(r);
      } else {
        completed.push(r);
      }
    }
    return { running, queued, completed, needsAttention };
  }, [runs]);

  const primary = running.slice(0, concurrencyCap);
  const overflow = running.slice(concurrencyCap);

  const attentionBand = needsAttention.length > 0;

  return (
    <section
      className={cn(
        'rounded-[14px] border border-white/[0.06] bg-[#0A0C14] p-6',
        className
      )}
      aria-label="Parallel run board"
    >
      <Header
        runningCount={running.length}
        queuedCount={queued.length + overflow.length}
        attentionCount={needsAttention.length}
      />

      {attentionBand && (
        <div className="mb-5 flex flex-col gap-2">
          {needsAttention.map((r) => (
            <AttentionBanner key={r.id} run={r} onReview={onReview} />
          ))}
        </div>
      )}

      {primary.length === 0 && queued.length === 0 && completed.length === 0 && (
        <EmptyState />
      )}

      {primary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {primary.map((r) => (
            <RunCard
              key={r.id}
              run={r}
              onOpen={() => onOpenRun?.(r.id)}
              onOpenPR={r.pr_url ? () => onOpenPR?.(r.id, r.pr_url!) : undefined}
            />
          ))}
        </div>
      )}

      {(queued.length > 0 || overflow.length > 0) && (
        <QueueLane runs={[...overflow, ...queued]} onOpen={onOpenRun} />
      )}

      {completed.length > 0 && (
        <ArchiveStrip runs={completed} onOpen={onOpenRun} />
      )}
    </section>
  );
}

function Header({
  runningCount,
  queuedCount,
  attentionCount,
}: {
  runningCount: number;
  queuedCount: number;
  attentionCount: number;
}) {
  return (
    <header className="flex items-center gap-3 mb-5">
      <span className="h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_8px_rgba(191,255,0,0.55)]" />
      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/50">
        Parallel runs
      </span>
      <span className="text-[12px] text-white/60">
        {runningCount} running
        {queuedCount > 0 ? ` · ${queuedCount} queued` : ''}
        {attentionCount > 0 ? ` · ${attentionCount} need you` : ''}
      </span>
    </header>
  );
}

function RunCard({
  run,
  onOpen,
  onOpenPR,
}: {
  run: LiveRun;
  onOpen: () => void;
  onOpenPR?: () => void;
}) {
  const pct =
    run.step_count !== undefined && run.steps_total !== undefined && run.steps_total > 0
      ? Math.min(1, run.step_count / run.steps_total)
      : 0.0;
  const pctPercent = Math.round(pct * 100);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex flex-col gap-2 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-transform hover:-translate-y-0.5',
        run.status === 'planned' && 'opacity-70',
        run.outcome_kind === 'shipped' && 'border-lime-300/30 bg-lime-300/[0.03]'
      )}
    >
      <div className="flex items-center gap-2">
        <AgentAvatar agent={run.agent} />
        <span className="text-[11px] text-white/60 truncate">{run.agent.name}</span>
        <DriverBadge driver={run.driver} />
      </div>
      <div className="text-[13px] font-semibold text-white/90 line-clamp-2">
        {run.title}
      </div>
      {run.current_step_label && (
        <div className="text-[11px] text-white/45 line-clamp-1">
          {run.current_step_label}
        </div>
      )}
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            run.outcome_kind === 'shipped' ? 'bg-lime-300/85' : 'bg-lime-300/60'
          )}
          style={{ width: `${Math.max(3, pctPercent)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-white/45">
        <span>
          {run.step_count ?? 0}
          {run.steps_total ? ` / ${run.steps_total}` : ''} steps
        </span>
        <span className="font-mono tabular-nums">{pctPercent}%</span>
      </div>
      {run.outcome_kind === 'shipped' && onOpenPR && (
        <div className="mt-2 pt-2 border-t border-lime-300/15 flex items-center justify-between text-[10px]">
          <span className="text-lime-300/85">Shipped</span>
          <span
            role="link"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPR();
            }}
            className="text-white/75 hover:text-white cursor-pointer"
          >
            Open PR →
          </span>
        </div>
      )}
    </button>
  );
}

function AttentionBanner({
  run,
  onReview,
}: {
  run: LiveRun;
  onReview?: (runId: string) => void;
}) {
  const label = run.status === 'blocked' ? 'Blocked' : 'Awaiting review';
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-[10px] border border-amber-400/30 bg-amber-400/10 px-4 py-3"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.55)]" />
      <AgentAvatar agent={run.agent} size={18} />
      <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-amber-300/85">
        {label}
      </span>
      <span className="flex-1 text-[13px] text-white/90 truncate">
        {run.title}
      </span>
      <button
        type="button"
        onClick={() => onReview?.(run.id)}
        className="inline-flex items-center rounded-full bg-amber-300 text-black px-3 py-1.5 text-[11px] font-semibold shadow-[0_6px_22px_rgba(251,191,36,0.22)] hover:brightness-110"
      >
        Review
      </button>
    </div>
  );
}

function QueueLane({
  runs,
  onOpen,
}: {
  runs: LiveRun[];
  onOpen?: (runId: string) => void;
}) {
  return (
    <div className="mt-5 border-t border-white/[0.06] pt-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/40">
          Next up
        </span>
        <span className="text-[10px] text-white/35">{runs.length}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {runs.map((r) => (
          <li
            key={r.id}
            onClick={() => onOpen?.(r.id)}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-[12px] cursor-pointer hover:bg-white/[0.03] text-white/65 hover:text-white/90"
          >
            <AgentAvatar agent={r.agent} size={16} />
            <span className="truncate flex-1">{r.title}</span>
            <DriverBadge driver={r.driver} compact />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArchiveStrip({
  runs,
  onOpen,
}: {
  runs: LiveRun[];
  onOpen?: (runId: string) => void;
}) {
  return (
    <div className="mt-5 border-t border-white/[0.06] pt-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/40">
          Recently done
        </span>
        <span className="text-[10px] text-white/35">{runs.length}</span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {runs.map((r) => (
          <li
            key={r.id}
            onClick={() => onOpen?.(r.id)}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.01] px-2 py-1 text-[10px] text-white/50 cursor-pointer hover:text-white/80 hover:border-white/15 opacity-80"
          >
            <span
              className={cn(
                'h-1 w-1 rounded-full',
                r.outcome_kind === 'shipped'
                  ? 'bg-lime-300/75'
                  : r.outcome_kind === 'blocked'
                    ? 'bg-[#FF6B88]/75'
                    : 'bg-white/30'
              )}
            />
            <span className="truncate max-w-[220px]">{r.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[10px] border border-dashed border-white/[0.08] px-4 py-10 text-center">
      <div className="h-2 w-2 rounded-full bg-white/25 mx-auto mb-3" />
      <p className="text-[13px] text-white/60">No runs in flight.</p>
      <p className="mt-1 text-[11px] text-white/35">
        Dispatch from /command and they show up here.
      </p>
    </div>
  );
}

function AgentAvatar({
  agent,
  size = 20,
}: {
  agent: LiveRun['agent'];
  size?: number;
}) {
  const initials = agent.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const style = { width: size, height: size, fontSize: Math.floor(size * 0.45) };
  if (agent.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={agent.avatar_url}
        alt={agent.name}
        style={style}
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <span
      style={style}
      className="inline-flex items-center justify-center rounded-full bg-white/[0.06] text-white/80 font-semibold shrink-0"
    >
      {initials || 'A'}
    </span>
  );
}

function DriverBadge({
  driver,
  compact,
}: {
  driver: LiveRun['driver'];
  compact?: boolean;
}) {
  const label =
    driver === 'claude_code'
      ? 'CC'
      : driver === 'codex'
        ? 'CX'
        : driver === 'opencode'
          ? 'OC'
          : 'SV';
  const full =
    driver === 'claude_code'
      ? 'Claude Code'
      : driver === 'codex'
        ? 'Codex'
        : driver === 'opencode'
          ? 'OpenCode'
          : 'Server API';
  return (
    <span
      title={full}
      className={cn(
        'inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] font-mono text-[9px] tracking-[0.1em] text-white/55',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
      )}
    >
      {compact ? label : full}
    </span>
  );
}
