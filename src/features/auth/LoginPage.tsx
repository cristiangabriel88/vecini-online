import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowUpRight, Building2, Eye, EyeOff, Globe, Mail, MailCheck, Moon, Send, ShieldCheck, Smartphone, Sun } from 'lucide-react';
import { DevRoleSwitcher } from '@/shared/components/DevRoleSwitcher';
import type { Role } from '@/shared/types/domain';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Card } from '@/shared/components/Card';
import { Checkbox } from '@/shared/components/Checkbox';
import { setRemembered } from './sessionPersistence';
import { Atmosphere } from '@/shared/components/Atmosphere';
import { useAuthStore } from '@/shared/store/authStore';
import { useMfaStore } from '@/shared/store/mfaStore';
import { useThemeStore } from '@/shared/store/themeStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { mfaErrorKey } from './mfaLogic';
import { type AuthMode, canSubmit, isValidEmail, mapAuthError } from './authLogic';
import { evaluatePassword } from './passwordPolicy';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { type MfaChannel, isValidOtpFormat } from './otpChannelLogic';

/** Round a remaining-lockout duration up to whole minutes for the message. */
function lockoutMinutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000));
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

/**
 * A glassy dark-mode disc that pairs with the language pill in the top-right
 * cluster. The persisted theme is applied to the document root, so flipping it
 * here also re-skins the legal pages reached from the footer. The sun and moon
 * crossfade and rotate past each other as the theme switches, and we show the
 * destination icon (moon while light, sun while dark) the way the in-app topbar
 * does.
 */
function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  return (
    <button
      type="button"
      className="login-theme"
      data-theme={theme}
      onClick={toggle}
      aria-label={t('chrome.toggleTheme')}
      title={t('chrome.toggleTheme')}
      aria-pressed={theme === 'dark'}
    >
      <span className="login-theme__icons" aria-hidden="true">
        <Moon className="login-theme__icon login-theme__moon" size={16} />
        <Sun className="login-theme__icon login-theme__sun" size={16} />
      </span>
    </button>
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
  const enabledChannels = useMfaStore((s) => s.enabledChannels);
  const requestOtp = useMfaStore((s) => s.requestOtp);
  const verifyOtp = useMfaStore((s) => s.verifyOtp);
  const setPendingDemoRole = useMfaStore((s) => s.setPendingDemoRole);
  const demoEnabledChannels = useMfaStore((s) => s.demoEnabledChannels);

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Off by default (the secure default): the session is dropped when the browser
  // closes unless the resident opts into a persistent, "remembered" session.
  const [remember, setRemember] = useState(false);
  // After sign-up or password-reset request we swap the form for a confirmation
  // panel rather than navigating, so the resident sees the next step clearly.
  const [sent, setSent] = useState<'verify' | 'reset' | null>(null);
  // When a verified second factor exists, the password step is followed by a
  // TOTP / recovery-code challenge before the session is allowed through.
  const [pendingMfa, setPendingMfa] = useState<'demo' | 'live' | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  // The role a queued demo entry should preview as, carried across the optional
  // demo TOTP challenge so the right experience opens once the code clears.
  const [demoRole, setDemoRole] = useState<Role>('admin');

  // OTP channel challenge state (T140).
  // `selectedChannel` is the channel the user chose; null = picker shown.
  const [selectedChannel, setSelectedChannel] = useState<MfaChannel | null>(null);
  // Whether the OTP code has been sent for the selected channel.
  const [otpSent, setOtpSent] = useState(false);
  // The demo code displayed on-screen (demo affordance only; never stored in state).
  const [demoCode, setDemoCode] = useState<string | null>(null);
  // The confirm-link token for the email channel demo affordance.
  const [demoConfirmToken, setDemoConfirmToken] = useState<string | null>(null);
  // Remaining resend cooldown in seconds.
  const [resendCountdown, setResendCountdown] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick down the resend countdown every second.
  const startResendTimer = useCallback((remainingMs: number) => {
    setResendCountdown(Math.ceil(remainingMs / 1000));
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    resendTimerRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (resendTimerRef.current) clearInterval(resendTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, []);

  // When the channel picker is shown, auto-select the channel if only one is available.
  useEffect(() => {
    if (!pendingMfa || selectedChannel !== null) return;
    const channels = enabledChannels();
    if (channels.length === 1) setSelectedChannel(channels[0]);
  }, [pendingMfa, selectedChannel, enabledChannels]);

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
          // Demo: the email/password form enters as the admin persona; the role
          // buttons below pick a different one. Gate behind the demo second factor
          // if one was enrolled/enabled. Honour "remember me" so idle behaviour matches.
          setRemembered(remember);
          setDemoRole('admin');
          if (await challengeRequired()) {
            setPendingDemoRole('admin');
            setPendingMfa('demo');
          } else {
            enterDemo('admin');
            navigate('/app');
          }
          return;
        }
        const { error, lockedMs } = await signIn(email, password, remember);
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

  const completeChallenge = (role: Role) => {
    if (pendingMfa === 'demo') enterDemo(role);
    setMfaCode('');
    setPendingMfa(null);
    setSelectedChannel(null);
    setOtpSent(false);
    setDemoCode(null);
    setDemoConfirmToken(null);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    navigate('/app');
  };

  const submitChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) return;
    setLoading(true);
    try {
      // For delivered-code channels (email / telegram) use verifyOtp;
      // for TOTP / recovery codes use verifyChallenge.
      const channel = selectedChannel;
      if (channel === 'email' || channel === 'telegram') {
        const { error, lockedMs } = await verifyOtp(channel, mfaCode);
        if (lockedMs > 0) {
          toast.error(t('auth.mfaLockout', { minutes: lockoutMinutes(lockedMs) }));
          setMfaCode('');
          return;
        }
        if (error) {
          toast.error(t(`auth.mfa.err.${mfaErrorKey(error)}`));
          return;
        }
        setPendingDemoRole(null);
        completeChallenge(demoRole);
        return;
      }
      // TOTP / recovery-code path (channel === 'totp' or no channel selected).
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
      completeChallenge(demoRole);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const channel = selectedChannel;
    if (!channel || (channel !== 'email' && channel !== 'telegram')) return;
    setLoading(true);
    try {
      const result = await requestOtp(channel);
      if (result.cooldownMs > 0) {
        startResendTimer(result.cooldownMs);
        return;
      }
      if (result.error) {
        toast.error(t(`auth.mfa.err.${mfaErrorKey(result.error)}`));
        return;
      }
      setOtpSent(true);
      setDemoCode(result.demoCode ?? null);
      setDemoConfirmToken(result.demoConfirmToken ?? null);
      startResendTimer(60_000); // OTP_RESEND_COOLDOWN_MS
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const channel = selectedChannel;
    if (!channel || (channel !== 'email' && channel !== 'telegram')) return;
    if (resendCountdown > 0) return;
    setLoading(true);
    try {
      const result = await requestOtp(channel);
      if (result.cooldownMs > 0) {
        startResendTimer(result.cooldownMs);
        return;
      }
      if (result.error) {
        toast.error(t(`auth.mfa.err.${mfaErrorKey(result.error)}`));
        return;
      }
      setDemoCode(result.demoCode ?? null);
      setDemoConfirmToken(result.demoConfirmToken ?? null);
      startResendTimer(60_000);
      toast.success(t('auth.mfa.channels.resent'));
    } finally {
      setLoading(false);
    }
  };

  const enterDemoAs = async (role: Role) => {
    setRemembered(remember);
    setDemoRole(role);
    // Gate entry behind the demo second factor if one is enrolled/enabled.
    if (await challengeRequired()) {
      setPendingDemoRole(role);
      setPendingMfa('demo');
    } else {
      enterDemo(role);
      navigate('/app');
    }
  };

  const cancelChallenge = () => {
    setPendingMfa(null);
    setMfaCode('');
    setPassword('');
    setSelectedChannel(null);
    setOtpSent(false);
    setDemoCode(null);
    setDemoConfirmToken(null);
    setPendingDemoRole(null);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
  };

  const titleKey =
    mode === 'signIn' ? 'auth.signInTitle' : mode === 'signUp' ? 'auth.signUpTitle' : 'auth.forgotTitle';

  return (
    <div className="relative z-[1] flex min-h-[100dvh] flex-col items-center justify-center px-4 pt-20 sm:pt-0">
      <Atmosphere />
      <div className="login-controls">
        <ThemeToggle />
        <LangToggle />
      </div>
      <div className="mb-4 flex flex-col items-center text-center sm:mb-7">
        <div
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl text-white sm:mb-4 sm:h-14 sm:w-14"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-700) 100%)',
            boxShadow: 'var(--shadow-md), inset 0 1px 0 0 oklch(100% 0 0 / 0.2)',
          }}
        >
          <Building2 className="h-5 w-5 sm:h-7 sm:w-7" />
        </div>
        <h1 className="text-3xl text-text sm:text-4xl" style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, letterSpacing: '-0.02em' }}>
          vecini
          <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--primary)' }}>.online</em>
        </h1>
        <p className="mt-1 text-muted" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
          {t('common.tagline')}
        </p>
      </div>

      <Card className="w-full max-w-sm">
        {pendingMfa ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold">{t('auth.mfa.challengeTitle')}</h2>
              <p className="mt-1 text-sm text-muted">
                {selectedChannel === 'email'
                  ? t('auth.mfa.channels.emailChallengeBody', {
                      hint: demoEnabledChannels['email']?.targetHint ?? '',
                    })
                  : selectedChannel === 'telegram'
                    ? t('auth.mfa.channels.telegramChallengeBody', {
                        hint: demoEnabledChannels['telegram']?.targetHint ?? '',
                      })
                    : t('auth.mfa.challengeBody')}
              </p>
            </div>

            {/* Channel picker: shown when multiple channels available and none chosen. */}
            {!selectedChannel && (
              <div className="space-y-2">
                <p className="text-center text-xs font-medium uppercase tracking-wide text-muted">
                  {t('auth.mfa.channels.choosePicker')}
                </p>
                {enabledChannels().map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5"
                    onClick={() => setSelectedChannel(ch)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {ch === 'email' ? (
                        <Mail className="h-4 w-4" />
                      ) : ch === 'telegram' ? (
                        <Send className="h-4 w-4" />
                      ) : (
                        <Smartphone className="h-4 w-4" />
                      )}
                    </span>
                    <span className="font-medium">
                      {ch === 'email'
                        ? t('auth.mfa.channels.emailLabel')
                        : ch === 'telegram'
                          ? t('auth.mfa.channels.telegramLabel')
                          : t('auth.mfa.channels.totpLabel')}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* TOTP / recovery-code input (existing flow). */}
            {selectedChannel === 'totp' && (
              <form onSubmit={submitChallenge} className="space-y-3">
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
              </form>
            )}

            {/* Email / Telegram OTP: "Send code" button shown before the code is sent. */}
            {(selectedChannel === 'email' || selectedChannel === 'telegram') && !otpSent && (
              <Button
                className="w-full"
                loading={loading}
                onClick={() => void handleSendOtp()}
              >
                {selectedChannel === 'email'
                  ? t('auth.mfa.channels.sendEmail')
                  : t('auth.mfa.channels.sendTelegram')}
              </Button>
            )}

            {/* Email / Telegram OTP: code input after the code is sent. */}
            {(selectedChannel === 'email' || selectedChannel === 'telegram') && otpSent && (
              <form onSubmit={submitChallenge} className="space-y-3">
                {/* Demo affordance: show the one-time code on-screen. */}
                {demoCode && (
                  <div className="rounded-lg border border-warning/30 bg-warning/8 px-4 py-3">
                    <p className="text-xs font-medium text-warning">{t('auth.mfa.channels.demoNotice')}</p>
                    <p
                      className="iv-mono mt-1 text-center text-2xl font-bold tracking-[0.3em] text-text"
                      aria-label={t('auth.mfa.channels.demoCodeAriaLabel')}
                    >
                      {demoCode}
                    </p>
                    {demoConfirmToken && selectedChannel === 'email' && (
                      <p className="mt-2 text-center text-xs text-muted">
                        {t('auth.mfa.channels.orClickLink')}{' '}
                        <Link
                          to={`/confirma-2fa?token=${encodeURIComponent(demoConfirmToken)}&channel=${selectedChannel}`}
                          className="auth-link text-xs"
                        >
                          {t('auth.mfa.channels.confirmLinkLabel')}
                        </Link>
                      </p>
                    )}
                  </div>
                )}
                <Input
                  label={t('auth.mfa.channels.otpLabel')}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={mfaCode}
                  maxLength={6}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  hint={t('auth.mfa.channels.otpHint')}
                  required
                />
                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={!isValidOtpFormat(mfaCode)}
                >
                  {t('auth.mfa.verify')}
                </Button>
                <button
                  type="button"
                  className="auth-link block w-full text-center text-sm"
                  disabled={resendCountdown > 0 || loading}
                  onClick={() => void handleResendOtp()}
                >
                  {resendCountdown > 0
                    ? t('auth.mfa.channels.resendIn', { seconds: resendCountdown })
                    : t('auth.mfa.channels.resend')}
                </button>
              </form>
            )}

            {/* "Use a different channel" back link when a channel is already selected. */}
            {selectedChannel && enabledChannels().length > 1 && (
              <button
                type="button"
                className="auth-link block w-full text-center text-sm"
                onClick={() => {
                  setSelectedChannel(null);
                  setOtpSent(false);
                  setDemoCode(null);
                  setDemoConfirmToken(null);
                  setMfaCode('');
                  if (resendTimerRef.current) clearInterval(resendTimerRef.current);
                }}
              >
                {t('auth.mfa.channels.changeChannel')}
              </button>
            )}

            <button type="button" className="auth-link block w-full text-center" onClick={cancelChallenge}>
              {t('auth.backToSignIn')}
            </button>
          </div>
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
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  hint={mode === 'signUp' ? t('auth.passwordHint') : undefined}
                  required
                  suffix={
                    <button
                      type="button"
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              )}
              {assessment && <PasswordStrengthMeter assessment={assessment} />}
              {mode === 'signIn' && (
                <Checkbox checked={remember} onChange={setRemember} label={t('auth.rememberMe')} />
              )}
              {mode === 'signUp' && (
                <Input
                  label={t('auth.confirmPassword')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={showMismatch ? t('auth.err.passwordMismatch') : undefined}
                  required
                  suffix={
                    <button
                      type="button"
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
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
                <button type="button" className="auth-link" onClick={() => switchMode('forgot')}>
                  {t('auth.forgotLink')}
                </button>
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
              <div
                className="mt-4 pt-4"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <DevRoleSwitcher variant="inline" onSelect={(role) => void enterDemoAs(role)} />
              </div>
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
