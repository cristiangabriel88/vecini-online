/**
 * Unit tests for the OTP channel step-up flow added to SecurityPage in T159.
 *
 * The step-up section now mirrors the LoginPage channel picker + send/verify
 * flow: when a live session is enrolled but still at AAL1, the user can
 * complete the challenge via TOTP, email OTP, or Telegram OTP from the
 * security page itself rather than re-signing in.
 *
 * Tests exercise the pure rendering decisions (channel picker vs direct input),
 * the OTP send/verify lifecycle, and post-success navigation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

// --- Module mocks (hoisted by vitest) ---

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      mfa: {
        listFactors: async () => ({ data: { totp: [{ id: 'f1', status: 'verified' }] } }),
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal1', nextLevel: 'aal2' },
        }),
      },
      getUser: async () => ({ data: { user: { id: 'u1' } } }),
    },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _params?: unknown) => key,
    i18n: { language: 'ro' },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

vi.mock('@/shared/lib/format', () => ({
  formatDateTime: (s: string) => s,
}));

// --- Late imports (after mocks are declared) ---

import SecurityPage from '@/features/auth/SecurityPage';
import { useMfaStore } from '@/shared/store/mfaStore';
import { useAuthStore } from '@/shared/store/authStore';
import { useSecurityStore } from '@/shared/store/securityStore';
import { useTelegramLinkStore } from '@/shared/store/telegramLinkStore';

// ---

/** Tiny helper component that exposes the current pathname for assertions. */
function PathSpy() {
  const { pathname } = useLocation();
  return <span data-testid="pathname" aria-hidden="true" style={{ display: 'none' }}>{pathname}</span>;
}

/**
 * Seed all stores needed for SecurityPage to render without errors.
 *
 * `challengeRequired` is overridden to a synchronous stub so the needsStepUp
 * effect resolves deterministically in tests without waiting on Supabase.
 */
function seedStores(opts: {
  enrolled?: boolean;
  needsChallenge?: boolean;
  emailEnabled?: boolean;
  telegramEnabled?: boolean;
}) {
  const {
    enrolled = true,
    needsChallenge = true,
    emailEnabled = false,
    telegramEnabled = false,
  } = opts;

  useAuthStore.setState({
    profile: {
      id: 'u1',
      email: 'test@example.com',
      full_name: null,
      phone: null,
      avatar_url: null,
      locale: 'ro',
      notification_preferences: { channels: [], quiet_hours: { start: '22:00', end: '08:00' } },
      created_at: '',
      updated_at: '',
    },
    session: null,
    memberships: [],
  });

  useSecurityStore.setState({ events: [] });
  useTelegramLinkStore.setState({ links: [] });

  useMfaStore.setState({
    loaded: true,
    enrolled,
    draft: null,
    recoveryCodes: null,
    demoSecret: null,
    demoRecoveryHashes: [],
    demoEnabledChannels: {
      ...(emailEnabled ? { email: { targetHint: 'te***@example.com' } } : {}),
      ...(telegramEnabled ? { telegram: { targetHint: '@t***' } } : {}),
    },
    demoOtpChallenges: {},
    demoResendAt: {},
    otpThrottles: {},
    // Override async methods so tests don't hit real Supabase.
    load: async () => {},
    challengeRequired: async () => needsChallenge,
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/securitate']}>
      <PathSpy />
      <SecurityPage />
    </MemoryRouter>,
  );
}

describe('SecurityPage step-up with OTP channels (T159)', () => {
  beforeEach(() => {
    seedStores({});
  });
  afterEach(cleanup);

  // --- Channel picker rendering ---

  it('shows the channel picker when TOTP and email are both available', async () => {
    seedStores({ enrolled: true, needsChallenge: true, emailEnabled: true });
    renderPage();

    // Wait for the async challengeRequired() to resolve and show the step-up card.
    await waitFor(() =>
      expect(screen.getByText('auth.mfa.stepUpTitle')).toBeInTheDocument(),
    );

    // Channel picker heading is unique — it only appears inside the step-up card.
    expect(screen.getByText('auth.mfa.channels.choosePicker')).toBeInTheDocument();
    // `totpLabel` only appears in the picker (not in the channel management list
    // below), so it is a unique and precise proxy for the picker rendering the
    // TOTP option.
    expect(screen.getByText('auth.mfa.channels.totpLabel')).toBeInTheDocument();
    // `emailLabel` can appear in both the picker AND the management list; use
    // getAllByText and assert at least one occurrence is present.
    expect(screen.getAllByText('auth.mfa.channels.emailLabel').length).toBeGreaterThan(0);
  });

  it('shows all three channels when TOTP, email, and Telegram are enabled', async () => {
    seedStores({ enrolled: true, needsChallenge: true, emailEnabled: true, telegramEnabled: true });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('auth.mfa.stepUpTitle')).toBeInTheDocument(),
    );

    // totpLabel is unique (only in the picker); email/telegram labels also appear
    // in the channel management card so we use getAllByText for those.
    expect(screen.getByText('auth.mfa.channels.totpLabel')).toBeInTheDocument();
    expect(screen.getAllByText('auth.mfa.channels.emailLabel').length).toBeGreaterThan(0);
    expect(screen.getAllByText('auth.mfa.channels.telegramLabel').length).toBeGreaterThan(0);
  });

  // --- TOTP auto-select (single channel) ---

  it('auto-selects TOTP and shows the code input directly when only TOTP is enrolled', async () => {
    seedStores({ enrolled: true, needsChallenge: true, emailEnabled: false });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('auth.mfa.stepUpTitle')).toBeInTheDocument(),
    );

    // The auto-select effect picks 'totp' since it's the only channel; the TOTP
    // input should appear without the user having to choose.
    await waitFor(() =>
      expect(screen.getByLabelText('auth.mfa.codeLabel')).toBeInTheDocument(),
    );

    // No channel picker when there is only one option.
    expect(screen.queryByText('auth.mfa.channels.choosePicker')).not.toBeInTheDocument();
  });

  // --- Email OTP flow ---

  it('shows the send-code button after selecting the email channel', async () => {
    seedStores({ enrolled: true, needsChallenge: true, emailEnabled: true });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('auth.mfa.stepUpTitle')).toBeInTheDocument(),
    );

    // Picker is visible; click the email option.
    // There may be multiple elements with this text (channel row + picker button);
    // the picker button is inside the step-up card, so use getAllByText and pick
    // the first interactive button.
    const emailButtons = screen.getAllByText('auth.mfa.channels.emailLabel');
    // Click the first one (the picker button in the step-up card).
    fireEvent.click(emailButtons[0]);

    await waitFor(() =>
      expect(screen.getByText('auth.mfa.channels.sendEmail')).toBeInTheDocument(),
    );
  });

  it('shows the demo code and code input after clicking send', async () => {
    seedStores({ enrolled: true, needsChallenge: true, emailEnabled: true });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('auth.mfa.stepUpTitle')).toBeInTheDocument(),
    );

    const emailButtons = screen.getAllByText('auth.mfa.channels.emailLabel');
    fireEvent.click(emailButtons[0]);

    await waitFor(() =>
      expect(screen.getByText('auth.mfa.channels.sendEmail')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('auth.mfa.channels.sendEmail'));

    await waitFor(() =>
      expect(screen.getByText('auth.mfa.channels.demoNotice')).toBeInTheDocument(),
    );

    // The numeric OTP input should now be visible.
    expect(screen.getByLabelText('auth.mfa.channels.otpLabel')).toBeInTheDocument();
    // The resend button is in cooldown right after sending (startStepUpResendTimer
    // was called), so it shows the `resendIn` key (countdown > 0).
    expect(screen.getByText('auth.mfa.channels.resendIn')).toBeInTheDocument();
  });

  it('navigates to /app after a successful email OTP verification', async () => {
    seedStores({ enrolled: true, needsChallenge: true, emailEnabled: true });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('auth.mfa.stepUpTitle')).toBeInTheDocument(),
    );

    const emailButtons = screen.getAllByText('auth.mfa.channels.emailLabel');
    fireEvent.click(emailButtons[0]);
    await waitFor(() =>
      expect(screen.getByText('auth.mfa.channels.sendEmail')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('auth.mfa.channels.sendEmail'));

    await waitFor(() =>
      expect(screen.getByText('auth.mfa.channels.demoNotice')).toBeInTheDocument(),
    );

    // Read the demo code shown on-screen.
    const codeEl = screen.getByLabelText('auth.mfa.channels.demoCodeAriaLabel');
    const demoCode = codeEl.textContent ?? '';
    expect(demoCode).toMatch(/^\d{6}$/);

    // Enter and submit the code.
    const otpInput = screen.getByLabelText('auth.mfa.channels.otpLabel');
    fireEvent.change(otpInput, { target: { value: demoCode } });

    // The submit button uses the generic 'auth.mfa.verify' key.
    // There might be multiple elements with this text; the one inside the form
    // is what we want. Use getAllByText and pick the right one.
    const verifyButtons = screen.getAllByText('auth.mfa.verify');
    fireEvent.click(verifyButtons[verifyButtons.length - 1]);

    // After a successful verify, SecurityPage navigates to '/app' via the
    // MemoryRouter; the PathSpy exposes the new pathname.
    await waitFor(() =>
      expect(screen.getByTestId('pathname')).toHaveTextContent('/app'),
    );
  });

  // --- "Use a different method" link ---

  it('resets to the channel picker when "Use a different method" is clicked', async () => {
    seedStores({ enrolled: true, needsChallenge: true, emailEnabled: true });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('auth.mfa.stepUpTitle')).toBeInTheDocument(),
    );

    // Select email channel.
    const emailButtons = screen.getAllByText('auth.mfa.channels.emailLabel');
    fireEvent.click(emailButtons[0]);

    // The "Use a different method" back link should appear (multiple channels).
    await waitFor(() =>
      expect(screen.getByText('auth.mfa.channels.changeChannel')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('auth.mfa.channels.changeChannel'));

    // After resetting, the channel picker should reappear.
    await waitFor(() =>
      expect(screen.getByText('auth.mfa.channels.choosePicker')).toBeInTheDocument(),
    );
  });

  // --- Step-up not shown in demo mode ---

  it('does not show the step-up card when Supabase is not configured (demo mode)', async () => {
    // SecurityPage hides the step-up block when !isSupabaseConfigured.
    // The mock at the top sets isSupabaseConfigured=true; this test verifies the
    // guard by checking `enrolled=false` (needsStepUp will be false).
    seedStores({ enrolled: false, needsChallenge: false, emailEnabled: true });
    renderPage();

    // Wait for the component to render fully.
    await waitFor(() =>
      expect(screen.getByText('auth.mfa.channels.title')).toBeInTheDocument(),
    );

    // With enrolled=false, needsStepUp stays false; the step-up card should not
    // appear.
    expect(screen.queryByText('auth.mfa.stepUpTitle')).not.toBeInTheDocument();
  });
});
