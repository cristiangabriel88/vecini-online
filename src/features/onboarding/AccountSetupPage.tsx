import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertCircle, Building2, ShieldCheck, Ticket, UserPlus } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { PasswordStrengthMeter } from '@/features/auth/PasswordStrengthMeter';
import { useAuthStore } from '@/shared/store/authStore';
import { useInviteStore } from '@/shared/store/inviteStore';
import {
  setupProvisionLinks,
  usePlatformAsociatiiStore,
} from '@/platform/platformAsociatiiStore';
import {
  type ResolvedOnboarding,
  evaluateAccountForm,
  resolveOnboarding,
} from './accountSetupLogic';

/**
 * Account-creation-on-redemption landing (T124), at `/configurare-cont`.
 *
 * The invitee arrives via a `?token=` deep link (the locatar invite link or the
 * admin setup link). They set a password (twice), and on submit the token is
 * consumed once (single-use, 24h, replay-safe) and the membership is activated
 * offline: `admin` for a setup link, the code's role for a locatar invite.
 * They land in `/app`. Live account creation under RLS is T55; the privileged
 * admin-setup cross-tenant write is the T92 service-role function.
 *
 * If no `?token=` param is present the page shows a bilingual invalid-link
 * state so users who arrive without a token get a clear explanation.
 */
export default function AccountSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenParam = params.get('token')?.trim() ?? '';

  const redeemInvite = useAuthStore((s) => s.redeemInvite);
  const activateProvisionedAdmin = useAuthStore((s) => s.activateProvisionedAdmin);
  const consumeSetup = usePlatformAsociatiiStore((s) => s.consumeSetup);
  const invites = useInviteStore((s) => s.invites);
  const provisions = usePlatformAsociatiiStore((s) => s.provisions);
  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setupLinks = useMemo(
    () => setupProvisionLinks(provisions, asociatii),
    [provisions, asociatii],
  );
  const resolved: ResolvedOnboarding | null = useMemo(
    () => (tokenParam ? resolveOnboarding(tokenParam, invites, setupLinks) : null),
    [tokenParam, invites, setupLinks],
  );

  const form = useMemo(
    () => evaluateAccountForm({ email, password, confirm }),
    [email, password, confirm],
  );

  // No token in the URL — the link is missing or was corrupted.
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

  const tokenError: string | null = !resolved
    ? t('setup.err_unknown')
    : resolved.status !== 'ok'
      ? t(`setup.err_${resolved.status}`)
      : null;

  const canSubmit = form.ok && resolved?.status === 'ok' && !submitting;

  const roleLabel = (r: ResolvedOnboarding) =>
    r.kind === 'setup' ? t('setup.roleAdmin') : t(`invites.role_${r.role}`);

  const submit = () => {
    if (!resolved || resolved.status !== 'ok' || !form.ok) return;
    setSubmitting(true);
    try {
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
        activateProvisionedAdmin(result.asociatieId, result.asociatieName ?? resolved.asociatieName ?? '');
      }
      toast.success(t('setup.success'));
      navigate('/app');
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
            submit();
          }}
        >
          {tokenError && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{tokenError}</p>
          )}

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
