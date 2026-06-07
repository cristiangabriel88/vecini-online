// Record permanent email send failures to the platform error stream (T258a).
//
// Called after sendEmail() exhausts its retry budget. Tags the report with the
// email template type and recipient class; never includes PII (no address, no
// user id). The platform superadmin error feed surfaces these reports.

import { isSupabaseAdminConfigured, supabaseAdmin } from './supabaseAdmin';

/** The email template that failed to send. */
export type EmailTemplate = 'invite' | 'admin-invite' | 'otp' | 'notify' | 'alert' | 'health';
/** Broad class of intended recipient; never a specific address. */
export type RecipientClass = 'resident' | 'admin' | 'ops';

/**
 * Persist a non-PII failure record to `platform_error_reports` so the
 * superadmin error feed can surface it. No-op when Supabase is not configured
 * (demo / offline mode). The caller must not pass any PII.
 */
export async function reportEmailFailure(
  template: EmailTemplate,
  recipientClass: RecipientClass,
  reason: string,
  attempts: number,
): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const at = Date.now();
  await supabaseAdmin()
    .from('platform_error_reports')
    .insert({
      ref: `email-${template}-${at.toString(36)}`,
      name: 'email.send-failed',
      message: `email:${template} to:${recipientClass} failed after ${attempts} attempt(s): ${reason}`,
      source: `email:${template}:${recipientClass}`,
      extra: { attempts },
      at,
      stage: process.env.DEPLOY_STAGE ?? null,
      release: process.env.DEPLOY_RELEASE ?? null,
    });
}
