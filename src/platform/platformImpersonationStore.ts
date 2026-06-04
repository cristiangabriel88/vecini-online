import { create } from 'zustand';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_PLATFORM_ADMIN } from './demoPlatform';
import { usePlatformAuditStore } from './platformAuditStore';
import { usePlatformAuthStore } from './platformAuthStore';

/**
 * Platform superadmin impersonation session (T98).
 *
 * A read-only diagnostic context: the operator enters a tenant's "view" to
 * investigate a reported problem. Every start and end is written to the
 * tamper-evident audit trail so impersonation is never silent.
 *
 * In demo mode the audit entry is appended to the in-memory platform audit
 * store directly. In live mode the Netlify `impersonate` function validates
 * the request server-side and inserts the audit row via the service-role key
 * (the superadmin is not a member of the target tenant so normal RLS cannot be
 * used). No tenant write actions are allowed while a session is active; the
 * banner makes the mode unmistakably clear to the operator.
 */
export interface ImpersonationSession {
  asociatie_id: string;
  asociatie_name: string;
  startedAt: string;
  actor_id: string;
  actor_name: string;
}

interface PlatformImpersonationState {
  session: ImpersonationSession | null;
  loading: boolean;
  error: string | null;
  startSession: (target: { asociatie_id: string; asociatie_name: string }) => Promise<void>;
  endSession: () => Promise<void>;
  clearError: () => void;
}

function resolveDemo(): { actorId: string; actorName: string } {
  return { actorId: DEMO_PLATFORM_ADMIN.id, actorName: DEMO_PLATFORM_ADMIN.name };
}

function recordDemoAudit(
  asociatieId: string,
  asociatieName: string,
  actor: { actorId: string; actorName: string },
  action: 'start' | 'end',
): void {
  usePlatformAuditStore.getState().recordEntry(asociatieId, {
    asociatie_id: asociatieId,
    actor_user_id: actor.actorId,
    actor_name: actor.actorName,
    action: action === 'start' ? 'impersonation.started' : 'impersonation.ended',
    entity: 'impersonation',
    entity_label: asociatieName,
  });
}

async function callImpersonateFunction(
  action: 'start' | 'end',
  asociatieId: string,
  token: string,
): Promise<{ ok: boolean; asociatie_name?: string; actor_id?: string; actor_name?: string; error?: string }> {
  try {
    const resp = await fetch('/.netlify/functions/impersonate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, asociatie_id: asociatieId }),
    });
    const data = (await resp.json()) as Record<string, unknown>;
    if (!resp.ok) return { ok: false, error: String(data.error ?? 'failed') };
    return {
      ok: true,
      asociatie_name: data.asociatie_name as string | undefined,
      actor_id: data.actor_id as string | undefined,
      actor_name: data.actor_name as string | undefined,
    };
  } catch (err) {
    reportError(err, { source: 'platformImpersonationStore.callImpersonateFunction' });
    return { ok: false, error: 'failed' };
  }
}

export const usePlatformImpersonationStore = create<PlatformImpersonationState>()((set, get) => ({
  session: null,
  loading: false,
  error: null,

  startSession: async (target) => {
    set({ loading: true, error: null });
    const demo = usePlatformAuthStore.getState().demo;
    const isDemo = demo || !isSupabaseConfigured;

    if (isDemo) {
      const actor = resolveDemo();
      recordDemoAudit(target.asociatie_id, target.asociatie_name, actor, 'start');
      set({
        session: {
          asociatie_id: target.asociatie_id,
          asociatie_name: target.asociatie_name,
          startedAt: new Date().toISOString(),
          actor_id: actor.actorId,
          actor_name: actor.actorName,
        },
        loading: false,
      });
      return;
    }

    const token = useAuthStore.getState().session?.access_token ?? '';
    if (!token) {
      set({ loading: false, error: 'unauthorized' });
      return;
    }
    const result = await callImpersonateFunction('start', target.asociatie_id, token);
    if (!result.ok) {
      set({ loading: false, error: result.error ?? 'failed' });
      return;
    }
    set({
      session: {
        asociatie_id: target.asociatie_id,
        asociatie_name: result.asociatie_name ?? target.asociatie_name,
        startedAt: new Date().toISOString(),
        actor_id: result.actor_id ?? '',
        actor_name: result.actor_name ?? '',
      },
      loading: false,
    });
  },

  endSession: async () => {
    const current = get().session;
    if (!current) return;
    const demo = usePlatformAuthStore.getState().demo;
    const isDemo = demo || !isSupabaseConfigured;

    if (isDemo) {
      const actor = resolveDemo();
      recordDemoAudit(current.asociatie_id, current.asociatie_name, actor, 'end');
      set({ session: null });
      return;
    }

    const token = useAuthStore.getState().session?.access_token ?? '';
    if (token) {
      await callImpersonateFunction('end', current.asociatie_id, token);
    }
    set({ session: null });
  },

  clearError: () => set({ error: null }),
}));
