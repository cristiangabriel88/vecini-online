import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Globe, ShieldCheck } from 'lucide-react';
import { Atmosphere } from '@/shared/components/Atmosphere';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Card } from '@/shared/components/Card';
import { useAuthStore } from '@/shared/store/authStore';
import { useMfaStore } from '@/shared/store/mfaStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { isValidEmail, mapAuthError } from '@/features/auth/authLogic';
import { isValidTotpFormat, mfaErrorKey } from '@/features/auth/mfaLogic';
import { usePlatformAuthStore } from './platformAuthStore';

/** Round a remaining-lockout duration up to whole minutes for the message. */
function lockoutMinutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000));
}

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
        <button type="button" className="login-lang__opt" data-active={lang === 'ro'} aria-pressed={lang === 'ro'} onClick={() => set('ro')}>
          RO
        </button>
        <button type="button" className="login-lang__opt" data-active={lang === 'en'} aria-pressed={lang === 'en'} onClick={() => set('en')}>
          EN
        </button>
      </div>
    </div>
  );
}

/**
 * Platform (superadmin) login (T93). Offline it offers a single demo-console
 * entry so the showcase runs without a backend; live it signs in through the
 * shared auth store and lets the `/consola` gate run the server-side
 * `is_super_admin()` check (a non-operator account lands on the denial screen).
 */
export default function PlatformLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const enterDemo = usePlatformAuthStore((s) => s.enterDemo);
  const challengeRequired = useMfaStore((s) => s.challengeRequired);
  const verifyChallenge = useMfaStore((s) => s.verifyChallenge);
  const challengeLockMs = useMfaStore((s) => s.challengeLockMs);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // After password sign-in, if the account has a TOTP factor, we gate on the
  // challenge before navigating to the console (T100). 'demo' uses the same UI
  // against the locally-stored demo TOTP secret.
  const [pendingMfa, setPendingMfa] = useState<'demo' | 'live' | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const enterDemoConsole = async () => {
    if (await challengeRequired()) {
      setPendingMfa('demo');
    } else {
      enterDemo();
      navigate('/consola');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email) || !password) return;
    setLoading(true);
    try {
      // A privileged platform session is never "remembered": it lives in
      // sessionStorage and ends when the browser closes, the stricter default
      // for the superadmin console.
      const { error, lockedMs } = await signIn(email, password, false);
      if (lockedMs > 0) {
        toast.error(t('auth.lockout', { minutes: lockoutMinutes(lockedMs) }));
        return;
      }
      if (error) {
        toast.error(t(`auth.err.${mapAuthError(error)}`));
        return;
      }
      // If the account has a TOTP factor enrolled, require the challenge before
      // reaching the console. The gate re-verifies super_admin server-side.
      if (await challengeRequired()) {
        setPendingMfa('live');
      } else {
        navigate('/consola');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidTotpFormat(mfaCode) && mfaCode.length < 6) return;
    const lockRemaining = challengeLockMs();
    if (lockRemaining > 0) {
      toast.error(t('auth.lockout', { minutes: lockoutMinutes(lockRemaining) }));
      return;
    }
    setLoading(true);
    try {
      const { error, lockedMs } = await verifyChallenge(mfaCode);
      if (lockedMs > 0) {
        toast.error(t('auth.lockout', { minutes: lockoutMinutes(lockedMs) }));
        return;
      }
      if (error) {
        toast.error(t(`auth.mfa.err.${mfaErrorKey(error)}`));
        return;
      }
      if (pendingMfa === 'demo') {
        enterDemo();
      }
      setMfaCode('');
      setPendingMfa(null);
      navigate('/consola');
    } finally {
      setLoading(false);
    }
  };

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
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-4xl text-text" style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, letterSpacing: '-0.02em' }}>
          vecini
          <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--primary)' }}>.online</em>
        </h1>
        <p className="mt-1 text-muted" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
          {t('platform.appName')}
        </p>
      </div>

      <Card className="w-full max-w-sm">
        {pendingMfa ? (
          <form onSubmit={submitChallenge} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{t('auth.mfa.challengeTitle')}</h2>
              <p className="mt-1 text-sm text-muted">{t('auth.mfa.challengeBody')}</p>
            </div>
            <Input
              label={t('auth.mfa.codeLabel')}
              hint={t('auth.mfa.challengeHint')}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
            <Button type="submit" className="w-full" loading={loading} disabled={mfaCode.length < 6}>
              {t('auth.mfa.verify')}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted underline-offset-4 hover:text-text hover:underline"
              onClick={() => { setPendingMfa(null); setMfaCode(''); }}
            >
              {t('platform.login.backToSignIn')}
            </button>
          </form>
        ) : isSupabaseConfigured ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{t('platform.login.title')}</h2>
              <p className="mt-1 text-sm text-muted">{t('platform.login.subtitle')}</p>
            </div>
            <Input
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" loading={loading} disabled={!isValidEmail(email) || !password}>
              {t('platform.login.signIn')}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-semibold">{t('platform.login.title')}</h2>
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
              {t('platform.login.demoNotice')}
            </p>
            <Button className="w-full" onClick={() => void enterDemoConsole()}>
              {t('platform.login.enterDemo')}
            </Button>
          </div>
        )}
      </Card>

      <footer className="login-footer">
        <div className="login-footer__meta">
          <span>© 2026 vecini.online</span>
          <span className="login-footer__dot" aria-hidden="true" />
          <span>{t('platform.appName')}</span>
        </div>
      </footer>
    </div>
  );
}
