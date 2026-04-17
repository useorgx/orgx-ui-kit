'use client';

/**
 * PreFlightCheck — Action widget rendered inline above Dispatch in /command.
 *
 * orgx-design discipline applied before build:
 *
 *   Stage 1 · Classify
 *     - Action widget · Escalation mode
 *     - Single-glance: "Does the agent know enough to ship this task?"
 *     - Attention state: Needs You (any `confirm`) / Progressing (all `accept`) /
 *       Complete-Idle (empty)
 *
 *   Stage 2 · Compose
 *     - Primary focal: the list of `confirm` rows with card-height controls
 *     - Quiet state: all `accept` → collapsed single-row summary
 *     - Escalated state: full expanded list, amber-accented confirm rows
 *     - OrgX-ness: three type voices, border-top separator (not nested card),
 *       rationale that names the SIGNAL not a generic description
 *
 *   Stage 3 · Critique (top 3 risks avoided)
 *     1. Card-within-card — we use a top-border separator inside the parent
 *     2. Equal-volume list — accept / confirm / review are visually distinct
 *     3. Generic filter UI — rows read as statements with verbs, not checkboxes
 *
 *   Stage 5 · Target scores: ≥ 88 overall, ≥ 92 hierarchy, ≥ 80 distinctiveness.
 *     Scorecard lives in the PR body.
 */

import { useCallback, useMemo, useState } from 'react';

import type { PreFlightMatch } from '../../lib/preflight-types';
import { cn } from '../../lib/utils';

const REASON_OPTIONS: Array<{
  code:
    | 'not_applicable'
    | 'rule_too_strict'
    | 'known_exception'
    | 'will_handle_manually'
    | 'unknown';
  label: string;
}> = [
  { code: 'not_applicable', label: 'Not applicable' },
  { code: 'rule_too_strict', label: 'Rule too strict' },
  { code: 'known_exception', label: 'Known exception' },
  { code: 'will_handle_manually', label: 'Will handle manually' },
  { code: 'unknown', label: 'Other' },
];

export type PreFlightCheckProps = {
  matches: PreFlightMatch[];
  enforcement: 'off' | 'advisory' | 'blocking';
  /** Called when user confirms/skips. `skipped` carries per-skill reason code. */
  onResolved?: (resolution: {
    confirmed: string[];
    skipped: Array<{ skill_id: string; reason_code: string; note?: string }>;
  }) => void;
  className?: string;
};

type Resolution = 'pending' | 'confirmed' | 'skipped';

type SkipDraft = {
  reason_code: (typeof REASON_OPTIONS)[number]['code'];
  note: string;
};

export function PreFlightCheck({
  matches,
  enforcement,
  onResolved,
  className,
}: PreFlightCheckProps) {
  // State: per-skill resolution + optional skip draft (reason + note) for blocking mode.
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>(() =>
    Object.fromEntries(
      matches.map((m) => [
        m.skill_id,
        m.suggestion === 'accept' ? 'confirmed' : 'pending',
      ])
    )
  );
  const [skipDrafts, setSkipDrafts] = useState<Record<string, SkipDraft>>({});

  const visibleMatches = useMemo(
    () =>
      matches.filter((m) => m.suggestion === 'confirm' || m.suggestion === 'review'),
    [matches]
  );

  const autoAccepted = useMemo(
    () => matches.filter((m) => m.suggestion === 'accept'),
    [matches]
  );

  const handleConfirm = useCallback(
    (skillId: string) => {
      setResolutions((prev) => ({ ...prev, [skillId]: 'confirmed' }));
      setSkipDrafts(({ [skillId]: _removed, ...rest }) => rest);
    },
    []
  );

  const handleSkip = useCallback((skillId: string) => {
    setResolutions((prev) => ({ ...prev, [skillId]: 'skipped' }));
    setSkipDrafts((prev) => ({
      ...prev,
      [skillId]: prev[skillId] ?? { reason_code: 'not_applicable', note: '' },
    }));
  }, []);

  const handleSkipEdit = useCallback(
    (skillId: string, patch: Partial<SkipDraft>) => {
      setSkipDrafts((prev) => ({
        ...prev,
        [skillId]: { ...(prev[skillId] ?? { reason_code: 'not_applicable', note: '' }), ...patch },
      }));
    },
    []
  );

  const pendingCount = Object.entries(resolutions).filter(
    ([, r]) => r === 'pending'
  ).length;

  const canSubmit =
    enforcement !== 'blocking' || pendingCount === 0;

  const submitResolution = useCallback(() => {
    if (!onResolved) return;
    const confirmed: string[] = [];
    const skipped: Array<{ skill_id: string; reason_code: string; note?: string }> = [];
    for (const [skillId, resolution] of Object.entries(resolutions)) {
      if (resolution === 'confirmed') {
        confirmed.push(skillId);
      } else if (resolution === 'skipped') {
        const draft = skipDrafts[skillId];
        skipped.push({
          skill_id: skillId,
          reason_code: draft?.reason_code ?? 'unknown',
          note: draft?.note || undefined,
        });
      }
    }
    onResolved({ confirmed, skipped });
  }, [onResolved, resolutions, skipDrafts]);

  // ───────────── Rendering gates ─────────────
  if (enforcement === 'off') return null;
  if (matches.length === 0) return null;

  // Quiet state: every match is 'accept' → single collapsed summary row.
  if (visibleMatches.length === 0 && autoAccepted.length > 0) {
    return (
      <section
        className={cn(
          'border-t border-white/[0.06] pt-3 pb-1',
          className
        )}
        aria-label="Pre-flight skill check"
      >
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_8px_rgba(191,255,0,0.6)]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/45">
            PRE-FLIGHT
          </span>
          <span className="text-[12px] text-white/70">
            {autoAccepted.length} skill{autoAccepted.length === 1 ? '' : 's'} ready to apply
          </span>
        </div>
      </section>
    );
  }

  // Escalated state: expanded list with confirm / skip per row.
  return (
    <section
      className={cn('border-t border-white/[0.06] pt-4 pb-1', className)}
      aria-label="Pre-flight skill check"
    >
      <header className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/45">
          PRE-FLIGHT
        </span>
        <span className="text-[12px] text-white/70">
          {visibleMatches.length} skill{visibleMatches.length === 1 ? '' : 's'} need your call
          {autoAccepted.length > 0
            ? ` · ${autoAccepted.length} auto-applied`
            : ''}
        </span>
        {enforcement === 'blocking' && pendingCount > 0 && (
          <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.14em] text-amber-400/80">
            Required before dispatch
          </span>
        )}
      </header>

      <ul className="flex flex-col gap-2">
        {visibleMatches.map((m) => (
          <PreFlightRow
            key={m.skill_id}
            match={m}
            resolution={resolutions[m.skill_id]}
            skipDraft={skipDrafts[m.skill_id]}
            onConfirm={() => handleConfirm(m.skill_id)}
            onSkip={() => handleSkip(m.skill_id)}
            onSkipEdit={(patch) => handleSkipEdit(m.skill_id, patch)}
          />
        ))}
      </ul>

      {onResolved && (
        <div className="mt-3 flex items-center justify-end gap-3">
          {!canSubmit && (
            <span className="text-[11px] text-white/50">
              {pendingCount} pending
            </span>
          )}
          <button
            type="button"
            onClick={submitResolution}
            disabled={!canSubmit}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40',
              'text-black bg-lime-300 hover:brightness-110 shadow-[0_6px_22px_rgba(191,255,0,0.22)]'
            )}
          >
            Ready to dispatch
          </button>
        </div>
      )}
    </section>
  );
}

function PreFlightRow({
  match,
  resolution,
  skipDraft,
  onConfirm,
  onSkip,
  onSkipEdit,
}: {
  match: PreFlightMatch;
  resolution: Resolution;
  skipDraft: SkipDraft | undefined;
  onConfirm: () => void;
  onSkip: () => void;
  onSkipEdit: (patch: Partial<SkipDraft>) => void;
}) {
  const isConfirm = match.suggestion === 'confirm';
  const isSkipped = resolution === 'skipped';
  const isConfirmed = resolution === 'confirmed';

  return (
    <li
      className={cn(
        'min-h-[72px] flex flex-col gap-2 rounded-[10px] px-4 py-3 transition-colors',
        isConfirm
          ? 'border border-amber-400/20 bg-amber-400/[0.04]'
          : 'bg-white/[0.02]',
        isConfirmed && 'border-lime-300/30',
        isSkipped && 'border-white/10 bg-white/[0.01] opacity-80'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[13px] font-semibold text-white/90 truncate',
                isSkipped && 'line-through decoration-white/30'
              )}
            >
              {match.skill_name}
            </span>
            <ConfidenceDot confidence={match.confidence} />
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/40">
              {match.ascension_state.replace('_', ' ')}
            </span>
          </div>
          <div className="text-[11px] text-white/50 mt-0.5">
            {match.rationale}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
              isConfirmed
                ? 'bg-lime-300/20 text-lime-200 border border-lime-300/40'
                : 'text-white/70 border border-white/10 hover:text-white hover:border-white/25'
            )}
          >
            {isConfirmed ? 'Confirmed' : 'Confirm'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
              isSkipped
                ? 'bg-white/[0.06] text-white/80 border border-white/15'
                : 'text-white/50 border border-white/[0.08] hover:text-white/75'
            )}
          >
            {isSkipped ? 'Skipped' : 'Skip'}
          </button>
        </div>
      </div>

      {isSkipped && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <select
            value={skipDraft?.reason_code ?? 'not_applicable'}
            onChange={(e) =>
              onSkipEdit({
                reason_code: e.target.value as SkipDraft['reason_code'],
              })
            }
            className="text-[11px] bg-[#0A0C14] text-white/80 border border-white/10 rounded-md px-2 py-1"
          >
            {REASON_OPTIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={skipDraft?.note ?? ''}
            onChange={(e) => onSkipEdit({ note: e.target.value })}
            placeholder="(optional note)"
            className="flex-1 min-w-[160px] text-[11px] bg-transparent text-white/80 placeholder-white/30 border border-white/10 rounded-md px-2 py-1"
          />
        </div>
      )}
    </li>
  );
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    confidence >= 0.85
      ? 'bg-lime-300 shadow-[0_0_6px_rgba(191,255,0,0.55)]'
      : confidence >= 0.6
        ? 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.4)]'
        : 'bg-white/35';
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] text-white/40"
      title={`confidence ${pct}%`}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', color)} />
      {pct}%
    </span>
  );
}
