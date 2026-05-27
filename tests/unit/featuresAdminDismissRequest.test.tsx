/**
 * Unit tests for T162: the admin feature-request triage queue offers a secondary
 * "dismiss / respinge" action that clears a module's pending resident requests
 * WITHOUT enabling the module, behind a confirm step, recording a distinct audit
 * event so the decision stays traceable.
 *
 * Contrast with T161 (enable-via-Switch clears requests): dismissing must leave
 * the feature flag untouched (still off) while removing the demand, and must log
 * `feature.request_dismissed` rather than `feature.enabled`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// --- Module mocks (hoisted by vitest) ---

// Offline: no backend, so the stores' mirror calls stay no-ops.
vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

// Echo the i18n key (no fallback string here) so we can locate controls by key.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && typeof opts === 'object' && 'feature' in opts
        ? `${key}:${String((opts as { feature: unknown }).feature)}`
        : key,
    i18n: { language: 'ro' },
  }),
}));

// --- Late imports (after mocks are declared) ---

import FeaturesAdminPage from '@/features/admin/FeaturesAdminPage';
import { useAuthStore } from '@/shared/store/authStore';
import { useFeatureStore } from '@/shared/features/featureStore';
import { useFeatureRequestStore } from '@/shared/store/featureRequestStore';
import { useAuditStore } from '@/shared/store/auditStore';

// ---

const ASOC = 'asoc-test';
const KEY = 'F01';

/** Seed the active asociație, the module disabled, one pending request, no audit. */
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
  useAuditStore.setState({ byAsociatie: {} });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <FeaturesAdminPage />
    </MemoryRouter>,
  );
}

/** The triage-row dismiss button (the only one before the confirm modal opens). */
function rowDismissButton() {
  return screen.getByRole('button', { name: /features\.requestDismiss/ });
}

function asocAudit() {
  return useAuditStore.getState().byAsociatie[ASOC] ?? [];
}

describe('FeaturesAdminPage: dismiss a feature request without enabling (T162)', () => {
  beforeEach(seed);
  afterEach(cleanup);

  it('clears the requests, leaves the flag off, and logs a dismissal after confirm', () => {
    renderPage();

    // Opening the confirm does not yet mutate anything.
    fireEvent.click(rowDismissButton());
    expect(useFeatureRequestStore.getState().requests).toHaveLength(1);
    expect(asocAudit()).toHaveLength(0);

    // Confirm inside the dialog.
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /features\.requestDismiss/ }));

    // Demand cleared, but the module stays OFF (the distinction vs. enable).
    expect(
      useFeatureRequestStore.getState().requests.filter((r) => r.featureKey === KEY),
    ).toHaveLength(0);
    expect(useFeatureStore.getState().byAsociatie[ASOC][KEY]).toBe(false);

    // A traceable, dismissal-specific audit entry was recorded.
    const audit = asocAudit();
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe('feature.request_dismissed');
    expect(audit[0].entity_label).toBe(KEY);
    expect(audit[0].before).toBe('requested');
    expect(audit[0].after).toBe('dismissed');
  });

  it('cancelling the confirm leaves the request and flag untouched', () => {
    renderPage();

    fireEvent.click(rowDismissButton());
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /common\.cancel/ }));

    expect(useFeatureRequestStore.getState().requests).toHaveLength(1);
    expect(useFeatureStore.getState().byAsociatie[ASOC][KEY]).toBe(false);
    expect(asocAudit()).toHaveLength(0);
  });

  it('dismissing one module does not clear another module\'s requests', () => {
    // F01 is the freshest request, so the triage queue (sorted newest-first)
    // renders its row on top, making its dismiss button index deterministic.
    useFeatureRequestStore.setState({
      requests: [
        { ...useFeatureRequestStore.getState().requests[0], createdAt: 2000 },
        {
          id: 'r2',
          asociatieId: ASOC,
          featureKey: 'F02',
          requestedById: 'u-resident',
          requestedByName: 'Maria Ionescu',
          createdAt: 1000,
        },
      ],
    });
    renderPage();

    // Both rows render a dismiss button; the top row (newest, F01) is index 0.
    const dismissButtons = screen.getAllByRole('button', { name: /features\.requestDismiss/ });
    fireEvent.click(dismissButtons[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /features\.requestDismiss/ }));

    expect(
      useFeatureRequestStore.getState().requests.filter((r) => r.featureKey === KEY),
    ).toHaveLength(0);
    expect(
      useFeatureRequestStore.getState().requests.filter((r) => r.featureKey === 'F02'),
    ).toHaveLength(1);
  });
});
