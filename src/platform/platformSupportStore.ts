import { create } from 'zustand';
import { useAuthStore } from '@/shared/store/authStore';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { usePlatformAuthStore } from './platformAuthStore';
import { reportError } from '@/shared/lib/errorReporting';

export interface PlatformSupportState {
  loading: boolean;
  error: string | null;
  success: boolean;
  /** Clear the last outcome so the form is ready for a new request. */
  clear: () => void;
  /** Reset all 2FA state for the user identified by email. */
  resetUserMfa: (email: string) => Promise<void>;
}

async function callResetMfa(
  email: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch('/.netlify/functions/platform-reset-user-mfa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    });
    const data = (await resp.json()) as Record<string, unknown>;
    if (!resp.ok) return { ok: false, error: String(data.error ?? 'failed') };
    return { ok: true };
  } catch (err) {
    reportError(err, { source: 'platformSupportStore.callResetMfa' });
    return { ok: false, error: 'failed' };
  }
}

export const usePlatformSupportStore = create<PlatformSupportState>()((set) => ({
  loading: false,
  error: null,
  success: false,

  clear: () => set({ loading: false, error: null, success: false }),

  resetUserMfa: async (email: string) => {
    set({ loading: true, error: null, success: false });

    const demo = usePlatformAuthStore.getState().demo;
    const isDemo = demo || !isSupabaseConfigured;

    if (isDemo) {
      // Demo mode: simulate success after a short delay.
      await new Promise<void>((r) => setTimeout(r, 600));
      set({ loading: false, success: true });
      return;
    }

    const token = useAuthStore.getState().session?.access_token ?? '';
    if (!token) {
      set({ loading: false, error: 'unauthorized' });
      return;
    }

    const result = await callResetMfa(email, token);
    if (!result.ok) {
      set({ loading: false, error: result.error ?? 'failed' });
      return;
    }
    set({ loading: false, success: true });
  },
}));
