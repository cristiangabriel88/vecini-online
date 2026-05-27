import type { AnonymousMessage, AnonymousStatus } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { useAnonymousStore } from './anonymousStore';

/* Dual-mode anonymous-message repository (F05). The zustand store is the
   synchronous source of truth the page reads; these functions apply each change
   there and, when a backend is configured, mirror it to `anonymous_messages`.

   RLS split (T137):
   - Privileged callers (admin/presedinte/comitet) read via the SECURITY DEFINER
     function `anonymous_messages_for_comitet` which never projects sender_user_id.
   - Residents read their own rows via the owner-scoped SELECT policy.
   - Status triage goes through `set_anonymous_message_status` RPC (comitet only).
   - Residents submit rows directly to the table (owner INSERT via is_member). */

type ComitetRow = {
  id: string;
  asociatie_id: string;
  body: string;
  status: string;
  created_at: string;
};

function fromComitetRow(row: ComitetRow): AnonymousMessage {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    // sender_user_id intentionally absent: the comitet function never returns it
    body: row.body,
    status: row.status as AnonymousStatus,
    created_at: row.created_at,
  };
}

/** Hydrate the store for an asociație from the backend, when configured.
 *  Privileged callers (comitet/admin/presedinte) receive rows without
 *  sender_user_id via the privacy-preserving function; residents receive only
 *  their own rows via the owner-scoped SELECT policy. No-op when Supabase is
 *  not configured — the demo/offline store is the source of truth. */
export async function hydrateAnonymousMessages(
  asociatieId: string,
  isPrivileged: boolean,
  userId?: string,
): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  try {
    if (isPrivileged) {
      const { data, error } = await supabase.rpc('anonymous_messages_for_comitet', {
        p_asociatie_id: asociatieId,
      });
      if (error || !data) return;
      useAnonymousStore.getState().replaceAll((data as ComitetRow[]).map(fromComitetRow));
    } else {
      if (!userId) return;
      const { data, error } = await supabase
        .from('anonymous_messages')
        .select('id, asociatie_id, sender_user_id, body, status, created_at')
        .eq('asociatie_id', asociatieId)
        .eq('sender_user_id', userId)
        .order('created_at', { ascending: false });
      if (error || !data) return;
      useAnonymousStore.getState().replaceAll(data as AnonymousMessage[]);
    }
  } catch {
    /* best-effort: the local list remains the source of truth for the UI */
  }
}

/** A resident submits an anonymous message. Updates the store synchronously;
 *  mirrors to the `anonymous_messages` table when a backend is configured.
 *  The offline demo path should call `useAnonymousStore.getState().add(body)`
 *  directly instead. */
export function submitAnonymousMessage(
  asociatieId: string,
  body: string,
  userId: string,
): void {
  const trimmed = body.trim();
  const msg: AnonymousMessage = {
    id: `an-${Date.now()}`,
    asociatie_id: asociatieId,
    sender_user_id: userId,
    body: trimmed,
    status: 'nou',
    created_at: new Date().toISOString(),
  };
  const store = useAnonymousStore.getState();
  store.replaceAll([msg, ...store.messages]);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('anonymous_messages').insert({
          asociatie_id: asociatieId,
          sender_user_id: userId,
          body: trimmed,
          status: 'nou',
        });
      } catch {
        /* best-effort: the local message remains in the store */
      }
    })();
  }
}

/** A comitet member triages an anonymous message. Updates the store
 *  synchronously and calls the privacy-preserving status-only RPC when a
 *  backend is configured. The offline demo path should call
 *  `useAnonymousStore.getState().toggleStatus(id)` directly instead. */
export function setAnonymousMessageStatus(id: string, status: AnonymousStatus): void {
  useAnonymousStore.getState().setStatus(id, status);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.rpc('set_anonymous_message_status', {
          p_id: id,
          p_status: status,
        });
      } catch {
        /* best-effort: the local status update remains in the store */
      }
    })();
  }
}
