import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, KeyRound, Mail, ShieldOff } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { usePlatformSupportStore } from './platformSupportStore';

/**
 * Platform superadmin support actions (T297).
 *
 * Currently hosts the "reset user 2FA" total-lockout fallback: wipes all TOTP
 * factors, MFA channels, recovery codes, and session elevations for a given
 * user email so they can re-enrol from scratch.
 */
export default function PlatformSupportPage() {
  const { t } = useTranslation();
  const loading = usePlatformSupportStore((s) => s.loading);
  const error = usePlatformSupportStore((s) => s.error);
  const success = usePlatformSupportStore((s) => s.success);
  const clear = usePlatformSupportStore((s) => s.clear);
  const resetUserMfa = usePlatformSupportStore((s) => s.resetUserMfa);

  const [email, setEmail] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setInputError(t('platform.support.mfaReset.err.invalidEmail'));
      return;
    }
    setInputError(null);
    setConfirming(true);
  }

  function handleCancel() {
    setConfirming(false);
  }

  async function handleConfirm() {
    setConfirming(false);
    await resetUserMfa(email.trim().toLowerCase());
  }

  function handleReset() {
    setEmail('');
    setConfirming(false);
    setInputError(null);
    clear();
  }

  return (
    <div>
      <PageHeader
        title={t('platform.support.title')}
        subtitle={t('platform.support.subtitle')}
      />

      {/* MFA reset section */}
      <section aria-labelledby="mfa-reset-heading">
        <h2
          id="mfa-reset-heading"
          style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <KeyRound size={15} aria-hidden="true" />
          {t('platform.support.mfaReset.sectionTitle')}
        </h2>

        {/* Contextual warning */}
        <Card className="mb-4" style={{ borderColor: 'var(--color-warning)', borderWidth: 1, borderStyle: 'solid' }}>
          <div className="flex items-start gap-3">
            <span style={{ color: 'var(--color-warning)', marginTop: 2 }} aria-hidden="true">
              <AlertTriangle size={16} />
            </span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: 'var(--color-text)' }}>
                {t('platform.support.mfaReset.warningTitle')}
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                {t('platform.support.mfaReset.warningBody')}
              </p>
            </div>
          </div>
        </Card>

        {/* Success state */}
        {success && (
          <Card
            className="mb-4"
            style={{ borderColor: 'var(--color-success)', borderWidth: 1, borderStyle: 'solid' }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} aria-hidden="true" />
              <p style={{ fontSize: 13, color: 'var(--color-success)', margin: 0 }}>
                {t('platform.support.mfaReset.successMsg')}
              </p>
            </div>
            <div style={{ marginTop: 12 }}>
              <Button variant="secondary" size="sm" onClick={handleReset}>
                {t('platform.support.mfaReset.resetAgain')}
              </Button>
            </div>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Card
            className="mb-4"
            style={{ borderColor: 'var(--color-danger)', borderWidth: 1, borderStyle: 'solid' }}
          >
            <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0 }}>
              {t(`platform.support.mfaReset.err.${error}`, {
                defaultValue: t('platform.support.mfaReset.err.failed'),
              })}
            </p>
          </Card>
        )}

        {/* Confirmation dialog */}
        {confirming && (
          <Card
            className="mb-4"
            style={{ borderColor: 'var(--color-danger)', borderWidth: 1, borderStyle: 'solid' }}
          >
            <div className="flex items-start gap-3" style={{ marginBottom: 12 }}>
              <ShieldOff size={16} style={{ color: 'var(--color-danger)', marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: 'var(--color-text)' }}>
                  {t('platform.support.mfaReset.confirmTitle')}
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>
                  {t('platform.support.mfaReset.confirmBody', { email: email.trim() })}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
                  {t('platform.support.mfaReset.confirmClearsNote')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => void handleConfirm()}
                disabled={loading}
              >
                {t('platform.support.mfaReset.confirmBtn')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
              >
                {t('platform.support.mfaReset.cancelBtn')}
              </Button>
            </div>
          </Card>
        )}

        {/* Input form */}
        {!success && !confirming && (
          <Card>
            <form onSubmit={handleSubmit} noValidate>
              <div className="platform-detail-field" style={{ marginBottom: 16 }}>
                <label
                  htmlFor="mfa-reset-email"
                  className="platform-detail-reason-label"
                >
                  <Mail size={13} aria-hidden="true" />
                  {t('platform.support.mfaReset.emailLabel')}
                </label>
                <input
                  id="mfa-reset-email"
                  type="email"
                  className="platform-detail-reason-input platform-detail-reason-input--single"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  placeholder={t('platform.support.mfaReset.emailPlaceholder')}
                  aria-invalid={!!inputError}
                  aria-describedby={inputError ? 'mfa-reset-email-err' : undefined}
                  disabled={loading}
                  autoComplete="email"
                />
                {inputError && (
                  <span
                    id="mfa-reset-email-err"
                    className="platform-detail-field-error"
                    role="alert"
                  >
                    {inputError}
                  </span>
                )}
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '6px 0 0' }}>
                  {t('platform.support.mfaReset.emailHint')}
                </p>
              </div>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                disabled={loading || !email.trim()}
              >
                <ShieldOff size={14} />
                {t('platform.support.mfaReset.submitBtn')}
              </Button>
            </form>
          </Card>
        )}
      </section>
    </div>
  );
}
