import { slug, type Tone } from './shared.js';

/**
 * The canonical action lifecycle, from the canvas boards:
 *   SM0 "One lifecycle for every action" (nodes: label, stored state, tone)
 *   SM2 "Every component, every state" (columns: superseded, offline, view only)
 *   SM3 "Reads and refreshes" (stale)
 *   T4 agent presence (blocked, delivered)
 *
 * `label` is the word the person reads (SM0 node title); the comment beside
 * each row is the server-side state SM0 prints under it. Tones follow the SM0
 * legend: amber needs you, teal moving or done, red failed (retryable), mute
 * out of your hands, ink in flight.
 */
export type StateIcon = 'dot' | 'spin' | 'ring' | 'check' | 'alert' | 'clock' | 'lock' | 'x' | 'pulse';

export interface StateDef {
  label: string;
  tone: Tone;
  icon: StateIcon;
}

/*
 * One state per line: key | label | tone | icon. The server-side state SM0
 * prints under each node:
 *   needs_you open · sending received · held 10 s server hold · committed ·
 *   queued run queued · running step n of N · verifying checks · succeeded
 *   Done · receipt · undone cancelled during the hold · cancelled ·
 *   paused_for_input · failed retryable · retrying attempt 2 of 3 ·
 *   failed_step · partially_succeeded 2 of 3 · draft not applied · handed_off ·
 *   confirmed · rejected · expired default · superseded (SM2: someone else
 *   ruled first) · stale (SM3 reads: as of 13:44) · offline, view_only (SM2) ·
 *   blocked (T4 presence: missing access) · delivered (T4: handed over).
 * Kept as one string: it is the smallest form in the minified bundles.
 */
const TABLE = `needs_you|Needs you|amber|dot
sending|Sending|ink|spin
held|Held · undo|amber|ring
committed|Committed|teal|dot
queued|Queued|teal|clock
running|Running|teal|spin
verifying|Verifying|teal|pulse
succeeded|Done|teal|check
undone|Undone|mute|x
cancelled|Cancelled|mute|x
paused_for_input|Needs you again|amber|dot
failed|Not sent|red|alert
retrying|Retrying|amber|spin
failed_step|Run failed|red|alert
partially_succeeded|Partly done|amber|alert
draft|Draft saved|amber|lock
handed_off|Waiting in OrgX|mute|clock
confirmed|Confirmed in OrgX|teal|check
rejected|Rejected in OrgX|mute|x
expired|Lapsed|mute|clock
superseded|Superseded|mute|dot
stale|Stale|amber|clock
offline|Offline|mute|dot
view_only|View only|mute|lock
blocked|Blocked|red|alert
delivered|Delivered|teal|check`;

export type ActionState =
  | 'needs_you'
  | 'sending'
  | 'held'
  | 'committed'
  | 'queued'
  | 'running'
  | 'verifying'
  | 'succeeded'
  | 'undone'
  | 'cancelled'
  | 'paused_for_input'
  | 'failed'
  | 'retrying'
  | 'failed_step'
  | 'partially_succeeded'
  | 'draft'
  | 'handed_off'
  | 'confirmed'
  | 'rejected'
  | 'expired'
  | 'superseded'
  | 'stale'
  | 'offline'
  | 'view_only'
  | 'blocked'
  | 'delivered';

export const ACTION_STATES = Object.fromEntries(
  TABLE.split('\n').map((l) => {
    const [k, label, tone, icon] = l.split('|') as [ActionState, string, Tone, StateIcon];
    return [k, { label, tone, icon }];
  }),
) as Record<ActionState, StateDef>;

/** Accepted spellings from tool output and other surfaces ("alias:canonical"). */
export const STATE_ALIASES: Record<string, ActionState> = Object.fromEntries(
  (
    'idle:needs_you open:needs_you pending:sending received:sending done:succeeded completed:succeeded ' +
    'canceled:cancelled error:failed run_failed:failed_step ' +
    'partial:partially_succeeded partly_done:partially_succeeded waiting:handed_off lapsed:expired conflict:superseded'
  )
    .split(' ')
    .map((p) => p.split(':') as [string, ActionState]),
);

export function resolveState(raw: string | null | undefined): ActionState | null {
  const s = slug(raw);
  if (s in ACTION_STATES) return s as ActionState;
  return STATE_ALIASES[s] ?? null;
}
