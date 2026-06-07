import { useState } from 'react';
import { reportError } from './errorReporting';

export interface WriteRetryHandle {
  /** Execute fn. Returns true on success; returns false and sets error on failure. */
  run: (fn: () => Promise<void>) => Promise<boolean>;
  pending: boolean;
  /** 'write' when the last run failed; null otherwise. */
  error: string | null;
  clearError: () => void;
}

/**
 * Wraps an async write with error-reporting and retry state.
 *
 * On failure: reports via reportError, sets error to 'write', returns false.
 * On success: clears error, returns true.
 *
 * Compose with useUnsavedGuard: call clearDirty() only when run() returns true
 * so the guard keeps the user's unsaved input reachable on failure.
 */
export function useWriteRetry(source: string): WriteRetryHandle {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>): Promise<boolean> => {
    if (pending) return false;
    setPending(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      reportError(err instanceof Error ? err : new Error(String(err)), { source });
      setError('write');
      return false;
    } finally {
      setPending(false);
    }
  };

  return { run, pending, error, clearError: () => setError(null) };
}
