import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertCircle, Building2, Loader2, ShieldCheck, Ticket, UserPlus } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { PasswordStrengthMeter } from '@/features/auth/PasswordStrengthMeter';
import { useAuthStore } from '@/shared/store/authStore';
import { useInviteStore } from '@/shared/store/inviteStore';
import { useProfileStore } from '@/features/profile/profileStore';
import { seedProfile } from '@/features/profile/profileLogic';
import type { Locale } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import {
  setupProvisionLinks,
  usePlatformAsociatiiStore,
} from '@/platform/platformAsociatiiStore';
import {
  type ResolvedOnboarding,
  evaluateAccountForm,
  postSetupRoute,
  resolveOnboarding,
} from './accountSetupLogic';
import { resolveTokenLive, redeemTokenLive } from './onboardingApi';

/**
 * Account-creation-on-redemption landing (T124), at `/configurare-cont`.
 *
 * The invitee arrives via a `?token=` deep link (a locatar invite link or the
 * admin setup link). They set a password (and full name), and on submit the
 * token is consumed once (single-use, 24h, replay-safe) and the membership is
 * activated. They land in `/onboarding` (admin setup) or `/app` (invite).
 *
 * Offline path: resolves the token from the local invite store + provision
 * records, consumes both offline and establishes the demo session.
 *
 * Live path (T55, isSupabaseConfigured): resolves the token via the
 * resolve_onboarding_token RPC (anon-callable), calls supabase.auth.signUp,
 * then calls redeem_onboarding_token (authenticated) which upserts the users
 * row + inserts the membership + consumes the invite server-side. Relies on
 * "Confirm email" being disabled in the Supabase project settings (as
 * documented in RUNBOOK-MVP.md) so signUp returns a session immediately.
 */
export default function AccountSetupPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenParam = params.get('token')?.trim() ?? '';

  const redeemInvite = useAuthStore((s) => s.redeemInvite);
  const activateProvisionedAdmin = useAuthStore((s) => s.activateProvisionedAdmin);
  const hydrate = useAuthStore((s) => s.hydrate);
  const consumeSetup = usePlatformAsociatiiStore((s) => s.consumeSetup);
  const saveProfile = useProfileStore((s) => s.save);
  const invites = useInviteStore((s) => s.invites);
  const provisions = usePlatformAsociatiiStore((s) => s.provisions);
  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live path: resolved state from the resolve_onboarding_token RPC.
  const [liveResolved, setLiveResolved] = useState<ResolvedOnboarding | null>(null);
  const [resolving, setResolving] = useState(isSupabaseConfigured && Boolean(tokenParam));

  // Offline path: resolve the token against the local stores.
  const setupLinks = useMemo(
    () => setupProvisionLinks(provisions, asociatii),
    [provisions, asociatii],
  );
  const offlineResolved: ResolvedOnboarding | null = useMemo(
    () =>
      !isSupabaseConfigured && tokenParam
        ? resolveOnboarding(tokenParam, invites, setupLinks)
        : null,
    [tokenParam, invites, setupLinks],
  );

  // The resolved token used for UI rendering: live RPC result when configured,
  // offline result otherwise.
  const resolved: ResolvedOnboarding | null = isSupabaseConfigured
    ? liveResolved
    : offlineResolved;

  // Resolve the token via the live RPC when Supabase is available.
  useEffect(() => {
    if (!isSupabaseConfigured || !tokenParam) {
      setResolving(false);
      return;
    }
    let cancelled = false;
    setResolving(true);
    resolveTokenLive(tokenParam).then((result) => {
      if (cancelled) return;
      if (!result) {
        // Network or RPC error -- show 'unknown' so the invitee gets a clear
        // message instead of a blank form.
        setLiveResolved({
          kind: 'invite',
          status: 'unknown',
          asociatieId: '',
          asociatieName: null,
          role: 'proprietar',
        });
      } else if ('asociatieId' in result) {
        // Full ResolvedOnboarding (status === 'ok').
        setLiveResolved(result as ResolvedOnboarding);
      } else {
        // Non-ok status returned by the RPC; use a minimal descriptor so the
        // page can render the right bilingual error message.
        setLiveResolved({
          kind: 'invite',
          status: result.status,
          asociatieId: '',
          asociatieName: null,
          role: 'proprietar',
        });
      }
      setResolving(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tokenParam]);

  const form = useMemo(
    () => evaluateAccountForm({ name, email, password, confirm }),
    [name, email, password, confirm],
  );

  // No token in the URL -- the link is missing or was corrupted.
  if (!tokenParam) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">{t('setup.noTokenTitle')}</h1>
          <p className="mt-1 text-muted">{t('setup.noTokenBody')}</p>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          {t('auth.haveAccount')}{' '}
          <Link to="/" className="auth-link">
            {t('auth.login')}
          </Link>
        </p>
      </div>
    );
  }

  const tokenError: string | null = (() => {
    // While the RPC is in flight, suppress the "unknown" placeholder error.
    if (isSupabaseConfigured && resolving) return null;
    if (!resolved) return t('setup.err_unknown');
    if (resolved.status !== 'ok') return t(`setup.err_${resolved.status}`);
    return null;
  })();

  const canSubmit =
    form.ok &&
    resolved?.status === 'ok' &&
    !submitting &&
    !(isSupabaseConfigured && resolving);

  const roleLabel = (r: ResolvedOnboarding) =>
    r.kind === 'setup' ? t('setup.roleAdmin') : t(`invites.role_${r.role}`);

  const submit = async () => {
    if (!resolved || resolved.status !== 'ok' || !form.ok) return;
    setSubmitting(true);
    try {
      if (isSupabaseConfigured) {
        // ── Live path (T55) ──────────────────────────────────────────────
        // 1. Create the Supabase auth account. With "Confirm email" disabled
        //    (RUNBOOK-MVP.md step 3), signUp returns a session immediately.
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) {
          toast.error(signUpError.message);
          return;
        }
        // If signUp returns no session, email confirmation is still enabled in
        // the Supabase project. The admin must disable it (Auth settings ->
        // "Enable email confirmations" off) before this flow works.
        if (!signUpData.session) {
          toast.error(t('setup.err_no_session'));
          return;
        }
        // 2. Redeem the token server-side: upserts the users row (name + locale)
        //    and inserts the membership, then marks the invite consumed.
        const redeemed = await redeemTokenLive(tokenParam, name.trim(), i18n.language);
        if (redeemed.status !== 'ok') {
          toast.error(t(`setup.err_${redeemed.status}`));
          return;
        }
        // 3. Sync the auth store so the app reflects the new session + membership.
        await hydrate();
      } else {
        // ── Offline/demo path (unchanged from T124) ───────────────────────
        if (resolved.kind === 'invite') {
          const result = redeemInvite(tokenParam);
          if (result.status !== 'ok') {
            toast.error(t(`setup.err_${result.status}`));
            return;
          }
        } else {
          const result = consumeSetup(tokenParam);
          if (result.status !== 'ok' || !result.asociatieId) {
            toast.error(t(`setup.err_${result.status}`));
            return;
          }
          activateProvisionedAdmin(
            result.asociatieId,
            result.asociatieName ?? resolved.asociatieName ?? '',
          );
        }
        // Offline: the new account is linked to the demo user id. Seed a minimal
        // profile (name + email) so the chrome and F36 directory show who joined
        // without waiting for the resident to open the profile editor.
        const userId = useAuthStore.getState().session?.user?.id ?? DEMO_CURRENT_USER_ID;
        const uiLocale: Locale = i18n.language === 'en' ? 'en' : 'ro';
        saveProfile(seedProfile(userId, email.trim(), name, uiLocale));
      }
      toast.success(t('setup.success'));
      navigate(postSetupRoute(resolved.kind));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">{t('setup.title')}</h1>
        <p className="mt-1 text-muted">{t('setup.subtitle')}</p>
      </div>

      {resolved && resolved.status === 'ok' && (
        <Card className="mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {resolved.kind === 'setup' ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {resolved.kind === 'setup'
                  ? t('setup.contextSetup', { asociatie: resolved.asociatieName ?? '' })
                  : t('setup.contextInvite')}
              </p>
              <p className="text-sm text-muted">
                {t('setup.roleLine', { role: roleLabel(resolved) })}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {isSupabaseConfigured && resolving && (
            <p className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('setup.resolving')}
            </p>
          )}
          {tokenError && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{tokenError}</p>
          )}

          <Input
            label={t('setup.name')}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            hint={t('setup.nameHint')}
            error={form.nameInvalid ? t('setup.err_name') : undefined}
            required
          />
          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={form.emailInvalid ? t('setup.err_email') : undefined}
            required
          />
          <Input
            label={t('auth.password')}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={t('auth.passwordHint')}
            required
          />
          {password.length > 0 && <PasswordStrengthMeter assessment={form.assessment} />}
          <Input
            label={t('auth.confirmPassword')}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={form.mismatch ? t('auth.err.passwordMismatch') : undefined}
            required
          />
          <Button type="submit" disabled={!canSubmit} loading={submitting} className="w-full">
            <UserPlus className="h-4 w-4" /> {t('setup.submit')}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-muted">
        {t('setup.createPrompt')}{' '}
        <Link to="/onboarding" className="auth-link">
          <Ticket className="mr-1 inline h-3.5 w-3.5" />
          {t('setup.createLink')}
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link to="/" className="auth-link">
          {t('auth.login')}
        </Link>
      </p>
    </div>
  );
}
