import { describe, expect, it } from 'vitest';
import { backoffDelay, isRetryableError, shouldRetry, statusOf } from '@/shared/lib/retry';

describe('backoffDelay', () => {
  it('grows exponentially from the base for each 0-based attempt', () => {
    expect(backoffDelay(0)).toBe(400);
    expect(backoffDelay(1)).toBe(800);
    expect(backoffDelay(2)).toBe(1600);
  });

  it('clamps to the cap and floors negative attempts', () => {
    expect(backoffDelay(99)).toBe(10_000);
    expect(backoffDelay(-3)).toBe(400);
  });

  it('honours custom options', () => {
    expect(backoffDelay(2, { baseMs: 100, factor: 3, capMs: 5000 })).toBe(900);
    expect(backoffDelay(10, { baseMs: 100, factor: 3, capMs: 5000 })).toBe(5000);
  });
});

describe('statusOf', () => {
  it('reads the status from the assorted error shapes', () => {
    expect(statusOf({ status: 503 })).toBe(503);
    expect(statusOf({ statusCode: 404 })).toBe(404);
    expect(statusOf({ response: { status: 429 } })).toBe(429);
    expect(statusOf({ message: 'request failed with 500' })).toBe(500);
    expect(statusOf(new Error('no code here'))).toBeUndefined();
  });
});

describe('isRetryableError', () => {
  it('retries 5xx and network errors', () => {
    expect(isRetryableError({ status: 500 })).toBe(true);
    expect(isRetryableError({ status: 503 })).toBe(true);
    expect(isRetryableError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('does not retry deterministic 4xx', () => {
    expect(isRetryableError({ status: 400 })).toBe(false);
    expect(isRetryableError({ status: 401 })).toBe(false);
    expect(isRetryableError({ status: 404 })).toBe(false);
  });

  it('retries the transient 4xx exceptions 408 and 429', () => {
    expect(isRetryableError({ status: 408 })).toBe(true);
    expect(isRetryableError({ status: 429 })).toBe(true);
  });

  it('does not retry an aborted request', () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    expect(isRetryableError(abort)).toBe(false);
  });
});

describe('shouldRetry', () => {
  it('retries a transient error up to the cap then stops', () => {
    expect(shouldRetry(1, { status: 500 })).toBe(true);
    expect(shouldRetry(3, { status: 500 })).toBe(true);
    expect(shouldRetry(4, { status: 500 })).toBe(false);
  });

  it('never retries a non-retryable error regardless of count', () => {
    expect(shouldRetry(1, { status: 403 })).toBe(false);
  });

  it('honours a custom max', () => {
    expect(shouldRetry(2, { status: 500 }, 2)).toBe(true);
    expect(shouldRetry(3, { status: 500 }, 2)).toBe(false);
  });
});
