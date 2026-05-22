import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Building2, MailCheck } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Card } from '@/shared/components/Card';
import { Atmosphere } from '@/shared/components/Atmosphere';
import { useAuthStore } from '@/shared/store/authStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  type AuthMode,
  canSubmit,
  isValidEmail,
  mapAuthError,
  validatePassword,
} from './authLogic';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const enterDemo = useAuthStore((s) => s.enterDemo);

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // After sign-up or password-reset request we swap the form for a confirmation
  // panel rather than navigating, so the resident sees the next step clearly.
  const [sent, setSent] = useState<'verify' | 'reset' | null>(null);

  const values = { email, password, confirmPassword };
  const passwordIssue = mode !== 'forgot' ? validatePassword(password) : null;
  const showPasswordError = mode === 'signUp' && password.length > 0 && passwordIssue !== null;
  const showMismatch =
    mode === 'signUp' && confirmPassword.length > 0 && password !== confirmPassword;

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setSent(null);
    setPassword('');
    setConfirmPassword('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit(mode, values)) return;
    setLoading(true);
    try {
      if (mode === 'signIn') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(t(`auth.err.${mapAuthError(error)}`));
          return;
        }
        navigate('/app');
      } else if (mode === 'signUp') {
        const { error, needsVerification } = await signUp(email, password);
        if (error) {
          toast.error(t(`auth.err.${mapAuthError(error)}`));
          return;
        }
        if (needsVerification) {
          setSent('verify');
        } else {
          navigate('/app');
        }
      } else {
        const { error } = await requestPasswordReset(email);
        if (error) {
          toast.error(t(`auth.err.${mapAuthError(error)}`));
          return;
        }
        setSent('reset');
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    const { error } = await resendVerification(email);
    if (error) toast.error(t(`auth.err.${mapAuthError(error)}`));
    else toast.success(t('auth.verifyResent'));
  };

  const titleKey =
    mode === 'signIn' ? 'auth.signInTitle' : mode === 'signUp' ? 'auth.signUpTitle' : 'auth.forgotTitle';

  return (
    <div className="relative z-[1] flex min-h-screen flex-col items-center justify-center px-4">
      <Atmosphere />
      <div className="mb-7 flex flex-col items-center text-center">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-700) 100%)',
            boxShadow: 'var(--shadow-md), inset 0 1px 0 0 oklch(100% 0 0 / 0.2)',
          }}
        >
          <Building2 className="h-7 w-7" />
        </div>
        <h1 className="text-4xl text-text" style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, letterSpacing: '-0.02em' }}>
          vecini
          <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--primary)' }}>.online</em>
        </h1>
        <p className="mt-1 text-muted" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
          {t('common.tagline')}
        </p>
      </div>

      <Card className="w-full max-w-sm">
        {sent ? (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">
              {sent === 'verify' ? t('auth.verifyTitle') : t('auth.resetSentTitle')}
            </h2>
            <p className="text-sm text-muted">
              {sent === 'verify'
                ? t('auth.verifyBody', { email })
                : t('auth.resetSentBody', { email })}
            </p>
            {sent === 'verify' && (
              <Button variant="ghost" className="w-full" onClick={resend}>
                {t('auth.verifyResend')}
              </Button>
            )}
            <Button variant="secondary" className="w-full" onClick={() => switchMode('signIn')}>
              {t('auth.backToSignIn')}
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="space-y-4">
              <h2 className="text-lg font-semibold">{t(titleKey)}</h2>
              {!isSupabaseConfigured && (
                <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
                  {t('auth.demoMode')}
                </p>
              )}
              {mode === 'forgot' && (
                <p className="text-sm text-muted">{t('auth.forgotHint')}</p>
              )}
              <Input
                label={t('auth.email')}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {mode !== 'forgot' && (
                <Input
                  label={t('auth.password')}
                  type="password"
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  hint={mode === 'signUp' ? t('auth.passwordHint') : undefined}
                  error={showPasswordError ? t('auth.err.weakPassword') : undefined}
                  required
                />
              )}
              {mode === 'signUp' && (
                <Input
                  label={t('auth.confirmPassword')}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={showMismatch ? t('auth.err.passwordMismatch') : undefined}
                  required
                />
              )}
              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={!isValidEmail(email) || !canSubmit(mode, values)}
              >
                {mode === 'signIn'
                  ? t('auth.login')
                  : mode === 'signUp'
                    ? t('auth.signUp')
                    : t('auth.sendResetLink')}
              </Button>
            </form>

            <div className="mt-4 space-y-1 text-center text-sm">
              {mode === 'signIn' && (
                <>
                  <button type="button" className="auth-link" onClick={() => switchMode('forgot')}>
                    {t('auth.forgotLink')}
                  </button>
                  <p className="text-muted">
                    {t('auth.noAccount')}{' '}
                    <button type="button" className="auth-link" onClick={() => switchMode('signUp')}>
                      {t('auth.signUp')}
                    </button>
                  </p>
                </>
              )}
              {mode === 'signUp' && (
                <p className="text-muted">
                  {t('auth.haveAccount')}{' '}
                  <button type="button" className="auth-link" onClick={() => switchMode('signIn')}>
                    {t('auth.login')}
                  </button>
                </p>
              )}
              {mode === 'forgot' && (
                <button type="button" className="auth-link" onClick={() => switchMode('signIn')}>
                  {t('auth.backToSignIn')}
                </button>
              )}
            </div>

            {!isSupabaseConfigured && (
              <Button
                variant="secondary"
                className="mt-3 w-full"
                onClick={() => {
                  enterDemo();
                  navigate('/app');
                }}
              >
                {t('auth.enterDemo')}
              </Button>
            )}
          </>
        )}
      </Card>

      <nav className="login-legal" aria-label={t('consent.documentsTitle')}>
        <Link to="/confidentialitate">{t('consent.privacyLink')}</Link>
        <span aria-hidden="true">·</span>
        <Link to="/termeni">{t('consent.termsLink')}</Link>
        <span aria-hidden="true">·</span>
        <Link to="/cookies">{t('consent.cookieLink')}</Link>
      </nav>
    </div>
  );
}
