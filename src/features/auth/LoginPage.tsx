import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowUpRight, Building2, Globe, MailCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Card } from '@/shared/components/Card';
import { Atmosphere } from '@/shared/components/Atmosphere';
import { useAuthStore } from '@/shared/store/authStore';
import { useMfaStore } from '@/shared/store/mfaStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { mfaErrorKey } from './mfaLogic';
import { type AuthMode, canSubmit, isValidEmail, mapAuthError } from './authLogic';
import { type PasswordAssessment, evaluatePassword } from './passwordPolicy';

/** Round a remaining-lockout duration up to whole minutes for the message. */
function lockoutMinutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000));
}

/** A compact strength meter + first-issue hint shown while choosing a password. */
function PasswordStrength({ assessment }: { assessment: PasswordAssessment }) {
  const { t } = useTranslation();
  const tone =
    assessment.strength === 'weak'
      ? 'var(--danger)'
      : assessment.strength === 'fair'
        ? 'var(--warning)'
        : 'var(--success, var(--primary))';
  const issue = assessment.issues[0];
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: i < assessment.score ? tone : 'var(--bg-sunken)' }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: issue ? 'var(--danger)' : 'var(--text-muted)' }}>
        {issue
          ? t(`auth.pwd.${issue}`)
          : `${t('auth.pwd.strength')}: ${t(`auth.pwd.${assessment.strength}`)}`}
      </p>
    </div>
  );
}

/**
 * A refined RO / EN segmented toggle pinned to the top-right of the auth
 * screen, mirroring the topbar language control for signed-in residents. The
 * sliding thumb tracks the active language with a gentle spring.
 */
function LangToggle() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'ro';
  const set = (next: 'ro' | 'en') => {
    if (next !== lang) void i18n.changeLanguage(next);
  };
  return (
    <div className="login-lang" role="group" aria-label={t('chrome.language')}>
      <Globe className="login-lang__globe" size={14} aria-hidden="true" />
      <div className="login-lang__seg" data-lang={lang}>
        <span className="login-lang__thumb" aria-hidden="true" />
        <button
          type="button"
          className="login-lang__opt"
          data-active={lang === 'ro'}
          aria-pressed={lang === 'ro'}
          onClick={() => set('ro')}
        >
          RO
        </button>
        <button
          type="button"
          className="login-lang__opt"
          data-active={lang === 'en'}
          aria-pressed={lang === 'en'}
          onClick={() => set('en')}
        >
          EN
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const enterDemo = useAuthStore((s) => s.enterDemo);
  const challengeRequired = useMfaStore((s) => s.challengeRequired);
  const verifyChallenge = useMfaStore((s) => s.verifyChallenge);

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // After sign-up or password-reset request we swap the form for a confirmation
  // panel rather than navigating, so the resident sees the next step clearly.
  const [sent, setSent] = useState<'verify' | 'reset' | null>(null);
  // When a verified second factor exists, the password step is followed by a
  // TOTP / recovery-code challenge before the session is allowed through.
  const [pendingMfa, setPendingMfa] = useState<'demo' | 'live' | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const values = { email, password, confirmPassword };
  // Sign-up surfaces the full strength/breach policy via a live meter; sign-in
  // keeps the lighter minimum-length check.
  const assessment = mode === 'signUp' && password.length > 0
    ? evaluatePassword(password, email)
    : null;
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
        if (!isSupabaseConfigured) {
          // Demo: gate entry behind the demo TOTP factor if one was enrolled.
          if (await challengeRequired()) setPendingMfa('demo');
          else {
            enterDemo();
            navigate('/app');
          }
          return;
        }
        const { error, lockedMs } = await signIn(email, password);
        if (lockedMs > 0) {
          toast.error(t('auth.lockout', { minutes: lockoutMinutes(lockedMs) }));
          return;
        }
        if (error) {
          toast.error(t(`auth.err.${mapAuthError(error)}`));
          return;
        }
        if (await challengeRequired()) setPendingMfa('live');
        else navigate('/app');
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

  const submitChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) return;
    setLoading(true);
    try {
      const { error, lockedMs } = await verifyChallenge(mfaCode);
      if (lockedMs > 0) {
        toast.error(t('auth.mfaLockout', { minutes: lockoutMinutes(lockedMs) }));
        setMfaCode('');
        return;
      }
      if (error) {
        toast.error(t(`auth.mfa.err.${mfaErrorKey(error)}`));
        return;
      }
      if (pendingMfa === 'demo') enterDemo();
      setMfaCode('');
      setPendingMfa(null);
      navigate('/app');
    } finally {
      setLoading(false);
    }
  };

  const enterDemoFlow = async () => {
    if (await challengeRequired()) setPendingMfa('demo');
    else {
      enterDemo();
      navigate('/app');
    }
  };

  const cancelChallenge = () => {
    setPendingMfa(null);
    setMfaCode('');
    setPassword('');
  };

  const titleKey =
    mode === 'signIn' ? 'auth.signInTitle' : mode === 'signUp' ? 'auth.signUpTitle' : 'auth.forgotTitle';

  return (
    <div className="relative z-[1] flex min-h-screen flex-col items-center justify-center px-4">
      <Atmosphere />
      <LangToggle />
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
        {pendingMfa ? (
          <form onSubmit={submitChallenge} className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold">{t('auth.mfa.challengeTitle')}</h2>
              <p className="mt-1 text-sm text-muted">{t('auth.mfa.challengeBody')}</p>
            </div>
            <Input
              label={t('auth.mfa.codeLabel')}
              inputMode="text"
              autoComplete="one-time-code"
              autoFocus
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              hint={t('auth.mfa.challengeHint')}
              required
            />
            <Button type="submit" className="w-full" loading={loading} disabled={!mfaCode.trim()}>
              {t('auth.mfa.verify')}
            </Button>
            <button type="button" className="auth-link block w-full text-center" onClick={cancelChallenge}>
              {t('auth.backToSignIn')}
            </button>
          </form>
        ) : sent ? (
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
                  required
                />
              )}
              {assessment && <PasswordStrength assessment={assessment} />}
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
                onClick={() => void enterDemoFlow()}
              >
                {t('auth.enterDemo')}
              </Button>
            )}
          </>
        )}
      </Card>

      <footer className="login-footer">
        <nav className="login-footer__legal" aria-label={t('consent.documentsTitle')}>
          <Link to="/confidentialitate">{t('consent.privacyLink')}</Link>
          <span className="login-footer__dot" aria-hidden="true" />
          <Link to="/termeni">{t('consent.termsLink')}</Link>
          <span className="login-footer__dot" aria-hidden="true" />
          <Link to="/cookies">{t('consent.cookieLink')}</Link>
          <span className="login-footer__dot" aria-hidden="true" />
          <Link to="/protectia-consumatorului">{t('consent.consumerLink')}</Link>
        </nav>
        <div className="login-footer__meta">
          <span>© 2026 vecini.online</span>
          <span className="login-footer__dot" aria-hidden="true" />
          <a
            className="login-footer__credit"
            href="https://cristiangabriel.dev"
            target="_blank"
            rel="noreferrer"
          >
            {t('chrome.createdBy')}
            <ArrowUpRight size={12} />
          </a>
        </div>
      </footer>
    </div>
  );
}
