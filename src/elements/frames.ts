import { slug, type Tone } from './shared.js';

/* ------------------------------------------------------------- footers -- */
/**
 * SM3: "Four footers cover all 16 widgets. Same 64 px row, same slots, in
 * every state." Each frame: tone, status icon, two lines (what happened ·
 * what it means), and at most one text action or one primary.
 */
export type FooterVariant = 'finishes-here' | 'confirms-in-orgx' | 'queues-work' | 'reads';
export type FooterIcon = 'seal' | 'app' | 'spin' | 'ring' | 'check' | 'alert' | 'clock' | 'lock' | 'x' | 'skel' | 'part';

export interface FooterFrame {
  tone: Exclude<Tone, 'ink'>;
  icon: FooterIcon;
  heading: string;
  detail: string;
  /** Primary button label (action lime fill). */
  primary?: string;
  /** Text action label. */
  action?: string;
  /** Primary shows a busy sweep and is not actionable. */
  busy?: boolean;
  /** Label opens OrgX (rendered with the external arrow). */
  ext?: boolean;
  /** Caption used in galleries (SM3 frame label). */
  name: string;
}

/*
 * One frame per line: state | tone | icon | heading | detail | button | caption.
 * The caption defaults to the state ("caught-up" -> "Caught up").
 * Button: "P:label" primary, "A:label" text action, "B:label" busy primary;
 * a trailing ↗ means it opens OrgX. Copy is the SM3 canvas wording, made
 * generic where the canvas used example data.
 */
const FRAMES_SRC: Record<FooterVariant, string> = {
  'finishes-here': `needs-you|amber|seal|Finishes here|undo 10 s|P:Send
sending|amber|spin|Sending|your answers|B:Sending…
held|amber|ring|Saved|undo {s} s|A:Undo|Held · undo
running|teal|spin|Running|step 1 of 3|A:Watch ↗
done|teal|check|Done|checks passed|A:Receipt ↗
failed|red|alert|Not sent|answers kept|P:Retry`,
  'confirms-in-orgx': `needs-you|amber|app|Confirms in OrgX|production|P:Save draft
saving|amber|spin|Saving draft|nothing applied|B:Saving…
draft|amber|lock|Draft saved|not applied yet|P:Confirm in OrgX ↗
waiting|mute|clock|Opened in OrgX|waiting for you there|A:Check now
confirmed|teal|check|Confirmed by you|applied|A:Receipt ↗
rejected|mute|x|Rejected by you|the agent reworks it|A:Receipt ↗`,
  'queues-work': `needs-you|amber|seal|Ready to queue|undo 10 s|P:Queue
held|amber|ring|Queued|undo {s} s|A:Undo|Held · undo
queued|teal|clock|Waiting to start|about 1 min|A:Cancel
running|teal|spin|Running|1 of 3 done|A:Watch ↗
partial|amber|part|Partly done|1 over the cap|P:Confirm in OrgX ↗|Partly done
done|teal|check|Done|within budget|A:Receipt ↗`,
  reads: `loading|mute|skel|||-
fresh|teal|check|Synced just now|up to date|A:Open ↗
stale|amber|clock|Out of date|a newer version may exist|A:Refresh
refreshing|mute|spin|Refreshing|keeps what you see|-
failed|red|alert|Couldn’t refresh|showing the last copy|A:Retry
caught-up|teal|check|Nothing waits on you|all caught up|-`,
};

function parseFrames(src: string): Record<string, FooterFrame> {
  const out: Record<string, FooterFrame> = {};
  for (const line of src.split('\n')) {
    const [state, tone, icon, heading, detail, btn, name] = line.split('|') as string[];
    const f: FooterFrame = {
      tone: tone as FooterFrame['tone'],
      icon: icon as FooterIcon,
      heading: heading!,
      detail: detail!,
      name: name || state![0]!.toUpperCase() + state!.slice(1).replace(/-/g, ' '),
    };
    if (btn && btn !== '-') {
      const kind = btn[0];
      let label = btn.slice(2);
      if (label.endsWith(' ↗')) {
        f.ext = true;
        label = label.slice(0, -2);
      }
      if (kind === 'A') f.action = label;
      else f.primary = label;
      if (kind === 'B') f.busy = true;
    }
    out[state!] = f;
  }
  return out;
}

export const FOOTER_FRAMES = Object.fromEntries(Object.entries(FRAMES_SRC).map(([v, src]) => [v, parseFrames(src)])) as Record<
  FooterVariant,
  Record<string, FooterFrame>
>;

export const FOOTER_VARIANTS = Object.keys(FRAMES_SRC) as FooterVariant[];

const FOOTER_ALIASES: Record<string, string> = {
  idle: 'needs-you',
  open: 'needs-you',
  pending: 'sending',
  undo: 'held',
  succeeded: 'done',
  partially_succeeded: 'partial',
  partly_done: 'partial',
};

export function resolveFooter(
  variantRaw: string | null,
  stateRaw: string | null,
): { variant: FooterVariant; state: string; frame: FooterFrame } {
  const v = slug(variantRaw).replace(/_/g, '-') as FooterVariant;
  const variant: FooterVariant = v in FOOTER_FRAMES ? v : 'finishes-here';
  const frames = FOOTER_FRAMES[variant];
  const s = slug(stateRaw);
  let state = s.replace(/_/g, '-');
  if (!(state in frames)) state = FOOTER_ALIASES[s] ?? '';
  if (!(state in frames)) state = Object.keys(frames)[0]!;
  return { variant, state, frame: frames[state]! };
}
