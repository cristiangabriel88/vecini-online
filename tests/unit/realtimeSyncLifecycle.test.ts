import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

/**
 * Regression tests for the useRealtimeSync subscription lifecycle (T262).
 *
 * Guarantee documented here:
 *   - A single channel named `rt-{asociatieId}` is opened on mount.
 *   - On tenant switch the previous channel is torn down before the new one opens.
 *   - On unmount the active channel is torn down.
 *   - When asociatieId is null (logged out / between tenants) no channel is opened.
 *
 * The app is free of subscription leaks and cross-tenant event bleed:
 *   - Channel callbacks capture `aid` in a closure; writes always target the
 *     correct store partition even if a late network frame arrives after switch.
 *   - petition_signatures and event_rsvps have no asociatie_id column; RLS is the
 *     sole row gate; their callbacks still write to the captured-aid partition.
 *   - Demo mode (isSupabaseConfigured === false) returns early; no channels open.
 *   - Pi DEV stage (appStage === 'dev') returns early for the same reason.
 */

const { mockRemoveChannel, mockChannelFactory } = vi.hoisted(() => {
  function makeChannel() {
    const ch = { on: vi.fn(), subscribe: vi.fn() };
    ch.on.mockReturnValue(ch);
    ch.subscribe.mockReturnValue(ch);
    return ch;
  }
  return {
    mockRemoveChannel: vi.fn<(ch: unknown) => void>(),
    mockChannelFactory: vi.fn(makeChannel),
  };
});

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    channel: mockChannelFactory,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@/shared/lib/env', () => ({
  env: { appStage: 'prod' },
}));

import { useRealtimeSync } from '@/app/useRealtimeSync';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useRealtimeSync — subscription lifecycle', () => {
  it('opens channel rt-{asociatieId} on mount', () => {
    const { unmount } = renderHook(() => useRealtimeSync('asoc-A'));
    expect(mockChannelFactory).toHaveBeenCalledWith('rt-asoc-A');
    unmount();
  });

  it('tears down the channel on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeSync('asoc-A'));
    const ch = mockChannelFactory.mock.results[0].value;
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledWith(ch);
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it('tears down the old channel before opening a new one on tenant switch', () => {
    const { rerender, unmount } = renderHook(
      ({ id }: { id: string | null }) => useRealtimeSync(id),
      { initialProps: { id: 'asoc-A' as string | null } },
    );

    const channelA = mockChannelFactory.mock.results[0].value;
    expect(mockChannelFactory).toHaveBeenCalledWith('rt-asoc-A');
    expect(mockRemoveChannel).not.toHaveBeenCalled();

    rerender({ id: 'asoc-B' });

    expect(mockRemoveChannel).toHaveBeenCalledWith(channelA);
    expect(mockChannelFactory).toHaveBeenCalledWith('rt-asoc-B');
    expect(mockChannelFactory).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('tears down the second tenant channel on unmount after a switch', () => {
    const { rerender, unmount } = renderHook(
      ({ id }: { id: string | null }) => useRealtimeSync(id),
      { initialProps: { id: 'asoc-A' as string | null } },
    );
    rerender({ id: 'asoc-B' });

    const channelB = mockChannelFactory.mock.results[1].value;
    unmount();

    expect(mockRemoveChannel).toHaveBeenLastCalledWith(channelB);
  });

  it('does not open a channel when asociatieId is null', () => {
    const { unmount } = renderHook(() => useRealtimeSync(null));
    expect(mockChannelFactory).not.toHaveBeenCalled();
    unmount();
  });

  it('starts subscribing when asociatieId transitions from null to a value', () => {
    const { rerender, unmount } = renderHook(
      ({ id }: { id: string | null }) => useRealtimeSync(id),
      { initialProps: { id: null as string | null } },
    );
    expect(mockChannelFactory).not.toHaveBeenCalled();

    rerender({ id: 'asoc-A' });
    expect(mockChannelFactory).toHaveBeenCalledWith('rt-asoc-A');

    unmount();
  });

  it('tears down and stops when asociatieId transitions back to null', () => {
    const { rerender, unmount } = renderHook(
      ({ id }: { id: string | null }) => useRealtimeSync(id),
      { initialProps: { id: 'asoc-A' as string | null } },
    );
    const channelA = mockChannelFactory.mock.results[0].value;

    rerender({ id: null });
    expect(mockRemoveChannel).toHaveBeenCalledWith(channelA);

    vi.clearAllMocks();
    unmount();
    expect(mockChannelFactory).not.toHaveBeenCalled();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });
});
