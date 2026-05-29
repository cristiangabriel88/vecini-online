/**
 * Client-side module for the live recovery-code verification path (T29).
 *
 * Calls the `mfa-recovery-verify` Netlify function with the caller's bearer
 * token so user_id is resolved server-side and never trusted from the client.
 * Offline (demo, no backend): always returns ok=true because the demo path
 * already verifies the code against the in-memory hashes in mfaStore.
 */

import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';

const RECOVERY_VERIFY_FUNCTION = '/.netlify/functions/mfa-recovery-verify';

export interface RecoveryVerifyResult {
  ok: boolean;
  /** Short non-PII error code when ok is false. */
  error?: string;
}

/**
 * Verify a recovery code live via the privileged server routine.
 * On success the caller must call `supabase.auth.refreshSession()` to pick
 * up the `app_2fa_at` / `app_2fa_channel` claims injected by the Custom
 * Access Token Hook (T141).
 */
export async function verifyRecoveryCodeLive(code: string): Promise<RecoveryVerifyResult> {
  if (!isSupabaseConfigured) {
    // Demo path: verifyChallenge already handled this code locally. This
    // function is only called from the live branch, but guard for safety.
    return { ok: true };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: 'no-session' };

  try {
    const res = await fetch(RECOVERY_VERIFY_FUNCTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ code }),
    });

    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const errorCode = typeof body.error === 'string' ? body.error : 'verify-failed';
    return { ok: false, error: errorCode };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}
