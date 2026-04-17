/**
 * Pre-flight Skill Check types — shared between match_pass, API endpoints,
 * and UI components.
 *
 * Sovereign Execution, milestone M1-1.
 */

/** A candidate skill match for an about-to-dispatch task. */
export type PreFlightMatch = {
  skill_id: string;
  skill_name: string;
  /** Confidence the skill applies to this task, 0..1. */
  confidence: number;
  /** Whether the user has promoted this skill or it's still learning. */
  ascension_state:
    | 'learning'
    | 'converged_pending'
    | 'promoted'
    | 'locked'
    | 'regressed';
  /** Why match_pass flagged this skill (for UI rationale). */
  rationale: string;
  /** Suggested action: accept (silent apply), confirm (show & require), review (low-signal but surface). */
  suggestion: 'accept' | 'confirm' | 'review';
};

/** Minimal task draft needed to run match_pass. */
export type PreFlightTaskDraft = {
  title: string;
  description?: string | null;
  repo_path?: string | null;
  workstream_id?: string | null;
  initiative_id?: string | null;
};

/** Response contract for POST /api/v1/tasks/dispatch-preview. */
export type PreFlightPreviewResponse = {
  matches: PreFlightMatch[];
  /** Short-lived token (5 min TTL, single-use) that must be presented to /dispatch. */
  preview_token: string;
  preview_token_issued_at: string;
  /** Policy that gates how the UI treats matches: off = skip card; advisory = show but non-blocking; blocking = confirm/skip required before dispatch. */
  enforcement: 'off' | 'advisory' | 'blocking';
  /** The minimum confidence threshold below which UI must surface confirm/skip. */
  confidence_floor: number;
};

/** Dispatch-time validation shape — consumer reads this off preview response metadata. */
export type PreFlightDispatchContext = {
  preview_token: string;
  confirmed_skill_ids: string[];
  skipped_skill_ids: Array<{
    skill_id: string;
    reason_code:
      | 'not_applicable'
      | 'rule_too_strict'
      | 'known_exception'
      | 'will_handle_manually'
      | 'unknown';
    note?: string;
  }>;
};
