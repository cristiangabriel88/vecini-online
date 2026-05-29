// notify-email: dispatch a notification email to a resident (T14).
//
// Authorization: the caller must be an admin/presedinte of the target
// asociatie OR the recipient themselves. The recipient's email address
// and locale are resolved from the DB -- never from the request body --
// to prevent use as an open relay.
//
// Consent gate: essential/urgent notifications bypass consent; community
// notifications check the resident's most recent consent_records row.
// A missing consent record is treated conservatively as no consent given.
// T26 will enforce this more strictly across the full fan-out.
//
// Privacy: never log email addresses, user ids, or notification body content.

import { buildNotificationEmail } from '../../src/shared/lib/notificationEmail';
import {
  shouldSendEmailNotif,
  defaultNotifEmailPrefs,
  type NotifEmailPrefs,
} from '../../src/shared/lib/notifPrefsLogic';
import { getMailMode, isResendConfigured, sendEmail } from './_shared/resend';
import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
  isAdminOfAsociatie,
} from './_shared/supabaseAdmin';

type NotifKind = 'membership.joined' | 'announcement.published' | 'generic';
type NotifPriority = 'low' | 'normal' | 'urgent';
type ConsentKind = 'essential' | 'community' | 'marketing';

interface NotifyEmailRequest {
  recipientUserId: string;
  asociatieId: string;
  kind: NotifKind;
  priority: NotifPriority;
  /** Kind-specific display data (name, role, title, body, link, etc.). */
  data: Record<string, string>;
  /** Overrides recipient's stored locale when provided. */
  locale?: string;
  consentKind: ConsentKind;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isConsentAllowed(choices: Record<string, unknown> | null, category: string): boolean {
  if (!choices) return false;
  return choices[category] === true;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  const mailMode = getMailMode();
  if (mailMode === 'resend' && !isResendConfigured()) {
    return json(503, { error: 'email-not-configured' });
  }
  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  // Auth: resolve the caller from the bearer token.
  const authHeader = req.headers.get('Authorization');
  const { userId: callerId, error: authError } = await verifyBearerToken(authHeader);
  if (!callerId) return json(401, { error: authError ?? 'unauthorized' });

  // Parse body.
  let payload: NotifyEmailRequest;
  try {
    payload = (await req.json()) as NotifyEmailRequest;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const { recipientUserId, asociatieId, kind, priority, data, locale, consentKind } = payload;
  if (!recipientUserId || !asociatieId || !kind || !priority || !consentKind) {
    return json(400, { error: 'missing-fields' });
  }

  // Authorization: caller must be admin of asociatie or the recipient.
  const callerIsAdmin = await isAdminOfAsociatie(callerId, asociatieId);
  if (!callerIsAdmin && callerId !== recipientUserId) {
    return json(403, { error: 'forbidden' });
  }

  // Resolve recipient email and locale from DB (server-side only -- never trust client).
  const { data: userRow } = await supabaseAdmin()
    .from('users')
    .select('email, locale')
    .eq('id', recipientUserId)
    .maybeSingle();
  if (!userRow?.email) return json(422, { error: 'no-recipient-email' });

  // Resolve notification preferences.
  const { data: prefsRow } = await supabaseAdmin()
    .from('notification_preferences')
    .select('email_enabled, quiet_hours_start, quiet_hours_end, timezone')
    .eq('user_id', recipientUserId)
    .maybeSingle();

  const prefs: NotifEmailPrefs = prefsRow
    ? {
        emailEnabled: prefsRow.email_enabled ?? true,
        quietHoursStart: prefsRow.quiet_hours_start ?? null,
        quietHoursEnd: prefsRow.quiet_hours_end ?? null,
        timezone: prefsRow.timezone ?? 'Europe/Bucharest',
      }
    : defaultNotifEmailPrefs();

  // Quiet hours + email-enabled gate (urgent always bypasses).
  if (!shouldSendEmailNotif(prefs, priority, Date.now())) {
    return json(200, { delivered: false, reason: 'suppressed' });
  }

  // Consent gate for non-essential, non-urgent notifications.
  if (consentKind !== 'essential' && priority !== 'urgent') {
    const { data: consentRow } = await supabaseAdmin()
      .from('consent_records')
      .select('choices')
      .eq('user_id', recipientUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const choices = (consentRow?.choices as Record<string, unknown> | null) ?? null;
    const consentCategory = consentKind === 'community' ? 'preferences' : 'marketing';
    if (!isConsentAllowed(choices, consentCategory)) {
      return json(200, { delivered: false, reason: 'consent-denied' });
    }
  }

  // Render email template.
  const resolvedLocale = locale ?? (userRow.locale as string | null) ?? 'ro';
  const appUrl = (process.env.APP_URL ?? 'https://vecini.online').replace(/\/+$/, '');
  const email = buildNotificationEmail({
    locale: resolvedLocale,
    kind,
    data,
    appUrl,
    recipientUserId,
  });

  if (mailMode === 'disabled') {
    return json(200, { delivered: false, reason: 'mail_disabled' });
  }

  if (mailMode === 'log') {
    void supabaseAdmin()
      .from('email_outbox')
      .insert({
        asociatie_id: asociatieId,
        to_email: userRow.email,
        subject: email.subject,
        body: email.text,
      });
    console.info('[mail:log] notification email queued', kind, priority);
    return json(200, { delivered: false, logged: true });
  }

  // mailMode === 'resend': live send.
  const result = await sendEmail({
    to: userRow.email as string,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  if (!result.ok) return json(502, { error: 'send-failed' });
  return json(200, { ok: true, messageId: result.messageId });
};
