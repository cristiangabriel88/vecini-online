import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWriteRetry } from '@/shared/lib/useWriteRetry';

vi.mock('@/shared/lib/errorReporting', () => ({
  reportError: vi.fn(),
}));

import { reportError } from '@/shared/lib/errorReporting';

describe('useWriteRetry (T283)', () => {
  beforeEach(() => {
    vi.mocked(reportError).mockClear();
  });

  it('starts with pending=false and error=null', () => {
    const { result } = renderHook(() => useWriteRetry('test.source'));
    expect(result.current.pending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('run() returns true and keeps error null on success', async () => {
    const { result } = renderHook(() => useWriteRetry('test.source'));
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.run(() => Promise.resolve());
    });
    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
  });

  it('run() returns false and sets error to "write" on failure', async () => {
    const { result } = renderHook(() => useWriteRetry('test.source'));
    const err = new Error('network error');
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.run(() => Promise.reject(err));
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('write');
    expect(reportError).toHaveBeenCalledWith(err, { source: 'test.source' });
  });

  it('run() wraps a non-Error throw in an Error before reporting', async () => {
    const { result } = renderHook(() => useWriteRetry('test.source'));
    await act(async () => {
      await result.current.run(() => Promise.reject('plain string error'));
    });
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { source: 'test.source' });
  });

  it('clearError() resets error to null', async () => {
    const { result } = renderHook(() => useWriteRetry('test.source'));
    await act(async () => {
      await result.current.run(() => Promise.reject(new Error('fail')));
    });
    expect(result.current.error).toBe('write');
    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });

  it('re-run after failure clears the previous error', async () => {
    const { result } = renderHook(() => useWriteRetry('test.source'));
    await act(async () => {
      await result.current.run(() => Promise.reject(new Error('first fail')));
    });
    expect(result.current.error).toBe('write');
    await act(async () => {
      await result.current.run(() => Promise.resolve());
    });
    expect(result.current.error).toBeNull();
  });

  it('pending is false before run(), true during, false after success', async () => {
    const { result } = renderHook(() => useWriteRetry('test.source'));
    expect(result.current.pending).toBe(false);

    let resolveWrite!: () => void;
    const writePromise = new Promise<void>((r) => {
      resolveWrite = r;
    });

    let runPromise!: Promise<boolean>;
    act(() => {
      runPromise = result.current.run(() => writePromise);
    });

    expect(result.current.pending).toBe(true);

    await act(async () => {
      resolveWrite();
      await runPromise;
    });

    expect(result.current.pending).toBe(false);
  });

  it('pending is false after failure', async () => {
    const { result } = renderHook(() => useWriteRetry('test.source'));
    await act(async () => {
      await result.current.run(() => Promise.reject(new Error('fail')));
    });
    expect(result.current.pending).toBe(false);
    expect(result.current.error).toBe('write');
  });

  it('returns false immediately and does not call fn while already pending', async () => {
    const { result } = renderHook(() => useWriteRetry('test.source'));

    let resolveFirst!: () => void;
    const firstWrite = new Promise<void>((r) => {
      resolveFirst = r;
    });
    const secondFn = vi.fn().mockResolvedValue(undefined);

    let firstRunPromise!: Promise<boolean>;
    act(() => {
      firstRunPromise = result.current.run(() => firstWrite);
    });

    let secondResult: boolean | undefined;
    await act(async () => {
      secondResult = await result.current.run(secondFn);
    });

    expect(secondResult).toBe(false);
    expect(secondFn).not.toHaveBeenCalled();

    await act(async () => {
      resolveFirst();
      await firstRunPromise;
    });
  });

  it('passes the source string to reportError', async () => {
    const { result } = renderHook(() => useWriteRetry('announcements.write'));
    await act(async () => {
      await result.current.run(() => Promise.reject(new Error('db error')));
    });
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { source: 'announcements.write' });
  });
});
