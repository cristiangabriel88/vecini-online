import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle, Mail, Send } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  blankAdminInvite,
  validateAdminInvite,
  type AdminInviteDraft,
} from './platformProvisioningLogic';
import { usePlatformAsociatiiStore } from './platformAsociatiiStore';

/** Endpoint for the T92 service-role provisioning function. */
const PROVISION_FUNCTION = '/.netlify/functions/provision-asociatie';

/**
 * Superadmin: dedicated "Add Association" page (T152).
 *
 * The operator enters only the new administrator's name and email address.
 * On submit a pending admin invite record is created (setup token + 24h expiry)
 * and the invitation email is dispatched:
 *  - Live (`isSupabaseConfigured`): calls the `provision-asociatie` Netlify
 *    function (T92) which re-verifies the caller is a superadmin server-side,
 *    creates the asociatie row, issues the invite_codes row, and dispatches
 *    the real admin invite email when Resend is configured.
 *  - Demo/offline: simulates the round-trip via a local Zustand record.
 *
 * No setup code or QR code is shown in the platform UI -- those live in the
 * email (T153 admin template). The page shows only a confirmation banner.
 */
export default function PlatformAddAsociatiePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const inviteAdmin = usePlatformAsociatiiStore((s) => s.inviteAdmin);
  const markAdminEmailSent = usePlatformAsociatiiStore((s) => s.markAdminEmailSent);

  const [draft, setDraft] = useState<AdminInviteDraft>(blankAdminInvite());
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  /** Error message surfaced when the live provisioning call fails. */
  const [liveError, setLiveError] = useState<string | null>(null);
  /**
   * Whether the real invite email was dispatched by the server (live mode only).
   * False when Resend is not configured or the send failed (invite still created).
   */
  const [emailSentLive, setEmailSentLive] = useState(false);

  const { errors, value } = useMemo(() => validateAdminInvite(draft), [draft]);

  const set =
    (key: keyof AdminInviteDraft) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((d) => ({ ...d, [key]: e.target.value }));
      setLiveError(null);
    };

  const fieldError = (key: keyof AdminInviteDraft) =>
    touched && errors[key] ? t(`platform.addAsociatie.err.${errors[key]}`) : undefined;

  const handleSubmit = async () => {
    setTouched(true);
    if (!value) return;
    setSubmitting(true);
    setLiveError(null);
    try {
      if (isSupabaseConfigured) {
        // Live path: call the service-role provisioning function with a bearer
        // token so the function can re-verify the caller server-side.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLiveError(t('platform.addAsociatie.err.notConfigured'));
          return;
        }
        const res = await fetch(PROVISION_FUNCTION, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            adminName: value.adminName,
            adminEmail: value.adminEmail,
            locale: i18n.language,
          }),
        });
        if (res.status === 503) {
          setLiveError(t('platform.addAsociatie.err.notConfigured'));
          return;
        }
        if (res.status === 403) {
          setLiveError(t('platform.addAsociatie.err.forbidden'));
          return;
        }
        if (!res.ok) {
          setLiveError(t('platform.addAsociatie.err.provisionFailed'));
          return;
        }
        const body = (await res.json()) as {
          ok: boolean;
          inviteId: string;
          emailSent: boolean;
        };
        // Mirror to local store for display in the pending invites list.
        const invite = inviteAdmin(value.adminName, value.adminEmail);
        if (body.emailSent) markAdminEmailSent(invite.id);
        setEmailSentLive(body.emailSent);
      } else {
        // Demo/offline: simulate a brief round-trip so the UX flow is complete.
        const invite = inviteAdmin(value.adminName, value.adminEmail);
        await new Promise<void>((resolve) => setTimeout(resolve, 400));
        markAdminEmailSent(invite.id);
      }
      setSentTo(value.adminEmail);
    } catch {
      setLiveError(t('platform.addAsociatie.err.provisionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnotherOne = () => {
    setDraft(blankAdminInvite());
    setTouched(false);
    setSentTo(null);
    setLiveError(null);
    setEmailSentLive(false);
  };

  if (sentTo) {
    // Determine which success note to show:
    //  - live + email sent -> sentNoteLive
    //  - live + email not sent -> sentNoteLiveNoEmail (Resend not configured)
    //  - offline/demo -> sentNoteDemo
    const successNote = isSupabaseConfigured
      ? emailSentLive
        ? t('platform.addAsociatie.sentNoteLive')
        : t('platform.addAsociatie.sentNoteLiveNoEmail')
      : t('platform.addAsociatie.sentNoteDemo');

    return (
      <div className="platform-add-asoc">
        <div className="platform-add-asoc__success" role="status" aria-live="polite">
          <span className="platform-add-asoc__success-icon" aria-hidden="true">
            <CheckCircle size={44} />
          </span>
          <h2 className="platform-add-asoc__success-title">
            {t('platform.addAsociatie.sent', { email: sentTo })}
          </h2>
          <p className="platform-add-asoc__success-note">{successNote}</p>
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

        {liveError && (
          <p className="platform-add-asoc__live-error" role="alert">
            {liveError}
          </p>
        )}
      </div>
    </div>
  );
}
