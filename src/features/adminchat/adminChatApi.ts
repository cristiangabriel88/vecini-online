import type { PrivateMessage, PrivateSender, PrivateThread } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { counterpartOf } from './adminChatLogic';
import { type NewThreadInput, useAdminChatStore } from './adminChatStore';

/* Dual-mode private-messaging repository (F04). The zustand store is the
   synchronous source of truth the inbox reads; these functions apply each change
   there and, when a backend is configured, mirror it to the `private_threads` /
   `private_messages` tables (best-effort, never throwing to the caller, mirroring
   the apartments + audit stores' strategy). Unlike the apartments registry these
   are private conversations, so nothing is written to the audit log: a thread's
   subject and body are personal data and must not be recorded there. */

/** Map a thread row (with nested messages) onto the app model. */
function fromRow(row: Record<string, unknown>): PrivateThread {
  const messages = ((row.messages as PrivateMessage[] | null) ?? [])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  return {
    id: row.id as string,
    asociatie_id: row.asociatie_id as string,
    resident_user_id: row.resident_user_id as string,
    resident_name: (row.resident_name as string) ?? '',
    apartment_label: (row.apartment_label as string | null) ?? undefined,
    subject: (row.subject as string) ?? '',
    status: (row.status as PrivateThread['status']) ?? 'open',
    created_at: row.created_at as string,
    messages,
  };
}

/** The DB columns for a message row. */
function messageRow(asociatieId: string, m: PrivateMessage): Record<string, unknown> {
  return {
    id: m.id,
    asociatie_id: asociatieId,
    thread_id: m.thread_id,
    sender: m.sender,
    sender_name: m.sender_name,
    body: m.body,
    read: m.read,
    created_at: m.created_at,
  };
}

/** Hydrate the store for an asociație from the backend, when configured. The
 *  local (seeded/persisted) list stays authoritative if the read fails. RLS
 *  returns only the rows the caller may see (their own threads, or all of them
 *  for an administrator). */
export async function hydrateThreads(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  try {
    const { data, error } = await supabase
      .from('private_threads')
      .select('*, messages:private_messages(*)')
      .eq('asociatie_id', asociatieId);
    if (error || !data) return;
    useAdminChatStore
      .getState()
      .replaceAll(asociatieId, (data as Record<string, unknown>[]).map(fromRow));
  } catch {
    /* best-effort: the local list remains the source of truth for the UI */
  }
}

/** Open a new thread authored by `sender`; returns the created thread.
 *  `onError` is called (on the next microtask) when the backend write fails,
 *  so the page can surface a toast without coupling the API to react-hot-toast. */
export function startThread(
  asociatieId: string,
  sender: PrivateSender,
  input: NewThreadInput,
  onError?: () => void,
): PrivateThread {
  const thread = useAdminChatStore.getState().startThread(asociatieId, sender, input);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('private_threads').insert({
          id: thread.id,
          asociatie_id: thread.asociatie_id,
          resident_user_id: thread.resident_user_id,
          resident_name: thread.resident_name,
          apartment_label: thread.apartment_label ?? null,
          subject: thread.subject,
          status: thread.status,
          created_at: thread.created_at,
        });
        await supabase.from('private_messages').insert(messageRow(asociatieId, thread.messages[0]));
      } catch {
        onError?.();
      }
    })();
  }
  return thread;
}

/** Append a reply authored by `sender`, and reopen the thread.
 *  `onError` is called when the backend write fails. */
export function reply(
  asociatieId: string,
  threadId: string,
  sender: PrivateSender,
  senderName: string,
  body: string,
  onError?: () => void,
): void {
  useAdminChatStore.getState().reply(asociatieId, threadId, sender, senderName, body);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        const thread = useAdminChatStore
          .getState()
          .forAsociatie(asociatieId)
          .find((t) => t.id === threadId);
        const message = thread?.messages[thread.messages.length - 1];
        if (message) await supabase.from('private_messages').insert(messageRow(asociatieId, message));
        await supabase.from('private_threads').update({ status: 'open' }).eq('id', threadId);
      } catch {
        onError?.();
      }
    })();
  }
}

/** Mark the other party's messages read, from `viewer`'s perspective.
 *  Always best-effort: a missed read-mark is a minor UX glitch, not data loss. */
export function markRead(asociatieId: string, threadId: string, viewer: PrivateSender): void {
  useAdminChatStore.getState().markRead(asociatieId, threadId, viewer);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase
          .from('private_messages')
          .update({ read: true })
          .eq('thread_id', threadId)
          .eq('sender', counterpartOf(viewer));
      } catch {
        /* read-mark failure is a minor UX glitch, not data loss — stay silent */
      }
    })();
  }
}

/** Toggle a thread between open and resolved.
 *  `onError` is called when the backend write fails. */
export function toggleStatus(asociatieId: string, threadId: string, onError?: () => void): void {
  useAdminChatStore.getState().toggleStatus(asociatieId, threadId);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        const thread = useAdminChatStore
          .getState()
          .forAsociatie(asociatieId)
          .find((t) => t.id === threadId);
        if (thread) {
          await supabase.from('private_threads').update({ status: thread.status }).eq('id', threadId);
        }
      } catch {
        onError?.();
      }
    })();
  }
}
