'use client';

/**
 * PlanVersionDiff — side-by-side markdown diff across plan versions.
 *
 * orgx-design discipline:
 *   Stage 1 · Process widget · Readout mode
 *     Single-glance: "What changed between these two plan versions?"
 *   Stage 2 · Left pane = base version, right pane = comparison
 *     version. Unified line colors: added = lime ghosted, removed =
 *     red ghosted, unchanged = neutral. Hunk counter in the header.
 *   Stage 3 · Avoided:
 *     - Full GitHub-style side-by-side chrome (too heavy for narrative)
 *     - Unified single-column diff (loses spatial 'base vs updated' read)
 *     - Character-level diff (noisy for markdown rationale)
 *   Stage 5 · Target ≥ 85 overall.
 */

import { useMemo } from 'react';

import { cn } from '../../lib/utils';

import { diffLines, summarizeDiff } from '../../lib/diffMarkdown';

export type PlanVersionDiffProps = {
  baseLabel: string;
  comparisonLabel: string;
  baseMarkdown: string;
  comparisonMarkdown: string;
  className?: string;
};

export function PlanVersionDiff({
  baseLabel,
  comparisonLabel,
  baseMarkdown,
  comparisonMarkdown,
  className,
}: PlanVersionDiffProps) {
  const { lines, added, removed } = useMemo(() => {
    const diff = diffLines(baseMarkdown, comparisonMarkdown);
    const s = summarizeDiff(diff);
    return { lines: diff, added: s.added, removed: s.removed };
  }, [baseMarkdown, comparisonMarkdown]);

  return (
    <section
      className={cn(
        'rounded-[14px] border border-white/[0.06] bg-[#0A0C14] overflow-hidden',
        className
      )}
      aria-label="Plan version diff"
    >
      <header className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
          Diff
        </span>
        <span className="text-[12px] text-white/70">
          {baseLabel} → {comparisonLabel}
        </span>
        <span className="ml-auto text-[10px] font-mono tabular-nums">
          <span className="text-lime-300/85">+{added}</span>{' '}
          <span className="text-[#FF6B88]/85">−{removed}</span>
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 font-mono text-[11px]">
        {/* Base column */}
        <div className="border-r border-white/[0.04]">
          {lines.map((l, i) =>
            l.kind === 'added' ? (
              <div key={i} className="px-4 py-0.5 text-white/15">
                &nbsp;
              </div>
            ) : (
              <div
                key={i}
                className={cn(
                  'px-4 py-0.5 whitespace-pre-wrap',
                  l.kind === 'removed'
                    ? 'bg-[#FF6B88]/[0.08] text-[#FFAABB]/90'
                    : 'text-white/70'
                )}
              >
                {l.text || '\u00A0'}
              </div>
            )
          )}
        </div>

        {/* Comparison column */}
        <div>
          {lines.map((l, i) =>
            l.kind === 'removed' ? (
              <div key={i} className="px-4 py-0.5 text-white/15">
                &nbsp;
              </div>
            ) : (
              <div
                key={i}
                className={cn(
                  'px-4 py-0.5 whitespace-pre-wrap',
                  l.kind === 'added'
                    ? 'bg-lime-300/[0.06] text-lime-200/90'
                    : 'text-white/70'
                )}
              >
                {l.text || '\u00A0'}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
