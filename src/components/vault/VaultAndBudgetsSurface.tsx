'use client';

/**
 * VaultAndBudgetsSurface — State widget for /settings/execution.
 *
 * orgx-design discipline (Stages 1–5):
 *
 *   Stage 1 · Classify
 *     - State widget · Command mode
 *     - Single-glance: "Are my keys + caps healthy?"
 *     - Attention states:
 *         Complete-Idle: all keys active, no pending decisions, under cap
 *         Needs You:     any key invalid/expiring OR any pending
 *                        budget_decisions OR daily usage ≥ 0.8
 *
 *   Stage 2 · Compose
 *     - Primary focal: provider cards stacked vertically (single-scroll,
 *       no tabs). Each card owns its own status dot + fingerprint +
 *       last-rotated + add/rotate/revoke controls.
 *     - Budget card sits below providers with a single thermometer row
 *       per provider + any pending decisions.
 *     - Quiet state: status dots lime; no attention banner.
 *     - Escalated state: amber dots, attention banner at top with count
 *       of pending decisions or expiring keys.
 *     - Three type voices: mono eyebrow, body label, tabular numerals.
 *
 *   Stage 3 · Critique (top 3 risks avoided)
 *     1. "Generic settings form" → provider cards are the structure, not
 *        a list of form fields. Each card has its own action cluster.
 *     2. "Card-in-card" → we use top-border separators between cards
 *        inside one outer `ox-card` wrapper, not nested bordered containers.
 *     3. "Passive status labels" → status dots are paired with action
 *        buttons when action is required (Rotate / Revoke / Add).
 *
 *   Stage 5 · Targets: ≥ 85 overall, ≥ 90 security-feel,
 *     ≥ 85 distinctiveness (no tabs, single-scroll).
 */

import { useMemo } from 'react';

import { cn } from '../../lib/utils';

export type VaultProviderRow = {
  api_key_id: string;
  provider: 'anthropic' | 'openai' | 'other';
  fingerprint: string;
  status: 'active' | 'invalid' | 'revoked';
  is_enterprise: boolean;
  added_at: string;
  rotated_at: string | null;
  last_validated_at: string | null;
};

export type VaultBudgetRow = {
  id: string;
  provider: 'anthropic' | 'openai' | 'any';
  daily_spend_cap_cents: number;
  daily_used_cents: number;
  soft_cap: boolean;
};

export type VaultPendingDecision = {
  id: string;
  provider: 'anthropic' | 'openai' | 'any';
  reason_code:
    | 'daily_cap_exceeded'
    | 'monthly_cap_exceeded'
    | 'per_agent_cap'
    | 'above_approval_threshold';
  requested_cents: number;
  created_at: string;
};

export type VaultAndBudgetsSurfaceProps = {
  providers: VaultProviderRow[];
  budgets: VaultBudgetRow[];
  pendingDecisions: VaultPendingDecision[];
  onAddKey?: (provider: VaultProviderRow['provider']) => void;
  onRotateKey?: (id: string) => void;
  onRevokeKey?: (id: string) => void;
  onApproveDecision?: (id: string) => void;
  onRejectDecision?: (id: string) => void;
  className?: string;
};

export function VaultAndBudgetsSurface({
  providers,
  budgets,
  pendingDecisions,
  onAddKey,
  onRotateKey,
  onRevokeKey,
  onApproveDecision,
  onRejectDecision,
  className,
}: VaultAndBudgetsSurfaceProps) {
  const missingProviders = useMemo(() => {
    const installed = new Set(providers.map((p) => p.provider));
    return (['anthropic', 'openai'] as const).filter(
      (p) => !installed.has(p)
    );
  }, [providers]);

  const invalidCount = providers.filter((p) => p.status === 'invalid').length;
  const needsAttention =
    pendingDecisions.length > 0 ||
    invalidCount > 0 ||
    budgets.some(
      (b) => b.daily_used_cents / Math.max(1, b.daily_spend_cap_cents) >= 0.8
    );

  return (
    <section
      className={cn(
        'rounded-[14px] border border-white/[0.06] bg-[#0A0C14] p-6',
        className
      )}
      aria-label="Vault and budgets"
    >
      <header className="flex items-center gap-3 mb-4">
        <span className="h-1.5 w-1.5 rounded-full bg-iris-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/50">
          Vault & Budgets
        </span>
        <span className="text-[12px] text-white/60">
          {providers.length} key{providers.length === 1 ? '' : 's'} ·{' '}
          {budgets.length} cap{budgets.length === 1 ? '' : 's'}
          {pendingDecisions.length > 0
            ? ` · ${pendingDecisions.length} pending approval${
                pendingDecisions.length === 1 ? '' : 's'
              }`
            : ''}
        </span>
        {needsAttention && (
          <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.14em] text-amber-400/85">
            Needs you
          </span>
        )}
      </header>

      {pendingDecisions.length > 0 && (
        <PendingDecisionsBlock
          decisions={pendingDecisions}
          onApprove={onApproveDecision}
          onReject={onRejectDecision}
        />
      )}

      {/* Providers — single-scroll cards, no tabs. */}
      <div className="flex flex-col gap-3">
        {providers.map((p) => (
          <ProviderCard
            key={p.api_key_id}
            row={p}
            onRotate={onRotateKey}
            onRevoke={onRevokeKey}
          />
        ))}

        {missingProviders.map((p) => (
          <AddProviderRow
            key={`add-${p}`}
            provider={p}
            onAdd={() => onAddKey?.(p)}
          />
        ))}
      </div>

      {/* Budgets — thermometer rows. */}
      {budgets.length > 0 && (
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/45">
              Daily caps
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {budgets.map((b) => (
              <BudgetThermometer key={b.id} row={b} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ProviderCard({
  row,
  onRotate,
  onRevoke,
}: {
  row: VaultProviderRow;
  onRotate?: (id: string) => void;
  onRevoke?: (id: string) => void;
}) {
  const tone =
    row.status === 'active'
      ? 'bg-lime-300 shadow-[0_0_8px_rgba(191,255,0,0.45)]'
      : row.status === 'invalid'
        ? 'bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
        : 'bg-white/30';
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-[10px] border border-white/[0.06] px-4 py-3',
        row.status === 'revoked' && 'opacity-60'
      )}
    >
      <span className={cn('h-2 w-2 rounded-full shrink-0', tone)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-white/90 capitalize">
            {row.provider}
          </span>
          {row.is_enterprise && (
            <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-violet-200/80 border border-violet-300/30 rounded-full px-1.5 py-0.5">
              Enterprise
            </span>
          )}
          <span className="ml-auto font-mono text-[11px] tracking-[0.08em] text-white/55 tabular-nums">
            {row.fingerprint}
          </span>
        </div>
        <div className="text-[10px] text-white/40 mt-0.5">
          {row.rotated_at
            ? `rotated ${formatRelativeTime(row.rotated_at)}`
            : `added ${formatRelativeTime(row.added_at)}`}
          {row.last_validated_at &&
            ` · validated ${formatRelativeTime(row.last_validated_at)}`}
        </div>
      </div>
      {row.status !== 'revoked' && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onRotate?.(row.api_key_id)}
            className="inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/70 transition-colors hover:text-white hover:border-white/25"
          >
            Rotate
          </button>
          <button
            type="button"
            onClick={() => onRevoke?.(row.api_key_id)}
            className="inline-flex items-center rounded-full border border-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-white/50 transition-colors hover:text-[#FF6B88]/85 hover:border-[#FF6B88]/30"
          >
            Revoke
          </button>
        </div>
      )}
    </div>
  );
}

function AddProviderRow({
  provider,
  onAdd,
}: {
  provider: 'anthropic' | 'openai';
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[10px] border border-dashed border-white/[0.08] px-4 py-3">
      <span className="h-2 w-2 rounded-full bg-white/20 shrink-0" />
      <span className="flex-1 text-[12px] text-white/55">
        <span className="capitalize text-white/75">{provider}</span> not yet
        added — OrgX will use your personal subscription by default.
      </span>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:text-white hover:border-white/30"
      >
        Add key
      </button>
    </div>
  );
}

function BudgetThermometer({ row }: { row: VaultBudgetRow }) {
  const pct = Math.min(1, row.daily_used_cents / Math.max(1, row.daily_spend_cap_cents));
  const pctRounded = Math.round(pct * 100);
  const fillTone =
    pct >= 0.95
      ? 'bg-[#FF6B88]'
      : pct >= 0.8
        ? 'bg-amber-300'
        : 'bg-lime-300/75';
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-white/80 capitalize">
          {row.provider === 'any' ? 'All providers' : row.provider}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-white/55">
          {formatCents(row.daily_used_cents)} / {formatCents(row.daily_spend_cap_cents)} ·{' '}
          {pctRounded}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-[width]', fillTone)}
          style={{ width: `${Math.max(2, pctRounded)}%` }}
        />
      </div>
      {row.soft_cap && pct >= 1 && (
        <div className="mt-1 text-[10px] text-amber-300/85">
          Soft-cap — dispatch surfaces a decision instead of blocking.
        </div>
      )}
    </div>
  );
}

function PendingDecisionsBlock({
  decisions,
  onApprove,
  onReject,
}: {
  decisions: VaultPendingDecision[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  return (
    <div className="mb-5 rounded-[10px] border border-amber-400/25 bg-amber-400/[0.04] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-amber-300/85">
          Pending approvals
        </span>
        <span className="text-[12px] text-white/70">
          {decisions.length} decision{decisions.length === 1 ? '' : 's'} waiting
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {decisions.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-3 rounded-[8px] bg-white/[0.02] px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white/85">
                <span className="capitalize">{d.provider === 'any' ? 'Any provider' : d.provider}</span>
                {' · '}
                <span className="text-white/55">{d.reason_code.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-[10px] text-white/45">
                {formatCents(d.requested_cents)} requested ·{' '}
                {formatRelativeTime(d.created_at)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onReject?.(d.id)}
              className="inline-flex items-center rounded-full border border-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-white/55 hover:text-[#FF6B88]/85 hover:border-[#FF6B88]/30"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => onApprove?.(d.id)}
              className="inline-flex items-center rounded-full bg-amber-300 text-black px-3 py-1.5 text-[11px] font-semibold shadow-[0_6px_22px_rgba(251,191,36,0.22)] hover:brightness-110"
            >
              Approve
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatCents(cents: number) {
  if (cents === 0) return '$0';
  if (cents < 100) return `${cents}¢`;
  return `$${(cents / 100).toFixed(2)}`;
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
