import type { DiscussionMessage, DiscussionThread } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import {
  type MessageAuthor,
  type NewThreadInput,
  addMessageIn,
  newMessage,
  newThread,
  threadsForAsociatie,
} from './discussionLogic';
import { useDiscussionStore } from './discussionStore';

/* Dual-mode discussion repository (F02, T57). The zustand store is the
   synchronous source of truth; these functions apply each change there and,
   when a backend is configured, mirror it to `discussion_threads` /
   `discussion_messages` under RLS (members read; owner manages own messages
   per apply_owner_rls + is_member guard).

   The DB carries `title` on threads (migration 20260528000001) and
   `author_name` on messages; both were added to support direct client reads
   without a join to the self-read-only users table. */

type ThreadRow = {
  id: string;
  asociatie_id: string;
  topic: string | null;
  title: string | null;
  pinned: boolean;
  created_at: string;
  messages: MessageRow[] | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  author_user_id: string | null;
  author_name: string | null;
  body: string | null;
  deleted_at: string | null;
  created_at: string;
};

function fromMessageRow(row: MessageRow): DiscussionMessage {
  return {
    id: row.id,
    thread_id: row.thread_id,
    author_user_id: row.author_user_id ?? '',
    author_name: row.author_name ?? '',
    body: row.body ?? '',
    created_at: row.created_at,
  };
}

function fromThreadRow(row: ThreadRow): DiscussionThread {
  const messages = (row.messages ?? [])
    .filter((m) => !m.deleted_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(fromMessageRow);
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    topic: row.topic ?? '#general',
    title: row.title ?? '',
    pinned: row.pinned,
    created_at: row.created_at,
    messages,
  };
}

/** Hydrate discussion threads (with messages) for one asociație from the backend.
 *  The demo store remains the source of truth if the read fails or backend is absent.
 *  Falls back to a schema-compatible query when the schema is behind (e.g. Pi DEV
 *  missing the author_name / title columns from migration 20260528000001). */
export async function hydrateThreads(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useDiscussionStore.getState();
  try {
    const { data, error } = await supabase
      .from('discussion_threads')
      .select(
        'id, asociatie_id, topic, title, pinned, created_at, messages:discussion_messages(id, thread_id, author_user_id, author_name, body, deleted_at, created_at)',
      )
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });

    // Schema is behind (missing author_name / title columns) -- retry without them.
    if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
      const fb = await supabase
        .from('discussion_threads')
        .select(
          'id, asociatie_id, topic, pinned, created_at, messages:discussion_messages(id, thread_id, author_user_id, body, deleted_at, created_at)',
        )
        .eq('asociatie_id', asociatieId)
        .order('created_at', { ascending: false });
      if (fb.error || !fb.data) {
        reportError(fb.error ?? new Error('no data'), { source: 'discussionApi.hydrate.fallback' });
        store.setFetchError('load');
        return;
      }
      store.setFetchError(null);
      store.replaceForAsociatie(
        asociatieId,
        (fb.data as Array<Record<string, unknown>>).map((row) =>
          fromThreadRow({ ...row, title: null, messages: ((row.messages as MessageRow[] | null) ?? []).map((m) => ({ ...m, author_name: null })) } as ThreadRow),
        ),
      );
      return;
    }

    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'discussionApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as ThreadRow[]).map(fromThreadRow));
  } catch (err) {
    reportError(err, { source: 'discussionApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Open a new thread; updates the store synchronously and mirrors to the backend. */
export function addThread(asociatieId: string, input: NewThreadInput): void {
  const thread = newThread(input, asociatieId);
  const state = useDiscussionStore.getState();
  state.replaceForAsociatie(asociatieId, [
    thread,
    ...threadsForAsociatie(state.byAsociatie, asociatieId),
  ]);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('discussion_threads').insert({
          id: thread.id,
          asociatie_id: thread.asociatie_id,
          topic: thread.topic,
          title: thread.title,
          pinned: thread.pinned,
          created_at: thread.created_at,
        });
      } catch (err) {
        reportError(err, { source: 'discussionApi.addThread' });
      }
    })();
  }
}

/** Post a message to a thread; updates the store synchronously and mirrors to the backend. */
export function postMessage(
  asociatieId: string,
  threadId: string,
  body: string,
  author: MessageAuthor,
): void {
  const msg = newMessage(threadId, body, author);
  const state = useDiscussionStore.getState();
  const updated = addMessageIn(state.byAsociatie, asociatieId, threadId, msg);
  state.replaceForAsociatie(asociatieId, updated[asociatieId] ?? []);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('discussion_messages').insert({
          id: msg.id,
          asociatie_id: asociatieId,
          thread_id: msg.thread_id,
          author_user_id: msg.author_user_id,
          author_name: msg.author_name,
          body: msg.body,
          created_at: msg.created_at,
        });
      } catch (err) {
        reportError(err, { source: 'discussionApi.postMessage' });
      }
    })();
  }
}

/** Toggle a thread's pinned state; updates the store and mirrors to the backend. */
export function togglePin(asociatieId: string, threadId: string): void {
  useDiscussionStore.getState().togglePin(asociatieId, threadId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      const threads = threadsForAsociatie(
        useDiscussionStore.getState().byAsociatie,
        asociatieId,
      );
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      await supabase
        .from('discussion_threads')
        .update({ pinned: thread.pinned })
        .eq('id', threadId);
    } catch (err) {
      reportError(err, { source: 'discussionApi.togglePin' });
    }
  })();
}

/** Delete a thread and all its messages; updates the store and mirrors to the backend. */
export function deleteThread(asociatieId: string, threadId: string): void {
  useDiscussionStore.getState().deleteThread(asociatieId, threadId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('discussion_threads').delete().eq('id', threadId);
    } catch (err) {
      reportError(err, { source: 'discussionApi.deleteThread' });
    }
  })();
}

/** Update the body of a message; updates the store and mirrors to the backend. */
export function updateMessage(
  asociatieId: string,
  threadId: string,
  messageId: string,
  body: string,
): void {
  useDiscussionStore.getState().updateMessage(asociatieId, threadId, messageId, body);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('discussion_messages').update({ body }).eq('id', messageId);
    } catch (err) {
      reportError(err, { source: 'discussionApi.updateMessage' });
    }
  })();
}

/** Soft-delete a message; updates the store and mirrors to the backend. */
export function deleteMessage(
  asociatieId: string,
  threadId: string,
  messageId: string,
): void {
  useDiscussionStore.getState().deleteMessage(asociatieId, threadId, messageId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('discussion_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (err) {
      reportError(err, { source: 'discussionApi.deleteMessage' });
    }
  })();
}
