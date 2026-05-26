import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { useMfaStore } from '@/shared/store/mfaStore';
import { useAuthStore } from '@/shared/store/authStore';
import type { MfaChannel } from '@/features/auth/otpChannelLogic';
import { isDeliveredChannel } from '@/features/auth/otpChannelLogic';

type ConfirmState = 'verifying' | 'success' | 'expired' | 'notFound' | 'error';

/**
 * Landing page for the email "confirm your sign-in" link (T140). The URL
 * carries a `?token=` (the confirm token minted by `requestOtp`) and a
 * `?channel=` (`email` or `telegram`). The page verifies the token against the
 * active demo challenge, marks it consumed, and then:
 *   - On success: calls `enterDemo(pendingDemoRole)` (demo) or refreshes the
 *     session (live, T143) and navigates to `/app`.
 *   - On failure (wrong device, expired, no active session): explains the
 *     cross-device caveat and points the user to the typed code instead.
 *
 * This is the demo / offline implementation; the live session elevation wires
 * in T143 via `mfa-otp-verify` + Custom Access Token Hook.
 */
export default function Confirm2faPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const verifyConfirmToken = useMfaStore((s) => s.verifyConfirmToken);
  const pendingDemoRole = useMfaStore((s) => s.pendingDemoRole);
  const setPendingDemoRole = useMfaStore((s) => s.setPendingDemoRole);
  const enterDemo = useAuthStore((s) => s.enterDemo);

  const [state, setState] = useState<ConfirmState>('verifying');

  useEffect(() => {
    const token = params.get('token') ?? '';
    const channelParam = params.get('channel') ?? '';

    if (!token || !isDeliveredChannel(channelParam as MfaChannel)) {
      setState('notFound');
      return;
    }

    let active = true;
    verifyConfirmToken(channelParam as MfaChannel, token).then(({ error }) => {
      if (!active) return;
      if (!error) {
        setState('success');
      } else if (error === 'expired-code') {
        setState('expired');
      } else if (error === 'no-channel') {
        setState('notFound');
      } else {
        setState('error');
      }
    });

    return () => {
      active = false;
    };
  }, [params, verifyConfirmToken]);

  const handleContinue = () => {
    // In demo mode, enterDemo with the pending role (set by LoginPage when
    // requestOtp was called). Fall back to 'admin' if the tab was reloaded.
    const role = pendingDemoRole ?? 'admin';
    enterDemo(role);
    setPendingDemoRole(null);
    navigate('/app');
  };

  return (
    <div className="relative z-[1] flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        {state === 'verifying' && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-primary" />
            <p className="text-sm text-muted">{t('auth.confirm2fa.verifying')}</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">{t('auth.confirm2fa.successTitle')}</h1>
              <p className="mt-1 text-sm text-muted">{t('auth.confirm2fa.successBody')}</p>
            </div>
            <Button className="w-full" onClick={handleContinue}>
              {t('auth.confirm2fa.continue')}
            </Button>
          </div>
        )}

        {(state === 'expired' || state === 'notFound' || state === 'error') && (
          <div className="flex flex-col items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
              <ShieldAlert className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">
                {state === 'expired'
                  ? t('auth.confirm2fa.expiredTitle')
                  : t('auth.confirm2fa.notFoundTitle')}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {state === 'expired'
                  ? t('auth.confirm2fa.expiredBody')
                  : t('auth.confirm2fa.notFoundBody')}
              </p>
              <p className="mt-3 text-sm text-muted">{t('auth.confirm2fa.deviceNote')}</p>
            </div>
            <Link to="/" className="auth-link flex items-center gap-1.5 text-sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('auth.confirm2fa.backToLogin')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
