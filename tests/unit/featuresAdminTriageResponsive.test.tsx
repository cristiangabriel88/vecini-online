/**
 * Unit tests for T167: the triage-row layout wraps actions below the meta on
 * narrow viewports instead of crowding everything into a single row. The DOM
 * structure verification here complements the click-level tests in
 * featuresAdminDismissRequest.test.tsx and featuresAdminToggleClears.test.tsx.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && typeof opts === 'object' && 'feature' in opts
        ? `${key}:${String((opts as { feature: unknown }).feature)}`
        : key,
    i18n: { language: 'ro' },
  }),
}));

import FeaturesAdminPage from '@/features/admin/FeaturesAdminPage';
import { useAuthStore } from '@/shared/store/authStore';
import { useFeatureStore } from '@/shared/features/featureStore';
import { useFeatureRequestStore } from '@/shared/store/featureRequestStore';
import { useAuditStore } from '@/shared/store/auditStore';

const ASOC = 'asoc-responsive';
const KEY = 'F01';

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

describe('FeaturesAdminPage: triage-row responsive layout (T167)', () => {
  beforeEach(seed);
  afterEach(cleanup);

  it('renders both action buttons alongside the triage row', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /features\.requestDismiss/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /features\.requestEnable/ })).toBeInTheDocument();
  });

  it('places both action buttons in the same container (stack together on narrow screens)', () => {
    renderPage();
    const dismissBtn = screen.getByRole('button', { name: /features\.requestDismiss/ });
    const enableBtn = screen.getByRole('button', { name: /features\.requestEnable/ });
    // Both buttons must share a direct parent so they wrap together as a unit
    expect(dismissBtn.parentElement).toBe(enableBtn.parentElement);
  });

  it('keeps action buttons in a separate container from the feature title', () => {
    renderPage();
    const enableBtn = screen.getByRole('button', { name: /features\.requestEnable/ });
    const actionsContainer = enableBtn.parentElement!;
    // The feature key text should NOT be inside the actions container
    expect(actionsContainer.textContent).not.toContain(KEY);
  });

  it('the triage row outer div has responsive stacking classes', () => {
    renderPage();
    const enableBtn = screen.getByRole('button', { name: /features\.requestEnable/ });
    // actions container -> triage row
    const triageRow = enableBtn.parentElement!.parentElement!;
    expect(triageRow.className).toMatch(/flex-col/);
    expect(triageRow.className).toMatch(/sm:flex-row/);
  });
});
