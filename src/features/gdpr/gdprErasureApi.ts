import { isSupabaseConfigured, supabase } from '@/shared/lib/supabase';

/**
 * Client-side caller for the gdpr-erasure Netlify function (T72).
 * Invoked by gdprStore when an admin completes an erasure request.
 * No-op when Supabase is not configured (demo/offline mode).
 */
export async function triggerErasure(
  requestId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !requestId) return { ok: false, error: 'not-configured' };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: 'no-session' };

  try {
    const res = await fetch('/.netlify/functions/gdpr-erasure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: (body as { error?: string }).error ?? `http-${res.status}`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}

/**
 * Client-side caller for the gdpr-retention-purge Netlify function (T72).
 * Intended for manual administrative trigger; automatic runs are scheduled
 * monthly via the function's config export. No-op when not configured.
 */
export async function triggerRetentionPurge(): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'not-configured' };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: 'no-session' };

  try {
    const res = await fetch('/.netlify/functions/gdpr-retention-purge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: (body as { error?: string }).error ?? `http-${res.status}`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'network-error' };
  }
}
