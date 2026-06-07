import { describe, expect, it } from 'vitest';
import {
  GUARD_WINDOW_MS,
  LISTING_TITLE_MAX,
  LISTING_DESC_MAX,
  LISTING_RATE_LIMIT,
  PRIVATE_SUBJECT_MAX,
  PRIVATE_BODY_MAX,
  PRIVATE_RATE_LIMIT,
  IDEA_TITLE_MAX,
  IDEA_BODY_MAX,
  IDEA_RATE_LIMIT,
  DISCUSSION_MSG_MAX,
  charsRemaining,
  isOverLength,
  pruneTimestamps,
  canPostNow,
  recordTimestamp,
} from '@/shared/lib/contentGuard';

describe('charsRemaining', () => {
  it('returns positive when under limit', () => {
    expect(charsRemaining('hello', 100)).toBe(95);
  });

  it('returns zero at exact limit', () => {
    expect(charsRemaining('a'.repeat(100), 100)).toBe(0);
  });

  it('returns negative when over limit', () => {
    expect(charsRemaining('a'.repeat(101), 100)).toBe(-1);
  });
});

describe('isOverLength', () => {
  it('false when within limit', () => {
    expect(isOverLength('hello', 100)).toBe(false);
  });

  it('false at exact limit', () => {
    expect(isOverLength('a'.repeat(100), 100)).toBe(false);
  });

  it('true when over limit', () => {
    expect(isOverLength('a'.repeat(101), 100)).toBe(true);
  });
});

describe('pruneTimestamps', () => {
  const now = 1_000_000;

  it('keeps timestamps within the window', () => {
    const ts = [now - GUARD_WINDOW_MS + 1, now - 1000];
    expect(pruneTimestamps(ts, now)).toHaveLength(2);
  });

  it('drops timestamps older than the window', () => {
    const ts = [now - GUARD_WINDOW_MS, now - GUARD_WINDOW_MS - 1];
    expect(pruneTimestamps(ts, now)).toHaveLength(0);
  });

  it('handles empty input', () => {
    expect(pruneTimestamps([], now)).toHaveLength(0);
  });

  it('respects a custom window', () => {
    const smallWindow = 5_000;
    const ts = [now - 6_000, now - 3_000, now - 1_000];
    expect(pruneTimestamps(ts, now, smallWindow)).toHaveLength(2);
  });
});

describe('canPostNow', () => {
  const now = 2_000_000;

  it('allows posting when no prior timestamps', () => {
    expect(canPostNow([], 5, now)).toBe(true);
  });

  it('allows posting when under the cap', () => {
    const ts = [now - 1000, now - 2000];
    expect(canPostNow(ts, 5, now)).toBe(true);
  });

  it('blocks posting when at the cap', () => {
    const ts = Array.from({ length: 5 }, (_, i) => now - i * 1000);
    expect(canPostNow(ts, 5, now)).toBe(false);
  });

  it('allows posting after old timestamps expire', () => {
    const ts = Array.from({ length: 5 }, () => now - GUARD_WINDOW_MS - 1);
    expect(canPostNow(ts, 5, now)).toBe(true);
  });
});

describe('recordTimestamp', () => {
  const now = 3_000_000;

  it('adds a timestamp to an empty list', () => {
    expect(recordTimestamp([], now)).toEqual([now]);
  });

  it('appends to existing timestamps', () => {
    const ts = [now - 1000];
    const result = recordTimestamp(ts, now);
    expect(result).toEqual([now - 1000, now]);
  });

  it('prunes stale timestamps while adding the new one', () => {
    const stale = now - GUARD_WINDOW_MS - 1;
    const result = recordTimestamp([stale, now - 500], now);
    expect(result).not.toContain(stale);
    expect(result).toContain(now);
  });

  it('does not mutate the original array', () => {
    const original = [now - 1000];
    recordTimestamp(original, now);
    expect(original).toHaveLength(1);
  });
});

describe('limit constants are sane', () => {
  it('rate limits are positive', () => {
    expect(LISTING_RATE_LIMIT).toBeGreaterThan(0);
    expect(PRIVATE_RATE_LIMIT).toBeGreaterThan(0);
    expect(IDEA_RATE_LIMIT).toBeGreaterThan(0);
  });

  it('max lengths are positive and reasonable', () => {
    expect(LISTING_TITLE_MAX).toBeGreaterThan(10);
    expect(LISTING_DESC_MAX).toBeGreaterThan(100);
    expect(PRIVATE_SUBJECT_MAX).toBeGreaterThan(10);
    expect(PRIVATE_BODY_MAX).toBeGreaterThan(100);
    expect(IDEA_TITLE_MAX).toBeGreaterThan(10);
    expect(IDEA_BODY_MAX).toBeGreaterThan(100);
    expect(DISCUSSION_MSG_MAX).toBeGreaterThan(100);
  });

  it('window is 1 hour', () => {
    expect(GUARD_WINDOW_MS).toBe(60 * 60_000);
  });
});

describe('marketplace guard integration', () => {
  it('blocks listing after reaching rate limit', () => {
    const now = 4_000_000;
    const ts = Array.from({ length: LISTING_RATE_LIMIT }, () => now - 1000);
    expect(canPostNow(ts, LISTING_RATE_LIMIT, now)).toBe(false);
  });

  it('rejects a title over the max length', () => {
    expect(isOverLength('a'.repeat(LISTING_TITLE_MAX + 1), LISTING_TITLE_MAX)).toBe(true);
  });

  it('accepts a title at the max length', () => {
    expect(isOverLength('a'.repeat(LISTING_TITLE_MAX), LISTING_TITLE_MAX)).toBe(false);
  });
});

describe('ideas guard integration', () => {
  it('blocks idea after reaching rate limit', () => {
    const now = 5_000_000;
    const ts = Array.from({ length: IDEA_RATE_LIMIT }, () => now - 1000);
    expect(canPostNow(ts, IDEA_RATE_LIMIT, now)).toBe(false);
  });

  it('rejects a body over the max length', () => {
    expect(isOverLength('a'.repeat(IDEA_BODY_MAX + 1), IDEA_BODY_MAX)).toBe(true);
  });
});

describe('private message guard integration', () => {
  it('blocks message after reaching rate limit', () => {
    const now = 6_000_000;
    const ts = Array.from({ length: PRIVATE_RATE_LIMIT }, () => now - 1000);
    expect(canPostNow(ts, PRIVATE_RATE_LIMIT, now)).toBe(false);
  });

  it('rejects a subject over the max length', () => {
    expect(isOverLength('a'.repeat(PRIVATE_SUBJECT_MAX + 1), PRIVATE_SUBJECT_MAX)).toBe(true);
  });

  it('accepts a body at the exact max length', () => {
    expect(isOverLength('a'.repeat(PRIVATE_BODY_MAX), PRIVATE_BODY_MAX)).toBe(false);
  });
});
