/** Sliding window duration for all posting-rate guards (1 hour). */
export const GUARD_WINDOW_MS = 60 * 60_000;

// -- Marketplace --
export const LISTING_TITLE_MAX = 100;
export const LISTING_DESC_MAX = 1000;
export const LISTING_RATE_LIMIT = 5;

// -- Private messages / admin chat --
export const PRIVATE_SUBJECT_MAX = 150;
export const PRIVATE_BODY_MAX = 2000;
export const PRIVATE_RATE_LIMIT = 20;

// -- Ideas --
export const IDEA_TITLE_MAX = 150;
export const IDEA_BODY_MAX = 3000;
export const IDEA_RATE_LIMIT = 3;

// -- Discussions (mirrors the limit in discussionLogic) --
export const DISCUSSION_MSG_MAX = 2000;

// -- FAQ (admin-only; no rate limit) --
export const FAQ_QUESTION_MAX = 500;
export const FAQ_ANSWER_MAX = 5000;

/** Characters remaining before the limit. Negative means already over. */
export function charsRemaining(text: string, maxLen: number): number {
  return maxLen - text.length;
}

/** True when the text exceeds maxLen. */
export function isOverLength(text: string, maxLen: number): boolean {
  return text.length > maxLen;
}

/** Drop timestamps that have aged out of the sliding window. */
export function pruneTimestamps(
  timestamps: number[],
  now: number,
  windowMs: number = GUARD_WINDOW_MS,
): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

/** Whether the user may post given their recent timestamps and the per-window cap. */
export function canPostNow(
  timestamps: number[],
  maxPer: number,
  now: number = Date.now(),
  windowMs: number = GUARD_WINDOW_MS,
): boolean {
  return pruneTimestamps(timestamps, now, windowMs).length < maxPer;
}

/** Append a new timestamp to the pruned list without mutating the original. */
export function recordTimestamp(
  timestamps: number[],
  now: number = Date.now(),
  windowMs: number = GUARD_WINDOW_MS,
): number[] {
  return [...pruneTimestamps(timestamps, now, windowMs), now];
}
