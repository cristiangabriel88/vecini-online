import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Copy, ShieldAlert, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/shared/store/authStore';
import { useMfaStore } from '@/shared/store/mfaStore';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Card } from '@/shared/components/Card';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { isValidTotpFormat, mfaErrorKey } from '@/features/auth/mfaLogic';
import { usePlatformAuthStore } from './platformAuthStore';
import { resolvePlatformAccess } from './platformAuthLogic';

/**
 * Gate for the platform (superadmin) app shell (T93/T100). Composes the shared
 * session signals with the server-verified `is_super_admin()` result. Renders the
 * matching state: loading hold, login redirect when unauthenticated, denial for
 * non-operators, mandatory MFA enrollment screen when enrolled is false (T100),
 * and the console otherwise.
 */
export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const loading = useAuthStore((s) => s.loading);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const demo = usePlatformAuthStore((s) => s.demo);
  const verifying = usePlatformAuthStore((s) => s.verifying);
  const isSuperAdmin = usePlatformAuthStore((s) => s.isSuperAdmin);
  const verify = usePlatformAuthStore((s) => s.verify);
  const signOut = usePlatformAuthStore((s) => s.signOut);

  const {
    loaded: mfaLoaded,
    enrolled: mfaEnrolled,
    draft,
    recoveryCodes,
    load: loadMfa,
    beginEnroll,
    confirmEnroll,
    cancelEnroll,
    clearRecoveryCodes,
  } = useMfaStore();

  const [enrollCode, setEnrollCode] = useState('');
  const [enrollBusy, setEnrollBusy] = useState(false);

  const access = resolvePlatformAccess({
    loading,
    demo,
    hasSession: Boolean(session),
    verifying,
    isSuperAdmin,
    supabaseConfigured: isSupabaseConfigured,
    mfaLoaded,
    mfaEnrolled,
  });

  // Once a live session exists and has not been checked yet, ask the backend.
  useEffect(() => {
    if (!demo && session && isSuperAdmin === null && !verifying) void verify();
  }, [demo, session, isSuperAdmin, verifying, verify]);

  // Load MFA enrollment status once a superadmin session is established (T100).
  useEffect(() => {
    if (isSupabaseConfigured && session && isSuperAdmin) void loadMfa();
  }, [session, isSuperAdmin, loadMfa]);

  if (access === 'loading' || access === 'verifying') {
    return (
      <div className="platform-center text-muted">
        {t(access === 'verifying' ? 'platform.access.verifying' : 'common.loading')}
      </div>
    );
  }

  if (access === 'unauthenticated') return <Navigate to="/" replace />;

  if (access === 'denied') {
    return (
      <div className="platform-center">
        <div className="platform-denied">
          <span className="platform-denied__icon" aria-hidden="true">
            <ShieldAlert size={26} />
          </span>
          <h1 className="platform-denied__title">{t('platform.access.deniedTitle')}</h1>
          <p className="platform-denied__body">{t('platform.access.deniedBody')}</p>
          <Button variant="secondary" onClick={() => void signOut()}>
            {t('platform.access.signOut')}
          </Button>
        </div>
      </div>
    );
  }

  if (access === 'mfa-enrollment-required') {
    const account = profile?.email ?? session?.user?.email ?? '';

    const fail = (error: string) =>
      toast.error(t(`auth.mfa.err.${mfaErrorKey(error)}`));

    const onBegin = async () => {
      setEnrollBusy(true);
      try {
        const { error } = await beginEnroll(account);
        if (error) fail(error);
      } finally {
        setEnrollBusy(false);
      }
    };

    const onConfirm = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValidTotpFormat(enrollCode)) return;
      setEnrollBusy(true);
      try {
        const { error } = await confirmEnroll(enrollCode);
        if (error) {
          fail(error);
          return;
        }
        setEnrollCode('');
        toast.success(t('auth.mfa.enabledToast'));
      } finally {
        setEnrollBusy(false);
      }
    };

    const onCopy = () => {
      if (draft?.secret) {
        void navigator.clipboard.writeText(draft.secret);
        toast.success(t('auth.mfa.copied'));
      }
    };

    if (recoveryCodes) {
      return (
        <div className="platform-center">
          <Card className="w-full max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={22} className="shrink-0 text-primary" />
              <h1 className="text-lg font-semibold">{t('auth.mfa.recoveryTitle')}</h1>
            </div>
            <p className="text-sm text-muted">{t('auth.mfa.recoveryBody')}</p>
            <div className="rounded-lg bg-surface-2 p-3 font-mono text-sm leading-relaxed">
              {recoveryCodes.join('\n')}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(recoveryCodes.join('\n'));
                  toast.success(t('auth.mfa.copied'));
                }}
                className="flex items-center gap-1.5"
              >
                <Copy size={14} />
                {t('auth.mfa.copy')}
              </Button>
            </div>
            <Button className="w-full" onClick={clearRecoveryCodes}>
              {t('auth.mfa.savedCodes')}
            </Button>
          </Card>
        </div>
      );
    }

    if (draft) {
      return (
        <div className="platform-center">
          <Card className="w-full max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={22} className="shrink-0 text-primary" />
              <h1 className="text-lg font-semibold">{t('auth.mfa.enrollTitle')}</h1>
            </div>
            <p className="text-sm text-muted">{t('platform.mfa.enrolledNotice')}</p>
            <p className="text-sm">{t('auth.mfa.step1')}</p>
            {draft.qrSvg ? (
              <div
                className="flex justify-center rounded-lg bg-white p-3"
                dangerouslySetInnerHTML={{ __html: draft.qrSvg }}
                role="img"
                aria-label={t('auth.mfa.qrAlt')}
              />
            ) : null}
            <p className="text-sm text-muted">{t('auth.mfa.manualHint')}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-surface-2 px-2 py-1.5 text-xs">
                {draft.secret}
              </code>
              <button
                type="button"
                onClick={onCopy}
                className="shrink-0 rounded p-1.5 text-muted hover:text-text"
                aria-label={t('auth.mfa.copy')}
              >
                <Copy size={14} />
              </button>
            </div>
            <p className="text-sm">{t('auth.mfa.step2')}</p>
            <form onSubmit={onConfirm} className="space-y-3">
              <Input
                label={t('auth.mfa.codeLabel')}
                hint={t('auth.mfa.codeHint')}
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={!isValidTotpFormat(enrollCode)} loading={enrollBusy} className="flex-1">
                  {t('auth.mfa.verifyEnable')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => void cancelEnroll()}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      );
    }

    return (
      <div className="platform-center">
        <Card className="w-full max-w-md space-y-4 text-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-700) 100%)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <ShieldCheck size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-semibold">{t('platform.mfa.enrollTitle')}</h1>
          </div>
          <p className="text-sm text-muted">{t('platform.mfa.enrollBody')}</p>
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            {t('platform.mfa.enrolledNotice')}
          </p>
          <Button className="w-full" onClick={() => void onBegin()} loading={enrollBusy}>
            {t('auth.mfa.enable')}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => void signOut()}>
            {t('platform.access.signOut')}
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
