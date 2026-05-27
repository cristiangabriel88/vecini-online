/**
 * Unit tests for T161: enabling a module via the regular per-feature Switch on
 * FeaturesAdminPage must clear that module's pending resident feature requests,
 * exactly as the triage "enable" action does.
 *
 * Before T161 the Switch only flipped the flag, leaving the satisfied request
 * rows behind in `featureRequestStore` (offline) / `feature_requests` (live).
 * The triage list hid them via `!flags[key]`, so they were invisible there but
 * still lingered. These tests pin the off->on toggle path to also clear them,
 * and confirm a disable (on->off) leaves requests untouched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- Module mocks (hoisted by vitest) ---

// Offline: no backend, so the stores' mirror calls stay no-ops.
vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

// Return the string fallback (2nd arg) when present so real feature titles are
// rendered (featureTitle/featureDescription pass the registry text as fallback);
// otherwise echo the key. This lets us locate a feature's Switch by its title.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) =>
      typeof fallback === 'string' ? fallback : key,
    i18n: { language: 'ro' },
  }),
}));

// --- Late imports (after mocks are declared) ---

import FeaturesAdminPage from '@/features/admin/FeaturesAdminPage';
import { useAuthStore } from '@/shared/store/authStore';
import { useFeatureStore } from '@/shared/features/featureStore';
import { useFeatureRequestStore } from '@/shared/store/featureRequestStore';
import { getFeature } from '@/shared/features/registry';

// ---

const ASOC = 'asoc-test';
// F01 (Anunțuri oficiale) is a stable, implemented feature with a unique title.
const KEY = 'F01';
const TITLE = getFeature(KEY)!.title;

/** Seed the active asociație, the module disabled, and one pending request. */
function seed() {
  useAuthStore.setState({ currentAsociatieId: ASOC, profile: null, memberships: [] });
  useFeatureStore.setState({ byAsociatie: { [ASOC]: { [KEY]: false } } });
  useFeatureRequestStore.setState({
    requests: [
      {
        id: 'r1',
        asociatieId: ASOC,
        featureKey: KEY,
        requestedById: 'u-resident',
        requestedByName: 'Ion Popescu',
        createdAt: Date.now(),
      },
    ],
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <FeaturesAdminPage />
    </MemoryRouter>,
  );
}

/** The per-feature Switch for KEY, identified by its title in the aria-label. */
function featureSwitch() {
  return screen.getByRole('switch', { name: new RegExp(TITLE) });
}

describe('FeaturesAdminPage: enabling a module clears its requests (T161)', () => {
  beforeEach(seed);
  afterEach(cleanup);

  it('clears pending requests when the module is enabled via the Switch', () => {
    renderPage();

    // Pre-condition: the request is present and the flag is off.
    expect(useFeatureRequestStore.getState().requests).toHaveLength(1);
    expect(useFeatureStore.getState().byAsociatie[ASOC][KEY]).toBe(false);

    fireEvent.click(featureSwitch());

    // The flag is now on and the satisfied request has been cleared.
    expect(useFeatureStore.getState().byAsociatie[ASOC][KEY]).toBe(true);
    expect(
      useFeatureRequestStore.getState().requests.filter((r) => r.featureKey === KEY),
    ).toHaveLength(0);
  });

  it('leaves requests untouched when the module is disabled via the Switch', () => {
    // Start enabled so the toggle goes on->off.
    useFeatureStore.setState({ byAsociatie: { [ASOC]: { [KEY]: true } } });
    renderPage();

    fireEvent.click(featureSwitch());

    expect(useFeatureStore.getState().byAsociatie[ASOC][KEY]).toBe(false);
    // Disabling must not clear the resident demand.
    expect(
      useFeatureRequestStore.getState().requests.filter((r) => r.featureKey === KEY),
    ).toHaveLength(1);
  });

  it('does not clear another module\'s requests when enabling one', () => {
    useFeatureRequestStore.setState({
      requests: [
        ...useFeatureRequestStore.getState().requests,
        {
          id: 'r2',
          asociatieId: ASOC,
          featureKey: 'F02',
          requestedById: 'u-resident',
          requestedByName: 'Maria Ionescu',
          createdAt: Date.now(),
        },
      ],
    });
    renderPage();

    fireEvent.click(featureSwitch());

    // F01 cleared, F02's request preserved.
    expect(
      useFeatureRequestStore.getState().requests.filter((r) => r.featureKey === KEY),
    ).toHaveLength(0);
    expect(
      useFeatureRequestStore.getState().requests.filter((r) => r.featureKey === 'F02'),
    ).toHaveLength(1);
  });
});
