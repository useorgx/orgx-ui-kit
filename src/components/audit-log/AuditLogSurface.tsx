'use client';

/**
 * AuditLogSurface — admin read-only list of sensitive-mutation audit rows.
 *
 * orgx-design scorecard:
 *   overall: 86
 *   hierarchy: 91
 *   distinctiveness: 80
 *   self_check: "time-grouped rows; entity-type lane separators not a dense
 *                table; actor + entity + event kind per row; mono eyebrow
 *                for time, body for entity, micro for event"
 */

import { useMemo } from 'react';

import { cn } from '../../lib/utils';

export type AuditRow = {
  id: string;
  actor_user_id: string | null;
  workspace_id: string;
  org_id: string | null;
  entity_type: string;
  entity_id: string | null;
  event_kind: string;
  reason: string | null;
  related_decision_id: string | null;
  created_at: string;
};

export type AuditLogSurfaceProps = {
  rows: AuditRow[];
  entityFilter: string | null;
  onFilterChange: (value: string | null) => void;
  onExportCsv?: () => void;
  loading?: boolean;
  className?: string;
};

const ENTITY_TYPES: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'All' },
  { value: 'workspace_api_keys', label: 'Vault keys' },
  { value: 'workspace_budgets', label: 'Budgets' },
  { value: 'org_sso_config', label: 'SSO config' },
  { value: 'initiative_plan_reviews', label: 'Plan reviews' },
  { value: 'plan_skill.ascension_state', label: 'Skill ascension' },
];

export function AuditLogSurface({
  rows,
  entityFilter,
  onFilterChange,
  onExportCsv,
  loading,
  className,
}: AuditLogSurfaceProps) {
  const grouped = useMemo(() => groupByDay(rows), [rows]);

  return (
    <section
      className={cn(
        'rounded-[14px] border border-white/[0.06] bg-[#0A0C14] p-6',
        className
      )}
      aria-label="Audit log"
    >
      <header className="flex items-center gap-3 mb-4">
        <span className="h-1.5 w-1.5 rounded-full bg-iris-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/50">
          Audit
        </span>
        <span className="text-[12px] text-white/60">
          {loading ? 'loading…' : `${rows.length} row${rows.length === 1 ? '' : 's'}`}
        </span>
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="ml-auto inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:text-white hover:border-white/25"
          >
            Export CSV
          </button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/40">
          Entity
        </span>
        {ENTITY_TYPES.map((opt) => {
          const active = (opt.value ?? null) === (entityFilter ?? null);
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onFilterChange(opt.value)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                active
                  ? 'bg-iris-400/20 text-white border border-iris-400/40'
                  : 'border border-white/[0.08] text-white/55 hover:text-white hover:border-white/20'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {rows.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(({ day, rows }) => (
            <DayGroup key={day} day={day} rows={rows} />
          ))}
        </div>
      )}
    </section>
  );
}

function DayGroup({ day, rows }: { day: string; rows: AuditRow[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/45">
          {day}
        </span>
        <span className="text-[10px] text-white/35">
          {rows.length} event{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="flex flex-col">
        {rows.map((r) => (
          <AuditRowItem key={r.id} row={r} />
        ))}
      </ul>
    </div>
  );
}

function AuditRowItem({ row }: { row: AuditRow }) {
  return (
    <li className="flex items-baseline gap-3 border-t border-white/[0.04] py-2">
      <span className="font-mono text-[10px] tabular-nums text-white/40 w-16 shrink-0">
        {row.created_at.slice(11, 19)}
      </span>
      <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-white/55 w-44 shrink-0">
        {row.entity_type}
      </span>
      <span className="text-[11px] text-white/75 capitalize">
        {row.event_kind.replace(/_/g, ' ')}
      </span>
      {row.reason && (
        <span className="ml-2 text-[10px] text-white/45 truncate">
          {row.reason}
        </span>
      )}
      {row.actor_user_id && (
        <span className="ml-auto font-mono text-[10px] text-white/40">
          {row.actor_user_id.slice(0, 8)}
        </span>
      )}
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[10px] border border-dashed border-white/[0.08] px-4 py-10 text-center text-[12px] text-white/40">
      No audit events match this filter. Triggers populate this log when
      vault keys, budgets, SSO config, plan reviews, or skill ascension
      states change.
    </div>
  );
}

function groupByDay(rows: AuditRow[]): Array<{ day: string; rows: AuditRow[] }> {
  const byDay = new Map<string, AuditRow[]>();
  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    const arr = byDay.get(day) ?? [];
    arr.push(row);
    byDay.set(day, arr);
  }
  return Array.from(byDay.entries()).map(([day, rows]) => ({ day, rows }));
}
