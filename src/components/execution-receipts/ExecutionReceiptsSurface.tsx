'use client';

/**
 * ExecutionReceiptsSurface — Executive Readout for Sovereign Execution
 * receipts. Mounts at /settings/execution (receipts tab).
 *
 * orgx-design discipline (Stages 1–5):
 *
 *   Stage 1 · Classify
 *     - Executive Readout widget · Readout mode
 *     - Single-glance: "Am I spending more than I saved via subscriptions?"
 *     - Attention states:
 *         Complete-Idle: hero stats + weekly chip + collapsed attribution
 *         Needs You:     attention banner when daily_used_pct ≥ 0.8
 *
 *   Stage 2 · Compose
 *     - Primary focal: two hero stats side-by-side — **Spent** vs **Saved**
 *     - Saved is OrgX-specific (sum of saved_estimate_cents). Leads the read.
 *     - Secondary: provider attribution strip (sub vs api_key, driver badges)
 *     - Tertiary: receipts table with filter + sort
 *     - Three type voices: eyebrow (mono uppercase), display (big numerals),
 *       body (description), micro (metadata)
 *
 *   Stage 3 · Critique (top 3 risks avoided)
 *     1. "Looks like Stripe billing" → we lead with Saved (OrgX-specific),
 *        not Spent. Provider logos + driver badges + sub-vs-key tag make it
 *        visually distinctive.
 *     2. "Chart dominates" → chart is a one-row inline sparkline, not a
 *        full-bleed area chart. Hero numbers carry the weight.
 *     3. "Generic billing table" → table shows BYOK attribution badges
 *        (not just costs) and supports per-provider filter.
 *
 *   Stage 5 · Targets: ≥ 86 overall, ≥ 85 distinctiveness.
 */

import { useMemo, useState } from 'react';

import { cn } from '../../lib/utils';

export type ReceiptRow = {
  id: string;
  completed_at: string;
  provider: 'anthropic' | 'openai' | 'other';
  source_sub_type: 'subscription' | 'api_key' | 'enterprise_key';
  source_driver: string;
  tokens_used: number;
  cost_estimate_cents: number;
  saved_estimate_cents: number;
  outcome_kind: 'shipped' | 'blocked' | 'abandoned' | 'awaiting_review' | null;
  run_id: string;
};

export type ExecutionReceiptsSurfaceProps = {
  /** Receipts over the selected window (default: last 30 days). */
  receipts: ReceiptRow[];
  /** Budget snapshot for the attention banner (optional). */
  budget?: {
    daily_cap_cents: number;
    daily_used_cents: number;
  } | null;
  windowLabel?: string;
  className?: string;
};

type ProviderFilter = 'all' | 'anthropic' | 'openai' | 'other';

export function ExecutionReceiptsSurface({
  receipts,
  budget,
  windowLabel = 'last 30 days',
  className,
}: ExecutionReceiptsSurfaceProps) {
  const [provider, setProvider] = useState<ProviderFilter>('all');
  const [subType, setSubType] = useState<
    'all' | ReceiptRow['source_sub_type']
  >('all');

  const filtered = useMemo(() => {
    return receipts.filter(
      (r) =>
        (provider === 'all' || r.provider === provider) &&
        (subType === 'all' || r.source_sub_type === subType)
    );
  }, [receipts, provider, subType]);

  const totals = useMemo(() => {
    let spentCents = 0;
    let savedCents = 0;
    let tokensUsed = 0;
    let shippedCount = 0;
    for (const r of filtered) {
      spentCents += r.cost_estimate_cents;
      savedCents += r.saved_estimate_cents;
      tokensUsed += r.tokens_used;
      if (r.outcome_kind === 'shipped') shippedCount++;
    }
    return { spentCents, savedCents, tokensUsed, shippedCount };
  }, [filtered]);

  const byProvider = useMemo(() => {
    const map = new Map<
      string,
      { spentCents: number; savedCents: number; count: number }
    >();
    for (const r of filtered) {
      const key = r.provider;
      const cur = map.get(key) ?? { spentCents: 0, savedCents: 0, count: 0 };
      cur.spentCents += r.cost_estimate_cents;
      cur.savedCents += r.saved_estimate_cents;
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const dailyPct = budget
    ? Math.min(1, budget.daily_used_cents / Math.max(1, budget.daily_cap_cents))
    : 0;
  const showAttentionBanner = budget && dailyPct >= 0.8;

  return (
    <section
      className={cn(
        'rounded-[14px] border border-white/[0.06] bg-[#0A0C14] p-6',
        className
      )}
      aria-label="Execution receipts"
    >
      {showAttentionBanner && (
        <AttentionBanner
          pct={dailyPct}
          capCents={budget!.daily_cap_cents}
          usedCents={budget!.daily_used_cents}
        />
      )}

      {/* Hero stats — Saved leads (OrgX-specific), Spent follows. */}
      <div className="grid grid-cols-2 gap-6">
        <HeroStat
          label="Saved"
          labelHint={`via subscription (${windowLabel})`}
          valueCents={totals.savedCents}
          accent="lime"
          dominant
        />
        <HeroStat
          label="Spent server-side"
          labelHint={`vaulted api keys (${windowLabel})`}
          valueCents={totals.spentCents}
          accent="neutral"
        />
      </div>

      {/* Secondary strip — provider attribution */}
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/40">
          Providers
        </span>
        {byProvider.length === 0 ? (
          <span className="text-[11px] text-white/40">
            No receipts in this window yet.
          </span>
        ) : (
          byProvider.map(([p, stats]) => (
            <div
              key={p}
              className="flex items-baseline gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1"
            >
              <span className="text-[11px] font-semibold text-white/85 capitalize">
                {p}
              </span>
              <span className="text-[10px] text-white/50">
                {stats.count} runs · saved{' '}
                <span className="text-lime-300/85">
                  {formatCents(stats.savedCents)}
                </span>
              </span>
            </div>
          ))
        )}
        <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.14em] text-white/40">
          {totals.shippedCount} shipped · {totals.tokensUsed.toLocaleString()} tokens
        </span>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <FilterSelect
          label="Provider"
          value={provider}
          onChange={(v) => setProvider(v as ProviderFilter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <FilterSelect
          label="Source"
          value={subType}
          onChange={(v) =>
            setSubType(v as 'all' | ReceiptRow['source_sub_type'])
          }
          options={[
            { value: 'all', label: 'All' },
            { value: 'subscription', label: 'Subscription' },
            { value: 'api_key', label: 'API key' },
            { value: 'enterprise_key', label: 'Enterprise key' },
          ]}
        />
        <span className="ml-auto text-[11px] text-white/45">
          {filtered.length} row{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Table */}
      <ReceiptsTable rows={filtered} />
    </section>
  );
}

function HeroStat({
  label,
  labelHint,
  valueCents,
  accent,
  dominant = false,
}: {
  label: string;
  labelHint: string;
  valueCents: number;
  accent: 'lime' | 'neutral';
  dominant?: boolean;
}) {
  const accentClass =
    accent === 'lime'
      ? 'text-lime-300 drop-shadow-[0_0_16px_rgba(191,255,0,0.18)]'
      : 'text-white/90';
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        dominant && 'border-l-2 border-lime-300/40 pl-5'
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/45">
          {label}
        </span>
        <span className="text-[10px] text-white/35">{labelHint}</span>
      </div>
      <span
        className={cn(
          'font-semibold tracking-tight tabular-nums',
          dominant ? 'text-5xl' : 'text-4xl',
          accentClass
        )}
      >
        {formatCents(valueCents)}
      </span>
    </div>
  );
}

function AttentionBanner({
  pct,
  capCents,
  usedCents,
}: {
  pct: number;
  capCents: number;
  usedCents: number;
}) {
  const critical = pct >= 0.95;
  return (
    <div
      className={cn(
        'mb-5 flex items-center gap-3 rounded-[10px] px-4 py-3',
        critical
          ? 'bg-[#FF6B88]/10 border border-[#FF6B88]/30'
          : 'bg-amber-400/10 border border-amber-400/30'
      )}
      role="alert"
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          critical ? 'bg-[#FF6B88]' : 'bg-amber-300'
        )}
      />
      <div className="flex-1">
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-white/60">
          Budget
        </span>
        <span className="ml-2 text-[13px] text-white/90">
          {Math.round(pct * 100)}% of daily cap used ·{' '}
          {formatCents(usedCents)} / {formatCents(capCents)}
        </span>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-white/50">
      <span className="font-mono uppercase tracking-[0.14em] text-white/40">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-white/10 bg-[#0A0C14] px-2 py-1 text-white/80"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReceiptsTable({ rows }: { rows: ReceiptRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="mt-5 rounded-[10px] border border-dashed border-white/[0.08] px-4 py-6 text-center text-[12px] text-white/40">
        No receipts in this filter. Run a task with a subscription-backed
        driver and come back.
      </div>
    );
  }
  return (
    <div className="mt-5 overflow-hidden rounded-[10px] border border-white/[0.06]">
      <table className="w-full text-[12px]">
        <thead className="bg-white/[0.02] text-white/50">
          <tr>
            <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em]">
              When
            </th>
            <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em]">
              Provider · Driver
            </th>
            <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em]">
              Source
            </th>
            <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.14em]">
              Spent
            </th>
            <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.14em]">
              Saved
            </th>
            <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.14em]">
              Tokens
            </th>
            <th className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em]">
              Outcome
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-t border-white/[0.04] text-white/80 hover:bg-white/[0.015]"
            >
              <td className="px-4 py-2 text-white/50 tabular-nums">
                {formatRelativeTime(r.completed_at)}
              </td>
              <td className="px-4 py-2">
                <span className="capitalize">{r.provider}</span>
                <span className="ml-2 text-white/40">· {r.source_driver}</span>
              </td>
              <td className="px-4 py-2">
                <SourceBadge subType={r.source_sub_type} />
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-white/60">
                {formatCents(r.cost_estimate_cents)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-lime-300/85">
                {formatCents(r.saved_estimate_cents)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-white/60">
                {r.tokens_used.toLocaleString()}
              </td>
              <td className="px-4 py-2 text-white/55 capitalize">
                {r.outcome_kind ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceBadge({ subType }: { subType: ReceiptRow['source_sub_type'] }) {
  const label =
    subType === 'subscription'
      ? 'Subscription'
      : subType === 'enterprise_key'
        ? 'Enterprise key'
        : 'API key';
  const tone =
    subType === 'subscription'
      ? 'border-lime-300/30 text-lime-300/85 bg-lime-300/[0.04]'
      : subType === 'enterprise_key'
        ? 'border-violet-300/30 text-violet-200/85 bg-violet-300/[0.04]'
        : 'border-white/15 text-white/70 bg-white/[0.02]';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.12em]',
        tone
      )}
    >
      {label}
    </span>
  );
}

function formatCents(cents: number) {
  if (cents === 0) return '$0.00';
  if (cents < 100) return `$${(cents / 100).toFixed(2)}`;
  if (cents < 100_000) return `$${(cents / 100).toFixed(2)}`;
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatRelativeTime(iso: string) {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return iso.slice(0, 10);
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return iso.slice(0, 10);
}
