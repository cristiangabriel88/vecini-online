import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle, Mail, Send } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  blankAdminInvite,
  validateAdminInvite,
  type AdminInviteDraft,
} from './platformProvisioningLogic';
import { usePlatformAsociatiiStore } from './platformAsociatiiStore';

/**
 * Superadmin: dedicated "Add Association" page (T152).
 *
 * The operator enters only the new administrator's name and email address.
 * On submit a pending admin invite record is created (setup token + 24h expiry)
 * and the invitation email is dispatched (simulated offline; live dispatch is
 * wired in T92). The administrator then clicks the link in their email,
 * sets a password on `AccountSetupPage`, and completes the association
 * identity in `OnboardingWizard` (T154).
 *
 * No setup code or QR code is shown in the platform UI -- those live in the
 * email (T153 admin template). The page shows only a confirmation banner.
 */
export default function PlatformAddAsociatiePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inviteAdmin = usePlatformAsociatiiStore((s) => s.inviteAdmin);
  const markAdminEmailSent = usePlatformAsociatiiStore((s) => s.markAdminEmailSent);

  const [draft, setDraft] = useState<AdminInviteDraft>(blankAdminInvite());
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const { errors, value } = useMemo(() => validateAdminInvite(draft), [draft]);

  const set =
    (key: keyof AdminInviteDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((d) => ({ ...d, [key]: e.target.value }));

  const fieldError = (key: keyof AdminInviteDraft) =>
    touched && errors[key] ? t(`platform.addAsociatie.err.${errors[key]}`) : undefined;

  const handleSubmit = async () => {
    setTouched(true);
    if (!value) return;
    setSubmitting(true);
    try {
      const invite = inviteAdmin(value.adminName, value.adminEmail);
      // Demo/offline: the email dispatch is simulated. Live: T92's server-side
      // provisioning function handles the actual send via the invite-email
      // Netlify function (kind: 'admin_setup', T153 template). For now we
      // optimistically report success so the UX flow is complete end-to-end.
      if (!isSupabaseConfigured) {
        // Simulate a brief network round-trip in demo mode.
        await new Promise<void>((resolve) => setTimeout(resolve, 400));
      }
      markAdminEmailSent(invite.id);
      setSentTo(value.adminEmail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnotherOne = () => {
    setDraft(blankAdminInvite());
    setTouched(false);
    setSentTo(null);
  };

  if (sentTo) {
    return (
      <div className="platform-add-asoc">
        <div className="platform-add-asoc__success" role="status" aria-live="polite">
          <span className="platform-add-asoc__success-icon" aria-hidden="true">
            <CheckCircle size={44} />
          </span>
          <h2 className="platform-add-asoc__success-title">
            {t('platform.addAsociatie.sent', { email: sentTo })}
          </h2>
          <p className="platform-add-asoc__success-note">
            {isSupabaseConfigured
              ? t('platform.addAsociatie.sentNoteLive')
              : t('platform.addAsociatie.sentNoteDemo')}
          </p>
          <div className="platform-add-asoc__success-actions">
            <Button onClick={handleAnotherOne}>
              <Mail className="h-4 w-4" />
              {t('platform.addAsociatie.anotherOne')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/consola/asociatii')}>
              {t('platform.addAsociatie.backToList')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="platform-add-asoc">
      <div className="platform-add-asoc__back">
        <Link to="/consola/asociatii" className="platform-add-asoc__back-link">
          <ArrowLeft size={15} aria-hidden="true" />
          {t('platform.addAsociatie.back')}
        </Link>
      </div>

      <PageHeader
        title={t('platform.addAsociatie.title')}
        subtitle={t('platform.addAsociatie.subtitle')}
      />

      <div className="platform-add-asoc__card">
        <div className="platform-add-asoc__form">
          <Input
            label={t('platform.addAsociatie.adminName')}
            placeholder={t('platform.addAsociatie.adminNamePlaceholder')}
            value={draft.adminName}
            onChange={set('adminName')}
            error={fieldError('adminName')}
            autoComplete="name"
          />
          <Input
            label={t('platform.addAsociatie.adminEmail')}
            type="email"
            autoComplete="email"
            placeholder={t('platform.addAsociatie.adminEmailPlaceholder')}
            value={draft.adminEmail}
            onChange={set('adminEmail')}
            error={fieldError('adminEmail')}
          />
        </div>

        <p className="platform-add-asoc__form-note">
          {t('platform.addAsociatie.formNote')}
        </p>

        <div className="platform-add-asoc__actions">
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting || (touched && !value)}
          >
            <Send className="h-4 w-4" />
            {t('platform.addAsociatie.submit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
