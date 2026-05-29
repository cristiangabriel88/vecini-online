/**
 * Client-side wrappers for the live OTP channel Netlify functions (T143).
 *
 * `requestOtpLive` and `verifyOtpLive` call the T142 service-role functions
 * with the caller's bearer token so all server-side checks (rate limits, attempt
 * ceilings, session binding) are authoritative. Demo mode always bypasses these
 * -- this module is only reached from the live branches in mfaStore.
 *
 * `hasAppElevation` decodes the `app_2fa_at` claim from a Supabase access token
 * client-side, for the 2FA gate only. The JWT is already verified by Supabase;
 * we only read a claim it injected. The authoritative check is always server-side.
 */

import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import type { MfaChannel } from './otpChannelLogic';

const OTP_REQUEST_FUNCTION = '/.netlify/functions/mfa-otp-request';
const OTP_VERIFY_FUNCTION = '/.netlify/functions/mfa-otp-verify';

export interface OtpRequestResult {
  ok: boolean;
  error?: string;
}

export interface OtpVerifyResult {
  ok: boolean;
  error?: string;
}

async function getBearer(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Request an OTP for the given channel via the T142 Netlify function.
 * Returns `ok=true` on success, or an error code on failure.
 * Only intended to be called when `isSupabaseConfigured` is true.
 */
export async function requestOtpLive(channel: MfaChannel): Promise<OtpRequestResult> {
  if (!isSupabaseConfigured) return { ok: true };
  const token = await getBearer();
  if (!token) return { ok: false, error: 'no-session' };
  try {
    const res = await fetch(OTP_REQUEST_FUNCTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel }),
    });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const error = typeof body.error === 'string' ? body.error : 'request-failed';
    return { ok: false, error };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}

/**
 * Verify an OTP challenge via the T142 Netlify function.
 * Pass either a numeric `code` (typed by the user) or a `confirmToken`
 * (from the email confirm link). On success, the caller must call
 * `supabase.auth.refreshSession()` to pick up the `app_2fa_at` claim.
 * Only intended to be called when `isSupabaseConfigured` is true.
 */
export async function verifyOtpLive(
  channel: MfaChannel,
  code?: string,
  confirmToken?: string,
): Promise<OtpVerifyResult> {
  if (!isSupabaseConfigured) return { ok: true };
  const token = await getBearer();
  if (!token) return { ok: false, error: 'no-session' };
  try {
    const body: Record<string, string> = { channel };
    if (code) body.code = code;
    if (confirmToken) body.token = confirmToken;
    const res = await fetch(OTP_VERIFY_FUNCTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const resp = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const error = typeof resp.error === 'string' ? resp.error : 'verify-failed';
    return { ok: false, error };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}

/**
 * Decode the `app_2fa_at` claim from a raw Supabase JWT access token.
 * Returns true when the claim is present and non-zero, meaning the session
 * has been elevated by the Custom Access Token Hook after a successful
 * app-managed OTP verify (email or Telegram). Gate use only -- trust the
 * signed JWT, not the claim value itself.
 */
export function hasAppElevation(accessToken: string | undefined | null): boolean {
  if (!accessToken) return false;
  try {
    const segment = accessToken.split('.')[1];
    if (!segment) return false;
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(padded)) as Record<string, unknown>;
    return typeof decoded['app_2fa_at'] === 'number' && decoded['app_2fa_at'] > 0;
  } catch {
    return false;
  }
}
