import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

export type GuardModal = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Returns true when `current` differs from `initial` (JSON equality).
 * Exported so the dirty-tracking logic can be unit-tested without a router.
 */
export function isFormDirty<T>(current: T, initial: T): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}

/**
 * Blocks in-app navigation and the browser beforeunload event when `isDirty`.
 * Returns `guardModal` (open + callbacks) to pass to <UnsavedChangesModal>,
 * and `clearDirty()` to call before a programmatic navigate after a successful
 * save so the guard does not intercept the post-save redirect.
 *
 * Requires a data router context (createBrowserRouter / createMemoryRouter).
 */
export function useUnsavedGuard(isDirty: boolean): {
  guardModal: GuardModal;
  clearDirty: () => void;
} {
  const bypassRef = useRef(false);

  const blocker = useBlocker(() => !bypassRef.current && isDirty);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !bypassRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const clearDirty = () => {
    bypassRef.current = true;
  };

  return {
    guardModal: {
      open: blocker.state === 'blocked',
      onConfirm: () => {
        if (blocker.state === 'blocked') blocker.proceed();
      },
      onCancel: () => {
        if (blocker.state === 'blocked') blocker.reset();
      },
    },
    clearDirty,
  };
}
