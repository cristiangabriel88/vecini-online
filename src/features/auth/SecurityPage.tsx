import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Copy,
  Download,
  Smartphone,
  LogOut,
  History,
  Mail,
  Send,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { useAuthStore } from '@/shared/store/authStore';
import { useMfaStore } from '@/shared/store/mfaStore';
import { useSecurityStore } from '@/shared/store/securityStore';
import { useTelegramLinkStore } from '@/shared/store/telegramLinkStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { formatDateTime } from '@/shared/lib/format';
import { isValidTotpFormat, mfaErrorKey, requiresMfa } from './mfaLogic';
import { maskEmail, maskTelegram, isValidOtpFormat, type MfaChannel } from './otpChannelLogic';

/** Round a remaining-lockout duration up to whole minutes for the message. */
function lockoutMinutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60_000));
}

function downloadCodes(codes: string[]) {
  const blob = new Blob([`vecini.online — coduri de recuperare 2FA\n\n${codes.join('\n')}\n`], {
    type: 'text/plain',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vecini-coduri-recuperare.txt';
  a.click();
  URL.revokeObjectURL(url);
}

export default function SecurityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  // The path to return to after a successful step-up (set by useMfaEnforcement
  // when it steers the session here; falls back to /app when navigated directly).
  const returnTo: string = (location.state as { from?: string } | null)?.from ?? '/app';
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.activeRole)();
  const signOutEverywhere = useAuthStore((s) => s.signOutEverywhere);
  const events = useSecurityStore((s) => s.events);

  const {
    loaded,
    enrolled,
    draft,
    recoveryCodes,
    recoveryCodesRemaining,
    load,
    loadRecoveryCodesCount,
    loadChannels,
    beginEnroll,
    confirmEnroll,
    cancelEnroll,
    disable,
    regenerateRecoveryCodes,
    clearRecoveryCodes,
    challengeRequired,
    verifyChallenge,
    requestOtp,
    verifyOtp,
    demoEnabledChannels,
    liveEnabledChannels,
    enableChannel,
    disableChannel,
  } = useMfaStore();

  const telegramLinks = useTelegramLinkStore((s) => s.links);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  // In-app AAL2 step-up: a re-gated session (enrolled but still at AAL1) is
  // steered here by `useMfaEnforcement`, but the TOTP/recovery challenge itself
  // otherwise lives only in the login flow. Surface it here so the session can
  // elevate without a full re-login (T112). Live path only — demo mode is never
  // gated, so it never needs an in-app step-up.
  const [needsStepUp, setNeedsStepUp] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');
  // OTP channel step-up state (T159): mirrors the LoginPage channel picker flow.
  const [stepUpSelectedChannel, setStepUpSelectedChannel] = useState<MfaChannel | null>(null);
  const [stepUpOtpSent, setStepUpOtpSent] = useState(false);
  const [stepUpDemoCode, setStepUpDemoCode] = useState<string | null>(null);
  const [stepUpDemoConfirmToken, setStepUpDemoConfirmToken] = useState<string | null>(null);
  const [stepUpResendCountdown, setStepUpResendCountdown] = useState(0);
  const stepUpResendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onSignOutEverywhere = async () => {
    setConfirmSignOutAll(false);
    await signOutEverywhere();
    navigate('/');
  };

  useEffect(() => {
    void load();
    void loadChannels();
    void loadRecoveryCodesCount();
  }, [load, loadChannels, loadRecoveryCodesCount]);

  // Clean up the resend countdown timer when the component unmounts.
  useEffect(() => {
    return () => {
      if (stepUpResendTimerRef.current) clearInterval(stepUpResendTimerRef.current);
    };
  }, []);

  // Resolve whether this enrolled live session still owes the AAL2 challenge.
  useEffect(() => {
    if (!isSupabaseConfigured || !loaded || !enrolled) {
      setNeedsStepUp(false);
      return;
    }
    let active = true;
    void challengeRequired().then((needs) => {
      if (active) setNeedsStepUp(needs);
    });
    return () => {
      active = false;
    };
  }, [loaded, enrolled, challengeRequired]);

  // Reset all step-up OTP state when the step-up clears (either satisfied or no
  // longer needed), so a re-triggered step-up starts from the picker.
  useEffect(() => {
    if (needsStepUp) return;
    setStepUpSelectedChannel(null);
    setStepUpOtpSent(false);
    setStepUpDemoCode(null);
    setStepUpDemoConfirmToken(null);
    setStepUpCode('');
    if (stepUpResendTimerRef.current) clearInterval(stepUpResendTimerRef.current);
  }, [needsStepUp]);

  // Auto-select the channel when only one is available so single-channel users
  // never see the picker (mirrors the LoginPage behaviour, T140).
  useEffect(() => {
    if (!needsStepUp || stepUpSelectedChannel !== null) return;
    const channels = stepUpAvailableChannels();
    if (channels.length === 1) setStepUpSelectedChannel(channels[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsStepUp, stepUpSelectedChannel, enrolled, demoEnabledChannels, liveEnabledChannels]);

  /** Channels available for the step-up: TOTP when enrolled, delivered channels from live/demo state. */
  function stepUpAvailableChannels(): MfaChannel[] {
    const channels: MfaChannel[] = [];
    if (enrolled) channels.push('totp');
    const activeChannels = isSupabaseConfigured ? liveEnabledChannels : demoEnabledChannels;
    if (activeChannels['email']) channels.push('email');
    if (activeChannels['telegram']) channels.push('telegram');
    return channels;
  }

  /** Tick down the step-up resend countdown every second. */
  const startStepUpResendTimer = useCallback((remainingMs: number) => {
    setStepUpResendCountdown(Math.ceil(remainingMs / 1000));
    if (stepUpResendTimerRef.current) clearInterval(stepUpResendTimerRef.current);
    stepUpResendTimerRef.current = setInterval(() => {
      setStepUpResendCountdown((prev) => {
        if (prev <= 1) {
          if (stepUpResendTimerRef.current) clearInterval(stepUpResendTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /** Reset the step-up channel picker (used by the "Use a different method" link). */
  const resetStepUpChannel = () => {
    setStepUpSelectedChannel(null);
    setStepUpOtpSent(false);
    setStepUpDemoCode(null);
    setStepUpDemoConfirmToken(null);
    setStepUpCode('');
    if (stepUpResendTimerRef.current) clearInterval(stepUpResendTimerRef.current);
  };

  const account = profile?.email ?? session?.user?.email ?? 'demo@vecini.online';
  const mustEnrol = requiresMfa(role) && !enrolled;

  const fail = (error: string) => toast.error(t(`auth.mfa.err.${mfaErrorKey(error)}`));

  // OTP channel helpers (T140)
  const currentUserId = profile?.id ?? session?.user?.id ?? 'demo-user';

  /** Whether the current user has a linked Telegram account. */
  const myTelegramLink = telegramLinks.find((l) => l.userId === currentUserId) ?? null;

  const handleEnableChannel = async (channel: MfaChannel) => {
    setBusy(true);
    try {
      if (channel === 'email') {
        const hint = maskEmail(account);
        const { error } = await enableChannel('email', hint);
        if (error) { fail(error); return; }
        toast.success(t('auth.mfa.channels.enabledToast', { channel: t('auth.mfa.channels.emailLabel') }));
      } else if (channel === 'telegram') {
        if (!myTelegramLink) {
          toast.error(t('auth.mfa.channels.telegramNotLinked'));
          return;
        }
        const handle = myTelegramLink.username ?? myTelegramLink.firstName ?? '';
        const hint = maskTelegram(handle);
        const { error } = await enableChannel('telegram', hint);
        if (error) { fail(error); return; }
        toast.success(t('auth.mfa.channels.enabledToast', { channel: t('auth.mfa.channels.telegramLabel') }));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDisableChannel = async (channel: MfaChannel) => {
    setBusy(true);
    try {
      const { error } = await disableChannel(channel);
      if (error) { fail(error); return; }
      toast.success(t('auth.mfa.channels.disabledToast'));
    } finally {
      setBusy(false);
    }
  };

  const activeChannels = isSupabaseConfigured ? liveEnabledChannels : demoEnabledChannels;
  const emailEnabled = Boolean(activeChannels['email']);
  const telegramEnabled = Boolean(activeChannels['telegram']);

  const onBegin = async () => {
    setBusy(true);
    try {
      const { error } = await beginEnroll(account);
      if (error) fail(error);
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidTotpFormat(code)) return;
    setBusy(true);
    try {
      const { error } = await confirmEnroll(code);
      if (error) {
        fail(error);
        return;
      }
      setCode('');
      toast.success(t('auth.mfa.enabledToast'));
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    setCode('');
    await cancelEnroll();
  };

  const onDisable = async () => {
    setBusy(true);
    try {
      const { error } = await disable();
      setConfirmDisable(false);
      if (error) fail(error);
      else toast.success(t('auth.mfa.disabledToast'));
    } finally {
      setBusy(false);
    }
  };

  const onRegenerate = async () => {
    setConfirmRegen(false);
    setBusy(true);
    try {
      const { error } = await regenerateRecoveryCodes();
      if (error) fail(error);
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    if (!recoveryCodes) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      toast.success(t('auth.mfa.copied'));
    } catch {
      /* clipboard unavailable — the codes remain visible to copy manually */
    }
  };

  /**
   * Submit the in-app step-up challenge. Dispatches to `verifyOtp` for
   * email/Telegram channels, or `verifyChallenge` for TOTP/recovery (T159).
   */
  const onStepUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepUpCode.trim()) return;
    setBusy(true);
    try {
      const channel = stepUpSelectedChannel;
      const result =
        channel === 'email' || channel === 'telegram'
          ? await verifyOtp(channel, stepUpCode)
          : await verifyChallenge(stepUpCode);

      const { error, lockedMs } = result;
      if (lockedMs > 0) {
        toast.error(t('auth.mfaLockout', { minutes: lockoutMinutes(lockedMs) }));
        setStepUpCode('');
        return;
      }
      if (error) {
        fail(error);
        return;
      }
      setStepUpCode('');
      setNeedsStepUp(false);
      toast.success(t('auth.mfa.stepUpDone'));
      navigate(returnTo);
    } finally {
      setBusy(false);
    }
  };

  /** Request an OTP for the selected delivered channel during the step-up. */
  const handleStepUpSendOtp = async () => {
    const channel = stepUpSelectedChannel;
    if (!channel || (channel !== 'email' && channel !== 'telegram')) return;
    setBusy(true);
    try {
      const result = await requestOtp(channel);
      if (result.cooldownMs > 0) {
        startStepUpResendTimer(result.cooldownMs);
        return;
      }
      if (result.error) {
        toast.error(t(`auth.mfa.err.${mfaErrorKey(result.error)}`));
        return;
      }
      setStepUpOtpSent(true);
      setStepUpDemoCode(result.demoCode ?? null);
      setStepUpDemoConfirmToken(result.demoConfirmToken ?? null);
      startStepUpResendTimer(60_000); // OTP_RESEND_COOLDOWN_MS
    } finally {
      setBusy(false);
    }
  };

  /** Resend the OTP for the selected channel during the step-up. */
  const handleStepUpResendOtp = async () => {
    const channel = stepUpSelectedChannel;
    if (!channel || (channel !== 'email' && channel !== 'telegram')) return;
    if (stepUpResendCountdown > 0) return;
    setBusy(true);
    try {
      const result = await requestOtp(channel);
      if (result.cooldownMs > 0) {
        startStepUpResendTimer(result.cooldownMs);
        return;
      }
      if (result.error) {
        toast.error(t(`auth.mfa.err.${mfaErrorKey(result.error)}`));
        return;
      }
      setStepUpDemoCode(result.demoCode ?? null);
      setStepUpDemoConfirmToken(result.demoConfirmToken ?? null);
      startStepUpResendTimer(60_000);
      toast.success(t('auth.mfa.channels.resent'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('nav.security')} subtitle={t('auth.mfa.subtitle')} />
      <div className="mx-auto max-w-xl space-y-4">
        {mustEnrol && !draft && (
          <div
            className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
            role="alert"
          >
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{t('auth.mfa.requiredNotice')}</p>
          </div>
        )}

        {/*
          In-app AAL2 step-up for a re-gated enrolled-but-AAL1 session (T112/T159).
          Shows the full OTP channel picker + send/verify flow mirroring the
          LoginPage challenge, so email/Telegram channels work from the security
          page just as they do at sign-in.
        */}
        {needsStepUp && !draft && !recoveryCodes && (
          <Card title={t('auth.mfa.stepUpTitle')}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <p className="text-sm text-muted">
                {stepUpSelectedChannel === 'email'
                  ? t('auth.mfa.channels.emailChallengeBody', {
                      hint: demoEnabledChannels['email']?.targetHint ?? '',
                    })
                  : stepUpSelectedChannel === 'telegram'
                    ? t('auth.mfa.channels.telegramChallengeBody', {
                        hint: demoEnabledChannels['telegram']?.targetHint ?? '',
                      })
                    : t('auth.mfa.stepUpBody')}
              </p>
            </div>

            {/* Channel picker: shown when multiple channels are available and none is selected. */}
            {!stepUpSelectedChannel && stepUpAvailableChannels().length > 1 && (
              <div className="mt-4 space-y-2">
                <p className="text-center text-xs font-medium uppercase tracking-wide text-muted">
                  {t('auth.mfa.channels.choosePicker')}
                </p>
                {stepUpAvailableChannels().map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5"
                    onClick={() => setStepUpSelectedChannel(ch)}
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

            {/* TOTP / recovery-code input (auto-selected when TOTP is the only channel). */}
            {stepUpSelectedChannel === 'totp' && (
              <form onSubmit={onStepUp} className="mt-4 space-y-3">
                <Input
                  label={t('auth.mfa.codeLabel')}
                  inputMode="text"
                  autoComplete="one-time-code"
                  autoFocus
                  value={stepUpCode}
                  onChange={(e) => setStepUpCode(e.target.value)}
                  hint={t('auth.mfa.challengeHint')}
                  required
                />
                <Button type="submit" loading={busy} disabled={!stepUpCode.trim()}>
                  <ShieldCheck className="h-4 w-4" /> {t('auth.mfa.verify')}
                </Button>
              </form>
            )}

            {/* Email / Telegram OTP: "Send code" button before the code is sent. */}
            {(stepUpSelectedChannel === 'email' || stepUpSelectedChannel === 'telegram') &&
              !stepUpOtpSent && (
                <div className="mt-4">
                  <Button
                    className="w-full"
                    loading={busy}
                    onClick={() => void handleStepUpSendOtp()}
                  >
                    {stepUpSelectedChannel === 'email'
                      ? t('auth.mfa.channels.sendEmail')
                      : t('auth.mfa.channels.sendTelegram')}
                  </Button>
                </div>
              )}

            {/* Email / Telegram OTP: code input after the code is sent. */}
            {(stepUpSelectedChannel === 'email' || stepUpSelectedChannel === 'telegram') &&
              stepUpOtpSent && (
                <form onSubmit={onStepUp} className="mt-4 space-y-3">
                  {/* Demo affordance: show the one-time code on-screen. */}
                  {stepUpDemoCode && (
                    <div className="rounded-lg border border-warning/30 bg-warning/8 px-4 py-3">
                      <p className="text-xs font-medium text-warning">
                        {t('auth.mfa.channels.demoNotice')}
                      </p>
                      <p
                        className="iv-mono mt-1 text-center text-2xl font-bold tracking-[0.3em] text-text"
                        aria-label={t('auth.mfa.channels.demoCodeAriaLabel')}
                      >
                        {stepUpDemoCode}
                      </p>
                      {stepUpDemoConfirmToken && stepUpSelectedChannel === 'email' && (
                        <p className="mt-2 text-center text-xs text-muted">
                          {t('auth.mfa.channels.orClickLink')}{' '}
                          <Link
                            to={`/confirma-2fa?token=${encodeURIComponent(stepUpDemoConfirmToken)}&channel=${stepUpSelectedChannel}`}
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
                    value={stepUpCode}
                    maxLength={6}
                    onChange={(e) => setStepUpCode(e.target.value.replace(/\D/g, ''))}
                    hint={t('auth.mfa.channels.otpHint')}
                    required
                  />
                  <Button
                    type="submit"
                    loading={busy}
                    disabled={!isValidOtpFormat(stepUpCode)}
                  >
                    <ShieldCheck className="h-4 w-4" /> {t('auth.mfa.verify')}
                  </Button>
                  <button
                    type="button"
                    className="auth-link block w-full text-center text-sm"
                    disabled={stepUpResendCountdown > 0 || busy}
                    onClick={() => void handleStepUpResendOtp()}
                  >
                    {stepUpResendCountdown > 0
                      ? t('auth.mfa.channels.resendIn', { seconds: stepUpResendCountdown })
                      : t('auth.mfa.channels.resend')}
                  </button>
                </form>
              )}

            {/* "Use a different method" back link when a channel is selected and multiple exist. */}
            {stepUpSelectedChannel && stepUpAvailableChannels().length > 1 && (
              <button
                type="button"
                className="auth-link mt-3 block w-full text-center text-sm"
                onClick={resetStepUpChannel}
              >
                {t('auth.mfa.channels.changeChannel')}
              </button>
            )}
          </Card>
        )}

        {/* Freshly minted recovery codes — shown once. */}
        {recoveryCodes && (
          <Card title={t('auth.mfa.recoveryTitle')}>
            <p className="text-sm text-muted">{t('auth.mfa.recoveryBody')}</p>
            <ul className="mt-3 grid grid-cols-2 gap-2" aria-label={t('auth.mfa.recoveryTitle')}>
              {recoveryCodes.map((c) => (
                <li
                  key={c}
                  className="iv-mono rounded-md bg-[var(--bg-sunken)] px-3 py-2 text-center text-sm tracking-wider"
                >
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={copyCodes}>
                <Copy className="h-4 w-4" /> {t('auth.mfa.copy')}
              </Button>
              <Button variant="secondary" onClick={() => downloadCodes(recoveryCodes)}>
                <Download className="h-4 w-4" /> {t('auth.mfa.download')}
              </Button>
              <Button onClick={() => clearRecoveryCodes()}>{t('auth.mfa.savedCodes')}</Button>
            </div>
          </Card>
        )}

        {/* Enrollment in progress. */}
        {draft && !recoveryCodes && (
          <Card title={t('auth.mfa.enrollTitle')}>
            <ol className="mb-4 space-y-1 text-sm text-muted">
              <li>{t('auth.mfa.step1')}</li>
              <li>{t('auth.mfa.step2')}</li>
            </ol>
            {draft.qrSvg ? (
              // An SVG loaded through <img src=data:...> cannot execute scripts,
              // so this renders the QR without an HTML-injection surface.
              <img
                className="mx-auto mb-3 h-44 w-44"
                alt={t('auth.mfa.qrAlt')}
                src={
                  draft.qrSvg.startsWith('data:')
                    ? draft.qrSvg
                    : `data:image/svg+xml;utf8,${encodeURIComponent(draft.qrSvg)}`
                }
              />
            ) : (
              <div className="mb-3 flex items-start gap-3 rounded-lg bg-[var(--bg-sunken)] px-4 py-3 text-sm">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-muted">{t('auth.mfa.manualHint')}</p>
              </div>
            )}
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wide text-muted">{t('auth.mfa.manualKey')}</p>
              <code className="iv-mono mt-1 block break-all rounded-md bg-[var(--bg-sunken)] px-3 py-2 text-sm">
                {draft.secret}
              </code>
            </div>
            <form onSubmit={onConfirm} className="space-y-3">
              <Input
                label={t('auth.mfa.codeLabel')}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                hint={t('auth.mfa.codeHint')}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" loading={busy} disabled={!isValidTotpFormat(code)}>
                  {t('auth.mfa.verifyEnable')}
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Idle states: enabled, or not yet enabled. */}
        {!draft && !recoveryCodes && loaded && (
          <Card>
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: enrolled ? 'var(--success-soft, var(--primary-soft))' : 'var(--bg-sunken)',
                  color: enrolled ? 'var(--success, var(--primary))' : 'var(--text-muted)',
                }}
              >
                {enrolled ? <ShieldCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">
                  {enrolled ? t('auth.mfa.statusOn') : t('auth.mfa.statusOff')}
                </h3>
                <p className="mt-0.5 text-sm text-muted">
                  {enrolled ? t('auth.mfa.statusOnBody') : t('auth.mfa.intro')}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {enrolled ? (
                <Button variant="danger" onClick={() => setConfirmDisable(true)} disabled={busy}>
                  {t('auth.mfa.disable')}
                </Button>
              ) : (
                <Button onClick={onBegin} loading={busy}>
                  <ShieldCheck className="h-4 w-4" /> {t('auth.mfa.enable')}
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Recovery codes card — shown only when TOTP is enrolled. */}
        {enrolled && !draft && !recoveryCodes && (
          <Card title={t('auth.mfa.codesCardTitle')}>
            <p className="text-sm text-muted">{t('auth.mfa.codesCardBody')}</p>
            <div className="mt-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4 shrink-0 text-muted" />
              <span
                className="text-sm font-medium"
                style={{
                  color:
                    recoveryCodesRemaining === 0
                      ? 'var(--warning)'
                      : 'var(--text)',
                }}
              >
                {recoveryCodesRemaining === null
                  ? null
                  : t('auth.mfa.codesRemaining', { count: recoveryCodesRemaining })}
              </span>
            </div>
            {needsStepUp && isSupabaseConfigured && (
              <p className="mt-3 text-sm text-muted">{t('auth.mfa.codesStepUpHint')}</p>
            )}
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => setConfirmRegen(true)}
                loading={busy}
                disabled={needsStepUp && isSupabaseConfigured}
              >
                <KeyRound className="h-4 w-4" /> {t('auth.mfa.regenerate')}
              </Button>
            </div>
          </Card>
        )}

        {/* Second-factor channels (T140): email + Telegram OTP. */}
        {!draft && !recoveryCodes && (
          <Card title={t('auth.mfa.channels.title')}>
            <p className="text-sm text-muted">{t('auth.mfa.channels.body')}</p>
            <ul className="mt-4 divide-y divide-[var(--border)]">
              {/* Email channel */}
              <li className="flex items-center gap-3 py-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: emailEnabled ? 'var(--success-soft, var(--primary-soft))' : 'var(--bg-sunken)',
                    color: emailEnabled ? 'var(--success, var(--primary))' : 'var(--text-muted)',
                  }}
                >
                  {emailEnabled ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t('auth.mfa.channels.emailLabel')}</p>
                  {emailEnabled && activeChannels['email'] && (
                    <p className="text-xs text-muted">{activeChannels['email'].targetHint}</p>
                  )}
                </div>
                <Button
                  variant={emailEnabled ? 'danger' : 'secondary'}
                  className="shrink-0 text-sm"
                  onClick={() =>
                    emailEnabled ? handleDisableChannel('email') : handleEnableChannel('email')
                  }
                >
                  {emailEnabled ? t('auth.mfa.channels.disable') : t('auth.mfa.channels.enable')}
                </Button>
              </li>

              {/* Telegram channel */}
              <li className="flex items-center gap-3 py-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: telegramEnabled ? 'var(--success-soft, var(--primary-soft))' : 'var(--bg-sunken)',
                    color: telegramEnabled ? 'var(--success, var(--primary))' : 'var(--text-muted)',
                  }}
                >
                  {telegramEnabled ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t('auth.mfa.channels.telegramLabel')}</p>
                  {telegramEnabled && activeChannels['telegram'] && (
                    <p className="text-xs text-muted">{activeChannels['telegram'].targetHint}</p>
                  )}
                  {!telegramEnabled && !myTelegramLink && (
                    <p className="text-xs text-muted">
                      {t('auth.mfa.channels.telegramLinkHint')}{' '}
                      <Link to="/app/profil" className="auth-link text-xs">
                        <MessageCircle className="mr-0.5 inline h-3 w-3" />
                        {t('auth.mfa.channels.telegramLinkAction')}
                      </Link>
                    </p>
                  )}
                </div>
                <Button
                  variant={telegramEnabled ? 'danger' : 'secondary'}
                  className="shrink-0 text-sm"
                  disabled={!telegramEnabled && !myTelegramLink}
                  onClick={() =>
                    telegramEnabled ? handleDisableChannel('telegram') : handleEnableChannel('telegram')
                  }
                >
                  {telegramEnabled ? t('auth.mfa.channels.disable') : t('auth.mfa.channels.enable')}
                </Button>
              </li>
            </ul>
          </Card>
        )}

        {/* Sessions: revoke every signed-in session for this account. */}
        {!draft && !recoveryCodes && (
          <Card title={t('auth.sessions.title')}>
            <p className="text-sm text-muted">{t('auth.sessions.body')}</p>
            <div className="mt-4">
              <Button variant="secondary" onClick={() => setConfirmSignOutAll(true)}>
                <LogOut className="h-4 w-4" /> {t('auth.sessions.signOutAll')}
              </Button>
            </div>
          </Card>
        )}

        {/* Recent security activity — the resident's own audit stream. */}
        {!draft && !recoveryCodes && (
          <Card title={t('auth.audit.title')}>
            <p className="text-sm text-muted">{t('auth.audit.body')}</p>
            {events.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{t('auth.audit.empty')}</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {events.map((e, i) => (
                  <li key={`${e.at}-${i}`} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-sunken)] text-muted">
                      <History className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t(`auth.audit.event.${e.type}`)}</p>
                      <p className="text-xs text-muted">
                        {formatDateTime(e.at)}
                        {e.emailMask ? ` · ${e.emailMask}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <Modal
        open={confirmDisable}
        onClose={() => setConfirmDisable(false)}
        title={t('auth.mfa.disableTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDisable(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={onDisable} loading={busy}>
              {t('auth.mfa.disable')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {mustEnrol || requiresMfa(role) ? t('auth.mfa.disableWarnRequired') : t('auth.mfa.disableWarn')}
        </p>
      </Modal>

      <Modal
        open={confirmSignOutAll}
        onClose={() => setConfirmSignOutAll(false)}
        title={t('auth.sessions.confirmTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmSignOutAll(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={onSignOutEverywhere}>
              {t('auth.sessions.signOutAll')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('auth.sessions.confirmBody')}</p>
      </Modal>

      <Modal
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        title={t('auth.mfa.regenConfirmTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRegen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={onRegenerate} loading={busy}>
              {t('auth.mfa.regenConfirm')}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <p className="text-sm text-muted">{t('auth.mfa.regenConfirmBody')}</p>
        </div>
      </Modal>
    </div>
  );
}
