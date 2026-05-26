import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { buildInviteLink, type InviteCode } from './inviteLogic';

/**
 * Dual-mode invitation-email delivery (T147).
 *
 * Offline (demo, no backend): there is no mailbox to reach, so the send is a
 * no-op that resolves `ok` and the caller stamps the invite as sent, mirroring
 * how the rest of the app simulates the live behaviour offline.
 *
 * Live (`isSupabaseConfigured`): POST the recipient + onboarding link to the
 * `invite-email` Netlify function, which renders the shared bilingual template
 * and sends it via Resend. The function (and its caller-authorization hardening)
 * is the live activation half shared with T142; the rendered body and link are
 * built server-side and never logged here.
 */

export interface SendInviteEmailInput {
  invite: InviteCode;
  /** Display name of the asociație, for the subject and body. */
  asociatieName: string;
  /** App origin used to build the onboarding deep link. */
  baseUrl: string;
  /** Recipient locale (the inviter's UI locale offline; `users.locale` live). */
  locale: string;
}

export interface SendInviteEmailResult {
  ok: boolean;
  /** A short, non-PII reason when `ok` is false. */
  error?: string;
}

const INVITE_EMAIL_FUNCTION = '/.netlify/functions/invite-email';

export async function sendInviteEmail(input: SendInviteEmailInput): Promise<SendInviteEmailResult> {
  const to = input.invite.inviteeEmail?.trim();
  if (!to) return { ok: false, error: 'no-recipient' };

  if (!isSupabaseConfigured) {
    // Demo/offline: simulate the dispatch so the UI reflects a sent invite.
    return { ok: true };
  }

  try {
    const res = await fetch(INVITE_EMAIL_FUNCTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        locale: input.locale,
        recipientName: input.invite.inviteeName,
        asociatieName: input.asociatieName,
        inviteLink: buildInviteLink(input.invite, input.baseUrl),
      }),
    });
    return res.ok ? { ok: true } : { ok: false, error: 'send-failed' };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}
