import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { useAuthStore } from '@/shared/store/authStore';
import { useMfaStore } from '@/shared/store/mfaStore';
import { useSecurityStore } from '@/shared/store/securityStore';
import { formatDateTime } from '@/shared/lib/format';
import { isValidTotpFormat, mfaErrorKey, requiresMfa } from './mfaLogic';

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
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.memberships[0]?.role ?? null);
  const signOutEverywhere = useAuthStore((s) => s.signOutEverywhere);
  const events = useSecurityStore((s) => s.events);

  const {
    loaded,
    enrolled,
    draft,
    recoveryCodes,
    load,
    beginEnroll,
    confirmEnroll,
    cancelEnroll,
    disable,
    regenerateRecoveryCodes,
    clearRecoveryCodes,
  } = useMfaStore();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);

  const onSignOutEverywhere = async () => {
    setConfirmSignOutAll(false);
    await signOutEverywhere();
    navigate('/');
  };

  useEffect(() => {
    void load();
  }, [load]);

  const account = profile?.email ?? session?.user?.email ?? 'demo@vecini.online';
  const mustEnrol = requiresMfa(role) && !enrolled;

  const fail = (error: string) => toast.error(t(`auth.mfa.err.${mfaErrorKey(error)}`));

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
                <>
                  <Button variant="secondary" onClick={onRegenerate} loading={busy}>
                    <KeyRound className="h-4 w-4" /> {t('auth.mfa.regenerate')}
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmDisable(true)} disabled={busy}>
                    {t('auth.mfa.disable')}
                  </Button>
                </>
              ) : (
                <Button onClick={onBegin} loading={busy}>
                  <ShieldCheck className="h-4 w-4" /> {t('auth.mfa.enable')}
                </Button>
              )}
            </div>
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
    </div>
  );
}
