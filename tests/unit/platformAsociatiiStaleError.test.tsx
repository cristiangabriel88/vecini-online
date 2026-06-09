/**
 * Unit test for the associations list page: a stale fetch error left in the
 * store (e.g. persisted from a previous failed session) must NOT block this
 * session's list from rendering. On mount the page clears the stale error
 * before hydrating, so the live associations render normally.
 *
 * No demo/dev/offline fallback is exercised here: Supabase is mocked as not
 * configured purely so `hydrateAsociatiiList` is a no-op (no network in unit
 * tests); the behaviour under test is the mount-time error clear, which runs
 * regardless of stage.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// No backend in unit tests, so hydrateAsociatiiList returns immediately.
vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

// Echo i18n keys so we can assert on stable strings.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) =>
      opts && typeof opts === 'object' && 'count' in (opts as Record<string, unknown>)
        ? `${key}:${(opts as { count: number }).count}`
        : key,
    i18n: { language: 'ro' },
  }),
}));

import PlatformAsociatiiPage from '@/platform/PlatformAsociatiiPage';
import { usePlatformAsociatiiStore } from '@/platform/platformAsociatiiStore';
import { DEMO_PLATFORM_ASOCIATII } from '@/platform/demoPlatform';

function renderPage() {
  return render(
    <MemoryRouter>
      <PlatformAsociatiiPage />
    </MemoryRouter>,
  );
}

describe('PlatformAsociatiiPage: stale fetch error does not block the list', () => {
  beforeEach(() => {
    // Seed a stale fetch error, as if persisted from a prior failed session.
    usePlatformAsociatiiStore.setState({
      asociatii: DEMO_PLATFORM_ASOCIATII,
      fetchError: 'load',
      listFilter: 'all',
    });
  });
  afterEach(cleanup);

  it('clears the stale fetch error on mount', () => {
    expect(usePlatformAsociatiiStore.getState().fetchError).toBe('load');
    renderPage();
    expect(usePlatformAsociatiiStore.getState().fetchError).toBeNull();
  });

  it('renders the associations list instead of the error state', () => {
    renderPage();
    // The list section heading is shown...
    expect(screen.getByText('platform.asociatii.listTitle')).toBeInTheDocument();
    // ...a seeded association renders...
    expect(
      screen.getByText('Asociația de Proprietari Bloc 7, Aleea Crinului'),
    ).toBeInTheDocument();
    // ...and the fetch-error body is NOT rendered.
    expect(screen.queryByText('common.loadError')).not.toBeInTheDocument();
  });
});

describe('platformAsociatiiStore: fetchError is not persisted', () => {
  it('omits the transient fetchError from the persisted snapshot', () => {
    // partialize must strip fetchError so a stale error can never rehydrate.
    const persistApi = (usePlatformAsociatiiStore as unknown as {
      persist: { getOptions: () => { partialize?: (s: Record<string, unknown>) => Record<string, unknown> } };
    }).persist;
    const partialize = persistApi.getOptions().partialize;
    expect(partialize).toBeTypeOf('function');
    const snapshot = partialize!({ fetchError: 'load', asociatii: [], listFilter: 'all' });
    expect(snapshot).not.toHaveProperty('fetchError');
    expect(snapshot).toHaveProperty('asociatii');
  });
});
