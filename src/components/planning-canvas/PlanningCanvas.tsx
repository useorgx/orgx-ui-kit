'use client';

/**
 * PlanningCanvas — marquee surface replacing scaffolded-initiative when a
 * plan is in 'draft'. orgx-design Stages 1–5 applied with the STRICTEST
 * design bar in the initiative.
 *
 *   Stage 1 · Classify
 *     - Creation mode · Process widget
 *     - Single-glance: "Does the plan make me feel confident?"
 *     - Attention state: Needs You while draft (approval required) →
 *       Progressing once approved (launched).
 *
 *   Stage 2 · Compose
 *     - Primary focal: left-tree (workstreams + milestones) / right-detail
 *       split pane. Tree selection drives the right pane.
 *     - Sticky LaunchStrip footer with Earned-Approval gate (Approve /
 *       Request Changes) + risk summary.
 *     - Risk-accented workstream nodes: amber ≥ 0.6, red ≥ 0.85.
 *     - Plan-version selector (top-right) for diffing.
 *     - Three type voices: mono eyebrow ('workstream 02 of 05'),
 *       semibold titles, micro metadata.
 *
 *   Stage 3 · Top 3 risks avoided
 *     1. "Workflow-DAG-builder generic" → this is a read/review/approve
 *        surface, NOT drag-and-drop composition. The tree is navigation,
 *        not editing.
 *     2. "Card-within-card" → single outer wrapper; internal sections
 *        use border-top separators only.
 *     3. "Equal-volume everything" → risk-accented nodes stand out;
 *        healthy nodes are neutral; selection state carries lime accent.
 *
 *   Stage 5 · Target ≥ 90 overall, ≥ 93 hierarchy, ≥ 85 distinctiveness.
 */

import { useMemo, useState } from 'react';

import { cn } from '../../lib/utils';

type RiskBand = 'healthy' | 'amber' | 'red';

export type PlanTask = {
  id: string;
  title: string;
  summary?: string | null;
  estimated_hours?: number | null;
};

export type PlanMilestone = {
  id: string;
  title: string;
  description?: string | null;
  sequence: number;
  tasks: PlanTask[];
};

export type PlanWorkstream = {
  id: string;
  name: string;
  summary?: string | null;
  persona?: string | null;
  domain?: string | null;
  risk_score: number;
  risk_band: RiskBand;
  milestones: PlanMilestone[];
};

export type PlanVersion = {
  id: string;
  version: number;
  status: 'draft' | 'approved' | 'archived' | 'superseded';
  authored_at: string;
  approved_at?: string | null;
};

export type PlanCanvasData = {
  initiative_title: string;
  plan: PlanVersion;
  versions: PlanVersion[];
  explain_md: string | null;
  workstreams: PlanWorkstream[];
};

export type PlanningCanvasProps = {
  data: PlanCanvasData;
  onSelectVersion?: (versionId: string) => void;
  onApprove?: (planId: string) => void;
  onRequestChanges?: (planId: string, noteMd: string) => void;
  className?: string;
};

type SelectionKey =
  | { kind: 'workstream'; id: string }
  | { kind: 'milestone'; workstream_id: string; id: string }
  | { kind: 'overview' };

export function PlanningCanvas({
  data,
  onSelectVersion,
  onApprove,
  onRequestChanges,
  className,
}: PlanningCanvasProps) {
  const [selection, setSelection] = useState<SelectionKey>({ kind: 'overview' });
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');

  const isDraft = data.plan.status === 'draft';

  const riskSummary = useMemo(() => {
    const max = data.workstreams.reduce(
      (acc, ws) => (ws.risk_score > acc ? ws.risk_score : acc),
      0
    );
    const reds = data.workstreams.filter((ws) => ws.risk_band === 'red').length;
    const ambers = data.workstreams.filter((ws) => ws.risk_band === 'amber').length;
    return { max, reds, ambers };
  }, [data.workstreams]);

  return (
    <section
      className={cn(
        'rounded-[14px] border border-white/[0.06] bg-[#0A0C14] overflow-hidden flex flex-col',
        className
      )}
      aria-label="Planning canvas"
    >
      <CanvasHeader
        data={data}
        onSelectVersion={onSelectVersion}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-0">
        <TreePane
          workstreams={data.workstreams}
          selection={selection}
          onSelect={setSelection}
        />
        <DetailPane
          data={data}
          selection={selection}
        />
      </div>
      {isDraft && (
        <LaunchStrip
          riskSummary={riskSummary}
          requestingChanges={requestingChanges}
          changeNotes={changeNotes}
          setRequestingChanges={setRequestingChanges}
          setChangeNotes={setChangeNotes}
          onApprove={() => onApprove?.(data.plan.id)}
          onRequestChanges={() => {
            if (changeNotes.trim().length === 0) return;
            onRequestChanges?.(data.plan.id, changeNotes);
            setRequestingChanges(false);
            setChangeNotes('');
          }}
        />
      )}
    </section>
  );
}

function CanvasHeader({
  data,
  onSelectVersion,
}: {
  data: PlanCanvasData;
  onSelectVersion?: (versionId: string) => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/[0.06]">
      <div className="flex items-baseline gap-3 min-w-0">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/45">
          Plan · v{data.plan.version}
        </span>
        <h1 className="text-[15px] font-semibold text-white/95 truncate">
          {data.initiative_title}
        </h1>
        <StatusPill status={data.plan.status} />
      </div>
      {data.versions.length > 1 && onSelectVersion && (
        <label className="flex items-center gap-2 text-[11px] text-white/50">
          <span className="font-mono uppercase tracking-[0.14em] text-white/40">
            Versions
          </span>
          <select
            value={data.plan.id}
            onChange={(e) => onSelectVersion(e.target.value)}
            className="rounded-md border border-white/10 bg-[#0A0C14] px-2 py-1 text-white/80"
          >
            {data.versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version} · {v.status}
              </option>
            ))}
          </select>
        </label>
      )}
    </header>
  );
}

function StatusPill({ status }: { status: PlanVersion['status'] }) {
  const tone =
    status === 'draft'
      ? 'border-amber-400/30 text-amber-300/85 bg-amber-400/[0.04]'
      : status === 'approved'
        ? 'border-lime-300/30 text-lime-300/85 bg-lime-300/[0.04]'
        : 'border-white/10 text-white/55 bg-white/[0.02]';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em]',
        tone
      )}
    >
      {status}
    </span>
  );
}

function TreePane({
  workstreams,
  selection,
  onSelect,
}: {
  workstreams: PlanWorkstream[];
  selection: SelectionKey;
  onSelect: (s: SelectionKey) => void;
}) {
  return (
    <aside className="border-r border-white/[0.06] py-4 px-2 min-h-[420px]">
      <TreeNode
        kind="overview"
        label="Overview"
        selected={selection.kind === 'overview'}
        onClick={() => onSelect({ kind: 'overview' })}
      />
      {workstreams.map((ws, i) => (
        <div key={ws.id}>
          <TreeNode
            kind="workstream"
            label={ws.name}
            eyebrow={`ws ${String(i + 1).padStart(2, '0')} of ${String(workstreams.length).padStart(2, '0')}`}
            riskBand={ws.risk_band}
            selected={selection.kind === 'workstream' && selection.id === ws.id}
            onClick={() => onSelect({ kind: 'workstream', id: ws.id })}
          />
          <div className="pl-4 border-l border-white/[0.04] ml-3">
            {ws.milestones.map((ms) => (
              <TreeNode
                key={ms.id}
                kind="milestone"
                label={ms.title}
                eyebrow={`${ms.tasks.length} task${ms.tasks.length === 1 ? '' : 's'}`}
                selected={
                  selection.kind === 'milestone' && selection.id === ms.id
                }
                onClick={() =>
                  onSelect({
                    kind: 'milestone',
                    workstream_id: ws.id,
                    id: ms.id,
                  })
                }
              />
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function TreeNode({
  kind,
  label,
  eyebrow,
  riskBand,
  selected,
  onClick,
}: {
  kind: 'overview' | 'workstream' | 'milestone';
  label: string;
  eyebrow?: string;
  riskBand?: RiskBand;
  selected: boolean;
  onClick: () => void;
}) {
  const riskDot =
    riskBand === 'red'
      ? 'bg-[#FF6B88] shadow-[0_0_6px_rgba(255,107,136,0.5)]'
      : riskBand === 'amber'
        ? 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
        : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-md px-3 py-2 transition-colors',
        selected
          ? 'bg-lime-300/[0.06] border border-lime-300/30'
          : 'border border-transparent hover:bg-white/[0.02]'
      )}
    >
      <div className="flex items-center gap-2">
        {riskDot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', riskDot)} />}
        <span
          className={cn(
            'text-[12px] truncate',
            kind === 'milestone' ? 'text-white/65' : 'text-white/90 font-semibold'
          )}
        >
          {label}
        </span>
      </div>
      {eyebrow && (
        <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-white/35 mt-0.5 truncate">
          {eyebrow}
        </div>
      )}
    </button>
  );
}

function DetailPane({
  data,
  selection,
}: {
  data: PlanCanvasData;
  selection: SelectionKey;
}) {
  if (selection.kind === 'overview') {
    return <Overview data={data} />;
  }
  if (selection.kind === 'workstream') {
    const ws = data.workstreams.find((w) => w.id === selection.id);
    if (!ws) return null;
    return <WorkstreamDetail workstream={ws} />;
  }
  const ws = data.workstreams.find((w) => w.id === selection.workstream_id);
  const ms = ws?.milestones.find((m) => m.id === selection.id);
  if (!ws || !ms) return null;
  return <MilestoneDetail workstream={ws} milestone={ms} />;
}

function Overview({ data }: { data: PlanCanvasData }) {
  const totalMilestones = data.workstreams.reduce(
    (a, ws) => a + ws.milestones.length,
    0
  );
  const totalTasks = data.workstreams.reduce(
    (a, ws) => a + ws.milestones.reduce((b, m) => b + m.tasks.length, 0),
    0
  );
  return (
    <article className="p-6">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/45">
          Overview
        </span>
        <span className="text-[11px] text-white/50">
          {data.workstreams.length} workstreams · {totalMilestones} milestones ·{' '}
          {totalTasks} tasks
        </span>
      </div>
      {data.explain_md ? (
        <p className="whitespace-pre-wrap text-[13px] text-white/85 leading-relaxed border-l-2 border-white/10 pl-4">
          {data.explain_md}
        </p>
      ) : (
        <p className="text-[12px] text-white/45">No plan rationale generated yet.</p>
      )}
    </article>
  );
}

function WorkstreamDetail({ workstream }: { workstream: PlanWorkstream }) {
  const riskClass =
    workstream.risk_band === 'red'
      ? 'text-[#FF6B88]'
      : workstream.risk_band === 'amber'
        ? 'text-amber-300'
        : 'text-lime-300/85';
  return (
    <article className="p-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/45">
          Workstream
        </span>
        {workstream.persona && (
          <span className="text-[10px] text-white/40">· Persona {workstream.persona}</span>
        )}
        {workstream.domain && (
          <span className="text-[10px] text-white/40">· Domain {workstream.domain}</span>
        )}
      </div>
      <h2 className="text-[20px] font-semibold text-white/95 tracking-tight">
        {workstream.name}
      </h2>
      <div className="mt-3 flex items-baseline gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/40">
            Risk score
          </span>
          <div className={cn('text-[22px] font-semibold tabular-nums', riskClass)}>
            {workstream.risk_score.toFixed(2)}
          </div>
        </div>
        <div className="text-[11px] text-white/50 uppercase tracking-[0.12em]">
          {workstream.risk_band === 'red'
            ? 'High risk — re-check agent fit + skill confidence'
            : workstream.risk_band === 'amber'
              ? 'Elevated — approve with eyes open'
              : 'Healthy'}
        </div>
      </div>
      {workstream.summary && (
        <p className="mt-4 text-[13px] text-white/80 leading-relaxed border-l-2 border-white/10 pl-4">
          {workstream.summary}
        </p>
      )}
      <div className="mt-6 border-t border-white/[0.06] pt-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/45 mb-2">
          Milestones
        </div>
        <ul className="flex flex-col gap-2">
          {workstream.milestones.map((m) => (
            <li
              key={m.id}
              className="rounded-md border border-white/[0.06] bg-white/[0.01] px-3 py-2"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-white/85 font-semibold">
                  {m.title}
                </span>
                <span className="text-[10px] text-white/45">
                  {m.tasks.length} task{m.tasks.length === 1 ? '' : 's'}
                </span>
              </div>
              {m.description && (
                <div className="text-[11px] text-white/55 mt-1 line-clamp-2">
                  {m.description}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function MilestoneDetail({
  workstream,
  milestone,
}: {
  workstream: PlanWorkstream;
  milestone: PlanMilestone;
}) {
  return (
    <article className="p-6">
      <div className="flex items-baseline gap-2 mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-white/45">
        <span>{workstream.name}</span>
        <span>·</span>
        <span>Milestone</span>
      </div>
      <h2 className="text-[18px] font-semibold text-white/95 tracking-tight">
        {milestone.title}
      </h2>
      {milestone.description && (
        <p className="mt-3 whitespace-pre-wrap text-[13px] text-white/80 leading-relaxed border-l-2 border-white/10 pl-4">
          {milestone.description}
        </p>
      )}
      <div className="mt-6 border-t border-white/[0.06] pt-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/45 mb-2">
          Tasks
        </div>
        {milestone.tasks.length === 0 ? (
          <div className="text-[11px] text-white/40">
            No tasks generated yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {milestone.tasks.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-white/[0.06] bg-white/[0.01] px-3 py-2"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-white/85">{t.title}</span>
                  {t.estimated_hours && (
                    <span className="text-[10px] font-mono text-white/45 tabular-nums">
                      ~{t.estimated_hours}h
                    </span>
                  )}
                </div>
                {t.summary && (
                  <div className="text-[11px] text-white/55 mt-1 line-clamp-2">
                    {t.summary}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function LaunchStrip({
  riskSummary,
  requestingChanges,
  changeNotes,
  setRequestingChanges,
  setChangeNotes,
  onApprove,
  onRequestChanges,
}: {
  riskSummary: { max: number; reds: number; ambers: number };
  requestingChanges: boolean;
  changeNotes: string;
  setRequestingChanges: (v: boolean) => void;
  setChangeNotes: (v: string) => void;
  onApprove: () => void;
  onRequestChanges: () => void;
}) {
  return (
    <footer className="sticky bottom-0 z-10 bg-[#0A0C14]/95 backdrop-blur border-t border-white/[0.08] px-6 py-4">
      {!requestingChanges ? (
        <div className="flex items-center gap-4">
          <RiskRollup summary={riskSummary} />
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRequestingChanges(true)}
              className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-[12px] font-semibold text-white/75 hover:text-white hover:border-white/25"
            >
              Request changes
            </button>
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex items-center rounded-full bg-lime-300 text-black px-5 py-2 text-[12px] font-semibold shadow-[0_6px_22px_rgba(191,255,0,0.22)] hover:brightness-110"
            >
              Approve plan
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-mono uppercase tracking-[0.14em] text-white/50">
            What needs to change?
          </label>
          <textarea
            autoFocus
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            placeholder="Be specific — 'split workstream 2 into design + impl' or 'drop milestone 3-5'."
            rows={3}
            className="w-full rounded-md border border-white/10 bg-[#0A0C14] px-3 py-2 text-[13px] text-white/90 placeholder-white/30"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRequestingChanges(false);
                setChangeNotes('');
              }}
              className="inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onRequestChanges}
              disabled={changeNotes.trim().length === 0}
              className="inline-flex items-center rounded-full bg-amber-300 text-black px-4 py-1.5 text-[11px] font-semibold shadow-[0_6px_22px_rgba(251,191,36,0.22)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send request
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}

function RiskRollup({
  summary,
}: {
  summary: { max: number; reds: number; ambers: number };
}) {
  const parts: string[] = [];
  if (summary.reds) parts.push(`${summary.reds} high-risk`);
  if (summary.ambers) parts.push(`${summary.ambers} elevated`);
  const label = parts.length ? parts.join(' · ') : 'All workstreams healthy';
  const dotTone =
    summary.reds > 0
      ? 'bg-[#FF6B88]'
      : summary.ambers > 0
        ? 'bg-amber-300'
        : 'bg-lime-300';
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-1.5 w-1.5 rounded-full', dotTone)} />
      <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-white/45">
        Risk
      </span>
      <span className="text-[12px] text-white/80">{label}</span>
    </div>
  );
}
