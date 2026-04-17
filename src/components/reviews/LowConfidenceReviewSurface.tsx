'use client';

/**
 * LowConfidenceReviewSurface — /reviews
 *
 * orgx-design discipline (Stages 1–5):
 *
 *   Stage 1 · Action widget · Escalation mode
 *     Single-glance: "Do I trust this output?"
 *     Attention states:
 *       Needs You  — one or more pending reviews
 *       Complete   — inbox zero
 *
 *   Stage 2 · Compose
 *     - Primary focal: single-card focus mode — one review at a time with
 *       the judge's verdict, rationale, and card-height Agree/Disagree
 *       actions. Stack counter shows "N pending" to the right.
 *     - Disagree expands inline rubric-diff composer (textarea for
 *       disagreement + optional skill picker).
 *     - Keyboard-first: A=agree, D=disagree, Enter=submit.
 *     - Quiet state: inbox-zero affirmation — lime dot, empty headline.
 *
 *   Stage 3 · Top 3 risks avoided
 *     1. Generic B2B review queue → single-card focus, not a table
 *     2. Tiny Agree/Disagree pills → card-height 88px+ buttons with
 *        title + detail line
 *     3. No rationale / teachable moment → judge's verdict + evidence is
 *        visible inline; disagree opens a rubric-edit composer that
 *        writes to rubric_edits and teaches the next eval cycle
 *
 *   Stage 5 · Target ≥ 87 overall, ≥ 90 hierarchy.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { cn } from '../../lib/utils';

export type ReviewRow = {
  id: string;
  run_id: string;
  run_title: string;
  sample_band: 'below_70' | 'band_70_85' | 'random_above';
  judge_score: number | null;
  judge_verdict: 'shipped' | 'blocked' | 'abandoned' | 'awaiting_review' | null;
  judge_rationale_md: string | null;
  evidence_url: string | null;
  skills_fired: Array<{ skill_id: string; skill_name: string }>;
  created_at: string;
};

export type LowConfidenceReviewSurfaceProps = {
  reviews: ReviewRow[];
  onResolve?: (input: {
    review_id: string;
    decision: 'agree' | 'disagree';
    disagreement_md?: string;
    rubric_diff?: { skill_id?: string | null; diff: Record<string, unknown> };
  }) => Promise<void> | void;
  className?: string;
};

export function LowConfidenceReviewSurface({
  reviews,
  onResolve,
  className,
}: LowConfidenceReviewSurfaceProps) {
  const [index, setIndex] = useState(0);
  const [showDisagree, setShowDisagree] = useState(false);
  const [disagreementText, setDisagreementText] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const current = reviews[index] ?? null;

  const reset = useCallback(() => {
    setShowDisagree(false);
    setDisagreementText('');
    setSelectedSkill(null);
  }, []);

  const next = useCallback(() => {
    reset();
    setIndex((i) => Math.min(i + 1, Math.max(0, reviews.length - 1)));
  }, [reset, reviews.length]);

  const agree = useCallback(async () => {
    if (!current || !onResolve || submitting) return;
    setSubmitting(true);
    try {
      await onResolve({ review_id: current.id, decision: 'agree' });
      next();
    } finally {
      setSubmitting(false);
    }
  }, [current, onResolve, submitting, next]);

  const disagreeOpen = useCallback(() => {
    if (!current) return;
    setShowDisagree(true);
  }, [current]);

  const disagreeSubmit = useCallback(async () => {
    if (!current || !onResolve || submitting) return;
    setSubmitting(true);
    try {
      await onResolve({
        review_id: current.id,
        decision: 'disagree',
        disagreement_md: disagreementText || undefined,
        rubric_diff: selectedSkill
          ? { skill_id: selectedSkill, diff: { notes: disagreementText } }
          : undefined,
      });
      next();
    } finally {
      setSubmitting(false);
    }
  }, [current, onResolve, submitting, disagreementText, selectedSkill, next]);

  // Keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT');
      if (inField) return;
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        void agree();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        disagreeOpen();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, agree, disagreeOpen]);

  if (reviews.length === 0) {
    return <EmptyState className={className} />;
  }

  return (
    <section
      className={cn(
        'rounded-[14px] border border-white/[0.06] bg-[#0A0C14] p-6',
        className
      )}
      aria-label="Low-confidence review"
    >
      <Header index={index} total={reviews.length} current={current} />
      {current && (
        <>
          <ReviewBody review={current} />
          {!showDisagree ? (
            <ActionRow
              onAgree={agree}
              onDisagree={disagreeOpen}
              submitting={submitting}
            />
          ) : (
            <DisagreeComposer
              skills={current.skills_fired}
              selectedSkill={selectedSkill}
              setSelectedSkill={setSelectedSkill}
              text={disagreementText}
              setText={setDisagreementText}
              onCancel={() => setShowDisagree(false)}
              onSubmit={disagreeSubmit}
              submitting={submitting}
            />
          )}
          <Footer />
        </>
      )}
    </section>
  );
}

function Header({
  index,
  total,
  current,
}: {
  index: number;
  total: number;
  current: ReviewRow | null;
}) {
  return (
    <header className="flex items-baseline justify-between mb-5">
      <div className="flex items-baseline gap-3">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/50">
          Review queue
        </span>
        <span className="text-[12px] text-white/60">
          {total - index} pending · showing {index + 1} of {total}
        </span>
      </div>
      {current && (
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/40">
          {bandLabel(current.sample_band)}
        </span>
      )}
    </header>
  );
}

function ReviewBody({ review }: { review: ReviewRow }) {
  return (
    <div className="mb-5">
      <h2 className="text-[18px] font-semibold text-white/95 leading-tight">
        {review.run_title}
      </h2>
      <div className="mt-2 flex flex-wrap items-baseline gap-3 text-[11px] text-white/50">
        <span className="flex items-baseline gap-1.5">
          <span className="text-white/40">Judge verdict</span>
          <span className="text-white/85 capitalize">
            {review.judge_verdict ?? '—'}
          </span>
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-white/40">Score</span>
          <span className="font-mono tabular-nums text-white/85">
            {review.judge_score !== null ? review.judge_score.toFixed(2) : '—'}
          </span>
        </span>
        {review.skills_fired.length > 0 && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-white/40">Skills</span>
            <span className="text-white/75">
              {review.skills_fired.map((s) => s.skill_name).join(' · ')}
            </span>
          </span>
        )}
      </div>
      {review.judge_rationale_md && (
        <p className="mt-4 whitespace-pre-wrap text-[13px] text-white/80 leading-relaxed border-l-2 border-white/10 pl-4">
          {review.judge_rationale_md}
        </p>
      )}
    </div>
  );
}

function ActionRow({
  onAgree,
  onDisagree,
  submitting,
}: {
  onAgree: () => void;
  onDisagree: () => void;
  submitting: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <BigActionButton
        title="Agree with judge"
        detail="Lock in the verdict · A"
        accent="lime"
        onClick={onAgree}
        disabled={submitting}
      />
      <BigActionButton
        title="Disagree"
        detail="Refine the rubric · D"
        accent="amber"
        onClick={onDisagree}
        disabled={submitting}
      />
    </div>
  );
}

function BigActionButton({
  title,
  detail,
  accent,
  onClick,
  disabled,
}: {
  title: string;
  detail: string;
  accent: 'lime' | 'amber';
  onClick: () => void;
  disabled?: boolean;
}) {
  const toneClass =
    accent === 'lime'
      ? 'border-lime-300/30 bg-lime-300/[0.04] hover:bg-lime-300/[0.08] text-white/95'
      : 'border-amber-400/30 bg-amber-400/[0.04] hover:bg-amber-400/[0.08] text-white/95';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-h-[88px] flex flex-col items-start justify-center gap-1 rounded-[10px] border px-5 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        toneClass
      )}
    >
      <span className="text-[14px] font-semibold tracking-tight">{title}</span>
      <span className="text-[11px] text-white/50">{detail}</span>
    </button>
  );
}

function DisagreeComposer({
  skills,
  selectedSkill,
  setSelectedSkill,
  text,
  setText,
  onCancel,
  onSubmit,
  submitting,
}: {
  skills: ReviewRow['skills_fired'];
  selectedSkill: string | null;
  setSelectedSkill: (v: string | null) => void;
  text: string;
  setText: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-amber-400/25 bg-amber-400/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-amber-300/85">
          Refine the rubric
        </span>
      </div>
      <label className="block text-[11px] text-white/50 mb-2">
        What did the judge miss?
      </label>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="e.g. 'Parametrize-tests rule should apply even when the existing suite is class-based — the judge accepted the class-based version as shipped, but the rule says: replace.'"
        className="w-full rounded-md border border-white/10 bg-[#0A0C14] px-3 py-2 text-[13px] text-white/90 placeholder-white/30"
      />
      {skills.length > 0 && (
        <div className="mt-3">
          <label className="block text-[11px] text-white/50 mb-2">
            Attach to a skill (optional)
          </label>
          <select
            value={selectedSkill ?? ''}
            onChange={(e) => setSelectedSkill(e.target.value || null)}
            className="w-full rounded-md border border-white/10 bg-[#0A0C14] px-3 py-2 text-[12px] text-white/80"
          >
            <option value="">— no skill</option>
            {skills.map((s) => (
              <option key={s.skill_id} value={s.skill_id}>
                {s.skill_name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:text-white hover:border-white/25"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || text.trim().length === 0}
          className="inline-flex items-center rounded-full bg-amber-300 text-black px-4 py-1.5 text-[11px] font-semibold shadow-[0_6px_22px_rgba(251,191,36,0.22)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit disagreement
        </button>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-5 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] text-white/35">
      <span>A · agree     D · disagree</span>
      <span>samples below 0.70 are 100% reviewed</span>
    </footer>
  );
}

function EmptyState({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'rounded-[14px] border border-white/[0.06] bg-[#0A0C14] p-10 flex flex-col items-center justify-center text-center',
        className
      )}
      aria-label="Review queue empty"
    >
      <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(191,255,0,0.55)] mb-4" />
      <h2 className="text-[18px] font-semibold text-white/95">Inbox zero.</h2>
      <p className="mt-2 max-w-sm text-[12px] text-white/50 leading-relaxed">
        Every sampled run has been confirmed. The judge is aligned with you
        for the current rubric cycle.
      </p>
    </section>
  );
}

function bandLabel(band: ReviewRow['sample_band']) {
  if (band === 'below_70') return '< 0.70 · all sampled';
  if (band === 'band_70_85') return '0.70–0.85 · 50%';
  return '≥ 0.85 · 10% random';
}
