import { describe, it, expect, beforeEach } from 'vitest';
import { triggerErasure, triggerRetentionPurge } from '@/features/gdpr/gdprErasureApi';
import { useGdprStore } from '@/shared/store/gdprStore';

// Supabase is not configured in the test environment, so all API calls are
// expected to be no-ops that return { ok: false, error: 'not-configured' }.

beforeEach(() => {
  useGdprStore.setState({ requests: [], erasedUserIds: [] });
});

describe('triggerErasure (offline path)', () => {
  it('returns not-configured when supabase is absent', async () => {
    const result = await triggerErasure('dsr-test-1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-configured');
  });

  it('returns not-configured when requestId is empty', async () => {
    const result = await triggerErasure('');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-configured');
  });
});

describe('triggerRetentionPurge (offline path)', () => {
  it('returns not-configured when supabase is absent', async () => {
    const result = await triggerRetentionPurge();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-configured');
  });
});

describe('gdprStore erasure flow', () => {
  it('marks erasedUserIds when erasure is completed', () => {
    useGdprStore.getState().request('erasure', 'user-1', 'Ion Popescu', 'asoc-1');
    const stored = useGdprStore.getState().requests[0];
    useGdprStore.getState().action(stored.id, 'completed', 'admin-1');
    expect(useGdprStore.getState().isErased('user-1')).toBe(true);
  });

  it('does not mark erasedUserIds for rejected erasure', () => {
    useGdprStore.getState().request('erasure', 'user-2', 'Maria Ionescu', 'asoc-1');
    const stored = useGdprStore.getState().requests[0];
    useGdprStore.getState().action(stored.id, 'rejected', 'admin-1');
    expect(useGdprStore.getState().isErased('user-2')).toBe(false);
  });

  it('does not mark erasedUserIds for completed export request', () => {
    useGdprStore.getState().request('export', 'user-3', 'Vasile Stan', 'asoc-1');
    const stored = useGdprStore.getState().requests[0];
    useGdprStore.getState().action(stored.id, 'completed', 'admin-1');
    expect(useGdprStore.getState().isErased('user-3')).toBe(false);
  });

  it('does not double-add to erasedUserIds on repeated action', () => {
    useGdprStore.getState().request('erasure', 'user-4', 'Ana Pavel', 'asoc-1');
    const stored = useGdprStore.getState().requests[0];
    useGdprStore.getState().action(stored.id, 'completed', 'admin-1');
    // A second action call on an already-completed request is a no-op.
    useGdprStore.getState().action(stored.id, 'completed', 'admin-1');
    expect(useGdprStore.getState().erasedUserIds.filter((id) => id === 'user-4')).toHaveLength(1);
  });


});
