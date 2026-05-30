import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';

// Mock Supabase as configured but with all queries throwing — simulates live network failure.
vi.mock('@/shared/lib/supabase', () => {
  const fail = () => { throw new Error('supabase unavailable'); };
  const qb: Record<string, unknown> = {};
  qb.select = () => qb;
  qb.eq = () => qb;
  qb.is = () => qb;
  qb.order = fail;
  qb.maybeSingle = fail;
  qb.update = () => qb;
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: () => qb,
      rpc: fail,
    },
  };
});

// Spy on reportError while preserving all other exports from errorReporting.
vi.mock('@/shared/lib/errorReporting', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/errorReporting')>();
  return { ...actual, reportError: vi.fn() };
});

import { reportError } from '@/shared/lib/errorReporting';
import { hydrateAnnouncements } from '@/features/announcements/announcementsApi';
import { hydrateTickets } from '@/features/tickets/ticketsApi';
import { hydrateThreads } from '@/features/discussions/discussionApi';
import { useAuthStore } from '@/shared/store/authStore';
import { useAnnouncementsStore } from '@/features/announcements/announcementsStore';
import { useTicketsStore } from '@/features/tickets/ticketsStore';
import { useDiscussionStore } from '@/features/discussions/discussionStore';

const ASOC = 'asoc-err-test';

beforeEach(() => {
  vi.mocked(reportError).mockClear();
  useAnnouncementsStore.setState({ fetchError: null });
  useTicketsStore.setState({ fetchError: null });
  useDiscussionStore.setState({ fetchError: null });
});

describe('store error reporting (T84)', () => {
  it('hydrateAnnouncements calls reportError with source announcementsApi.hydrate when Supabase throws', async () => {
    await hydrateAnnouncements(ASOC);
    expect(vi.mocked(reportError)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'announcementsApi.hydrate' }),
    );
  });

  it('hydrateAnnouncements still sets fetchError when Supabase throws', async () => {
    await hydrateAnnouncements(ASOC);
    expect(useAnnouncementsStore.getState().fetchError).toBe('load');
  });

  it('hydrateTickets calls reportError with source ticketsApi.hydrate when Supabase throws', async () => {
    await hydrateTickets(ASOC);
    expect(vi.mocked(reportError)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'ticketsApi.hydrate' }),
    );
  });

  it('hydrateTickets still sets fetchError when Supabase throws', async () => {
    await hydrateTickets(ASOC);
    expect(useTicketsStore.getState().fetchError).toBe('load');
  });

  it('hydrateThreads calls reportError with source discussionApi.hydrate when Supabase throws', async () => {
    await hydrateThreads(ASOC);
    expect(vi.mocked(reportError)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'discussionApi.hydrate' }),
    );
  });

  it('hydrateThreads still sets fetchError when Supabase throws', async () => {
    await hydrateThreads(ASOC);
    expect(useDiscussionStore.getState().fetchError).toBe('load');
  });

  it('authStore.hydrate calls reportError with source authStore.hydrate when Supabase throws', async () => {
    useAuthStore.setState({ session: { user: { id: 'u-hydrate-test' } } as unknown as Session });
    await useAuthStore.getState().hydrate();
    expect(vi.mocked(reportError)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'authStore.hydrate' }),
    );
  });

  it('authStore.hydrate resets hydrating to false even when Supabase throws', async () => {
    useAuthStore.setState({ session: { user: { id: 'u-hydrate-test' } } as unknown as Session });
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().hydrating).toBe(false);
  });

  it('hydrateAnnouncements does not call reportError when asociatieId is empty (guard fires)', async () => {
    await hydrateAnnouncements('');
    expect(vi.mocked(reportError)).not.toHaveBeenCalled();
  });
});
