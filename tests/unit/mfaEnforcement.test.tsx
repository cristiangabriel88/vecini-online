import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import type { Role } from '@/shared/types/domain';
import {
  MFA_SECURITY_PATH,
  mfaEnforcementRedirect,
  parseSecurityEnforcement,
} from '@/features/auth/mfaLogic';

// The hook reads `isSupabaseConfigured` to gate on the live path; force it true
// so the render harness exercises the live (backed) enforcement. The stores also
// import the supabase client, so a minimal stub is provided for the module graph
// (incl. the AAL read the live `challengeRequired()` calls, defaulting to aal2).
vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      // getSession is called by useMfaEnforcement (T143) to decode the app_2fa_at claim.
      // A null session means no app-managed elevation in these tests.
      getSession: async () => ({ data: { session: null } }),
      mfa: {
        listFactors: async () => ({ data: { totp: [] } }),
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal2', nextLevel: 'aal2' },
        }),
      },
    },
  },
}));

import { useMfaEnforcement } from '@/app/useMfaEnforcement';
import { useAuthStore } from '@/shared/store/authStore';
import { useMfaStore } from '@/shared/store/mfaStore';
import { env } from '@/shared/lib/env';

/** Build the inputs for the pure predicate with sensible live-path defaults. */
function input(over: Partial<Parameters<typeof mfaEnforcementRedirect>[0]> = {}) {
  return {
    supabaseConfigured: true,
    loaded: true,
    role: 'admin' as Role | null,
    enrolled: false,
    pathname: '/app/anunturi',
    ...over,
  };
}

describe('mfaEnforcementRedirect (pure decision)', () => {
  it('steers a privileged, un-enrolled live session to the security page', () => {
    expect(mfaEnforcementRedirect(input())).toBe(MFA_SECURITY_PATH);
    for (const role of ['super_admin', 'admin', 'presedinte', 'comitet', 'cenzor'] as const) {
      expect(mfaEnforcementRedirect(input({ role }))).toBe(MFA_SECURITY_PATH);
    }
  });

  it('never gates demo mode (no backend configured)', () => {
    expect(mfaEnforcementRedirect(input({ supabaseConfigured: false }))).toBeNull();
  });

  it('does not steer before the enrolment status is known', () => {
    expect(mfaEnforcementRedirect(input({ loaded: false }))).toBeNull();
  });

  it('does not gate a non-privileged role', () => {
    expect(mfaEnforcementRedirect(input({ role: 'proprietar' }))).toBeNull();
    expect(mfaEnforcementRedirect(input({ role: 'locatar' }))).toBeNull();
    expect(mfaEnforcementRedirect(input({ role: null }))).toBeNull();
  });

  it('does not steer once a verified factor is enrolled (AAL axis omitted)', () => {
    expect(mfaEnforcementRedirect(input({ enrolled: true }))).toBeNull();
  });

  it('re-gates an enrolled session that has not satisfied the AAL2 challenge (T102)', () => {
    expect(mfaEnforcementRedirect(input({ enrolled: true, aalSatisfied: false }))).toBe(
      MFA_SECURITY_PATH,
    );
    for (const role of ['super_admin', 'admin', 'presedinte', 'comitet', 'cenzor'] as const) {
      expect(
        mfaEnforcementRedirect(input({ role, enrolled: true, aalSatisfied: false })),
      ).toBe(MFA_SECURITY_PATH);
    }
  });

  it('allows an enrolled session once the AAL2 challenge is satisfied', () => {
    expect(mfaEnforcementRedirect(input({ enrolled: true, aalSatisfied: true }))).toBeNull();
  });

  it('does not re-gate an un-enrolled session on the AAL axis (enrolment check wins)', () => {
    // An un-enrolled session is steered to enrol regardless of the AAL flag.
    expect(mfaEnforcementRedirect(input({ enrolled: false, aalSatisfied: true }))).toBe(
      MFA_SECURITY_PATH,
    );
    expect(mfaEnforcementRedirect(input({ enrolled: false, aalSatisfied: false }))).toBe(
      MFA_SECURITY_PATH,
    );
  });

  it('does not loop on the security page even when AAL is unsatisfied', () => {
    expect(
      mfaEnforcementRedirect(
        input({ enrolled: true, aalSatisfied: false, pathname: MFA_SECURITY_PATH }),
      ),
    ).toBeNull();
  });

  it('does not loop when already on the security page', () => {
    expect(mfaEnforcementRedirect(input({ pathname: MFA_SECURITY_PATH }))).toBeNull();
  });

  it('honours a custom security path', () => {
    expect(mfaEnforcementRedirect(input({ securityPath: '/app/2fa' }))).toBe('/app/2fa');
    expect(mfaEnforcementRedirect(input({ pathname: '/app/2fa', securityPath: '/app/2fa' }))).toBeNull();
  });

  // Self-hosted / Pi relaxed enforcement (VITE_SECURITY_ENFORCEMENT=relaxed): a
  // live, Supabase-configured admin must NOT be forced onto the security page on
  // every route, while strict mode (the production default) keeps enforcing.
  it('relaxed mode does not force a live privileged session to the security page', () => {
    // Same live, privileged, un-enrolled session that strict mode would gate.
    expect(mfaEnforcementRedirect(input())).toBe(MFA_SECURITY_PATH);
    expect(mfaEnforcementRedirect(input({ enforcement: 'relaxed' }))).toBeNull();
    for (const role of ['super_admin', 'admin', 'presedinte', 'comitet', 'cenzor'] as const) {
      expect(mfaEnforcementRedirect(input({ role, enforcement: 'relaxed' }))).toBeNull();
    }
  });

  it('relaxed mode does not re-gate an enrolled-but-AAL1 session either', () => {
    expect(mfaEnforcementRedirect(input({ enrolled: true, aalSatisfied: false }))).toBe(
      MFA_SECURITY_PATH,
    );
    expect(
      mfaEnforcementRedirect(input({ enrolled: true, aalSatisfied: false, enforcement: 'relaxed' })),
    ).toBeNull();
  });

  it('strict mode (explicit or default) still enforces 2FA where intended', () => {
    expect(mfaEnforcementRedirect(input({ enforcement: 'strict' }))).toBe(MFA_SECURITY_PATH);
    expect(mfaEnforcementRedirect(input())).toBe(MFA_SECURITY_PATH); // default == strict
  });

  it('relaxed mode never gates demo/offline mode either (no backend)', () => {
    expect(
      mfaEnforcementRedirect(input({ supabaseConfigured: false, enforcement: 'relaxed' })),
    ).toBeNull();
    expect(
      mfaEnforcementRedirect(input({ supabaseConfigured: false, enforcement: 'strict' })),
    ).toBeNull();
  });
});

describe('parseSecurityEnforcement', () => {
  it('defaults to strict for unset/empty/unknown values', () => {
    expect(parseSecurityEnforcement(undefined)).toBe('strict');
    expect(parseSecurityEnforcement(null)).toBe('strict');
    expect(parseSecurityEnforcement('')).toBe('strict');
    expect(parseSecurityEnforcement('  ')).toBe('strict');
    expect(parseSecurityEnforcement('bananas')).toBe('strict');
    expect(parseSecurityEnforcement('STRICT')).toBe('strict');
  });

  it('resolves an explicit relaxed (case/whitespace-insensitive)', () => {
    expect(parseSecurityEnforcement('relaxed')).toBe('relaxed');
    expect(parseSecurityEnforcement('  RELAXED  ')).toBe('relaxed');
  });
});

/** Seed the active role via a single membership and matching currentAsociatieId. */
function seedRole(role: Role | null) {
  useAuthStore.setState({
    memberships: role
      ? [{ id: 'm1', user_id: 'u1', asociatie_id: 'a1', role, title: null, joined_at: '', ended_at: null }]
      : [],
    currentAsociatieId: role ? 'a1' : null,
  });
}

/**
 * Seed the resolved enrolment status, neutralise the async live `load()`, and
 * stub `challengeRequired()` so the hook's AAL resolution is deterministic
 * (defaults to satisfied = no pending challenge).
 */
function seedMfa(opts: { loaded: boolean; enrolled: boolean; needsChallenge?: boolean }) {
  useMfaStore.setState({
    loaded: opts.loaded,
    enrolled: opts.enrolled,
    load: async () => {},
    challengeRequired: async () => opts.needsChallenge ?? false,
  });
}

function Harness() {
  useMfaEnforcement();
  const { pathname } = useLocation();
  return <span data-testid="path">{pathname}</span>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Harness />
    </MemoryRouter>,
  );
}

describe('useMfaEnforcement (live routing harness)', () => {
  beforeEach(() => {
    seedRole(null);
    seedMfa({ loaded: false, enrolled: false });
  });
  afterEach(cleanup);

  it('routes a privileged, un-enrolled session to the security page (cannot reach another route)', async () => {
    seedRole('admin');
    seedMfa({ loaded: true, enrolled: false });
    renderAt('/app/anunturi');
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(MFA_SECURITY_PATH));
  });

  it('lets a privileged session stay on the security page to enrol', async () => {
    seedRole('comitet');
    seedMfa({ loaded: true, enrolled: false });
    renderAt(MFA_SECURITY_PATH);
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(MFA_SECURITY_PATH));
  });

  it('does not steer a privileged session that has enrolled and satisfied AAL2', async () => {
    seedRole('admin');
    seedMfa({ loaded: true, enrolled: true, needsChallenge: false });
    renderAt('/app/anunturi');
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/app/anunturi'));
  });

  it('re-gates an enrolled-but-AAL1 privileged session to the security page (T102)', async () => {
    seedRole('admin');
    seedMfa({ loaded: true, enrolled: true, needsChallenge: true });
    renderAt('/app/anunturi');
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(MFA_SECURITY_PATH));
  });

  it('does not re-gate a resident even when a challenge is pending', async () => {
    seedRole('proprietar');
    seedMfa({ loaded: true, enrolled: true, needsChallenge: true });
    renderAt('/app/anunturi');
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/app/anunturi'));
  });

  it('does not gate a resident', async () => {
    seedRole('proprietar');
    seedMfa({ loaded: true, enrolled: false });
    renderAt('/app/anunturi');
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/app/anunturi'));
  });

  it('does not steer before the enrolment status has loaded', async () => {
    seedRole('admin');
    seedMfa({ loaded: false, enrolled: false });
    renderAt('/app/anunturi');
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/app/anunturi'));
  });
});

/**
 * T112: the gate re-resolves the AAL on every navigation rather than caching it,
 * so a session that completes the in-app step-up (elevating to AAL2) can leave
 * the security page into the shell instead of being bounced back.
 */
describe('useMfaEnforcement re-resolves AAL on navigation (T112)', () => {
  beforeEach(() => {
    seedRole('admin');
  });
  afterEach(cleanup);

  function NavHarness() {
    useMfaEnforcement();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    return (
      <>
        <span data-testid="path">{pathname}</span>
        <button onClick={() => navigate('/app/anunturi')}>go</button>
      </>
    );
  }

  function renderNavAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <NavHarness />
      </MemoryRouter>,
    );
  }

  it('lets the session into the shell once the AAL2 challenge is satisfied in-session', async () => {
    // Enrolled but at AAL1 to begin with; the gate kept it on the security page.
    let needsChallenge = true;
    useMfaStore.setState({
      loaded: true,
      enrolled: true,
      load: async () => {},
      challengeRequired: async () => needsChallenge,
    });
    renderNavAt(MFA_SECURITY_PATH);
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(MFA_SECURITY_PATH));

    // Completing the in-app step-up elevates the session to AAL2.
    needsChallenge = false;
    fireEvent.click(screen.getByText('go'));

    // The gate re-resolves the now-satisfied AAL and does NOT bounce it back.
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/app/anunturi'));
  });

  it('still bounces a session that navigates while the AAL2 challenge is unsatisfied', async () => {
    useMfaStore.setState({
      loaded: true,
      enrolled: true,
      load: async () => {},
      challengeRequired: async () => true,
    });
    renderNavAt(MFA_SECURITY_PATH);
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(MFA_SECURITY_PATH));

    fireEvent.click(screen.getByText('go'));

    // Re-gated: a still-AAL1 session cannot reach the shell.
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(MFA_SECURITY_PATH));
  });
});

/**
 * Relaxed enforcement (VITE_SECURITY_ENFORCEMENT=relaxed) end to end through the
 * hook: a live, Supabase-configured, privileged, un-enrolled admin can navigate
 * normal app pages instead of being trapped on /app/securitate. The default
 * (strict) hook behaviour is covered above; here we flip env to relaxed.
 */
describe('useMfaEnforcement honours relaxed enforcement', () => {
  const original = env.securityEnforcement;
  beforeEach(() => {
    env.securityEnforcement = 'relaxed';
  });
  afterEach(() => {
    env.securityEnforcement = original;
    cleanup();
  });

  it('lets a privileged, un-enrolled live admin stay on a normal route', async () => {
    seedRole('admin');
    seedMfa({ loaded: true, enrolled: false });
    renderAt('/app/anunturi');
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/app/anunturi'));
  });
});
