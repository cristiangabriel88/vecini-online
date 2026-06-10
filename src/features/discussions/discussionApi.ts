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

/** Newest threads fetched per hydrate; older threads stay on the server. */
const THREADS_HYDRATE_LIMIT = 100;
/** Messages loaded per thread on open and per "load older" page. */
export const MESSAGES_PAGE_SIZE = 50;

type ThreadListRow = {
  id: string;
  asociatie_id: string;
  topic: string | null;
  title: string | null;
  pinned: boolean;
  created_at: string;
  message_count: Array<{ count: number }> | null;
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

function fromThreadListRow(row: ThreadListRow): DiscussionThread {
  const count = Array.isArray(row.message_count) && row.message_count.length > 0
    ? (row.message_count[0] as { count: number }).count
    : 0;
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    topic: row.topic ?? '#general',
    title: row.title ?? '',
    pinned: row.pinned,
    created_at: row.created_at,
    messages: [],
    message_count: count,
  };
}

/** Hydrate discussion thread list (without message bodies) for one asociație.
 *  Message bodies are loaded on demand via `loadThreadMessages` when a thread is
 *  opened. The demo store remains the source of truth when the backend is absent.
 *  Falls back to a schema-compatible query when the schema is behind (e.g. Pi DEV
 *  missing the author_name / title columns from migration 20260528000001). */
export async function hydrateThreads(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useDiscussionStore.getState();
  try {
    const { data, error } = await supabase
      .from('discussion_threads')
      .select(
        'id, asociatie_id, topic, title, pinned, created_at, message_count:discussion_messages(count)',
      )
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false })
      .limit(THREADS_HYDRATE_LIMIT);

    // Schema is behind (missing title column) -- retry without it.
    if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
      const fb = await supabase
        .from('discussion_threads')
        .select('id, asociatie_id, topic, pinned, created_at, message_count:discussion_messages(count)')
        .eq('asociatie_id', asociatieId)
        .order('created_at', { ascending: false })
        .limit(THREADS_HYDRATE_LIMIT);
      if (fb.error || !fb.data) {
        reportError(fb.error ?? new Error('no data'), { source: 'discussionApi.hydrate.fallback' });
        store.setFetchError('load');
        return;
      }
      store.setFetchError(null);
      store.replaceForAsociatie(
        asociatieId,
        (fb.data as Array<Record<string, unknown>>).map((row) =>
          fromThreadListRow({ ...row, title: null, message_count: null } as ThreadListRow),
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
    store.replaceForAsociatie(asociatieId, (data as ThreadListRow[]).map(fromThreadListRow));
  } catch (err) {
    reportError(err, { source: 'discussionApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Load messages for one thread (newest-first, up to MESSAGES_PAGE_SIZE).
 *  Pass `beforeCreatedAt` to fetch the next older page. Messages are stored
 *  oldest-first; older pages are prepended. Returns `hasMore: true` when a
 *  further older page may exist. No-op when offline. */
export async function loadThreadMessages(
  asociatieId: string,
  threadId: string,
  beforeCreatedAt?: string,
): Promise<{ messages: DiscussionMessage[]; hasMore: boolean }> {
  if (!isSupabaseConfigured || !asociatieId) return { messages: [], hasMore: false };
  const store = useDiscussionStore.getState();
  try {
    let q = supabase
      .from('discussion_messages')
      .select('id, thread_id, author_user_id, author_name, body, deleted_at, created_at')
      .eq('asociatie_id', asociatieId)
      .eq('thread_id', threadId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);
    if (beforeCreatedAt) q = q.lt('created_at', beforeCreatedAt);
    const { data, error } = await q;
    if (error || !data) {
      if (error) reportError(error, { source: 'discussionApi.loadMessages' });
      return { messages: [], hasMore: false };
    }
    // Reverse to oldest-first for display order.
    const messages = (data as MessageRow[]).map(fromMessageRow).reverse();
    if (beforeCreatedAt) {
      store.prependMessagesForThread(asociatieId, threadId, messages);
    } else {
      store.setMessagesForThread(asociatieId, threadId, messages);
    }
    return { messages, hasMore: data.length === MESSAGES_PAGE_SIZE };
  } catch (err) {
    reportError(err, { source: 'discussionApi.loadMessages' });
    return { messages: [], hasMore: false };
  }
}

/** Open a new thread; updates the store synchronously and mirrors to the backend.
 *  Throws if the backend write fails so callers can surface the error. */
export async function addThread(asociatieId: string, input: NewThreadInput): Promise<void> {
  const thread = newThread(input, asociatieId);
  const state = useDiscussionStore.getState();
  state.replaceForAsociatie(asociatieId, [
    thread,
    ...threadsForAsociatie(state.byAsociatie, asociatieId),
  ]);
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('discussion_threads').insert({
    id: thread.id,
    asociatie_id: thread.asociatie_id,
    topic: thread.topic,
    title: thread.title,
    pinned: thread.pinned,
    created_at: thread.created_at,
  });
  if (error) throw error;
}

/** Post a message to a thread; updates the store synchronously and mirrors to the backend.
 *  Throws if the backend write fails so callers can surface the error. */
export async function postMessage(
  asociatieId: string,
  threadId: string,
  body: string,
  author: MessageAuthor,
): Promise<void> {
  const msg = newMessage(threadId, body, author);
  const state = useDiscussionStore.getState();
  const updated = addMessageIn(state.byAsociatie, asociatieId, threadId, msg);
  state.replaceForAsociatie(asociatieId, updated[asociatieId] ?? []);
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('discussion_messages').insert({
    id: msg.id,
    asociatie_id: asociatieId,
    thread_id: msg.thread_id,
    author_user_id: msg.author_user_id,
    author_name: msg.author_name,
    body: msg.body,
    created_at: msg.created_at,
  });
  if (error) throw error;
}

/* The four mutations below apply the store change optimistically and mirror it
   in the background. supabase-js does not throw on a PostgREST/RLS failure (it
   returns { error }), so each result is checked explicitly and the pre-change
   snapshot of the asociatie's thread list is restored on failure: the UI must
   not keep showing a change the backend rejected. */

/** Snapshot of one asociatie's threads, for rollback of a failed mirror. */
function snapshotThreads(asociatieId: string): ReturnType<typeof threadsForAsociatie> {
  return threadsForAsociatie(useDiscussionStore.getState().byAsociatie, asociatieId);
}

/** Toggle a thread's pinned state; updates the store and mirrors to the backend. */
export function togglePin(asociatieId: string, threadId: string, onError?: () => void): void {
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
      const { error } = await supabase
        .from('discussion_threads')
        .update({ pinned: thread.pinned })
        .eq('id', threadId);
      if (error) throw error;
    } catch (err) {
      useDiscussionStore.getState().togglePin(asociatieId, threadId);
      reportError(err, { source: 'discussionApi.togglePin' });
      onError?.();
    }
  })();
}

/** Delete a thread and all its messages; updates the store and mirrors to the backend. */
export function deleteThread(asociatieId: string, threadId: string, onError?: () => void): void {
  const before = snapshotThreads(asociatieId);
  useDiscussionStore.getState().deleteThread(asociatieId, threadId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      const { error } = await supabase.from('discussion_threads').delete().eq('id', threadId);
      if (error) throw error;
    } catch (err) {
      useDiscussionStore.getState().replaceForAsociatie(asociatieId, before);
      reportError(err, { source: 'discussionApi.deleteThread' });
      onError?.();
    }
  })();
}

/** Update the body of a message; updates the store and mirrors to the backend. */
export function updateMessage(
  asociatieId: string,
  threadId: string,
  messageId: string,
  body: string,
  onError?: () => void,
): void {
  const before = snapshotThreads(asociatieId);
  useDiscussionStore.getState().updateMessage(asociatieId, threadId, messageId, body);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      const { error } = await supabase
        .from('discussion_messages')
        .update({ body })
        .eq('id', messageId);
      if (error) throw error;
    } catch (err) {
      useDiscussionStore.getState().replaceForAsociatie(asociatieId, before);
      reportError(err, { source: 'discussionApi.updateMessage' });
      onError?.();
    }
  })();
}

/** Soft-delete a message; updates the store and mirrors to the backend. */
export function deleteMessage(
  asociatieId: string,
  threadId: string,
  messageId: string,
  onError?: () => void,
): void {
  const before = snapshotThreads(asociatieId);
  useDiscussionStore.getState().deleteMessage(asociatieId, threadId, messageId);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      const { error } = await supabase
        .from('discussion_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);
      if (error) throw error;
    } catch (err) {
      useDiscussionStore.getState().replaceForAsociatie(asociatieId, before);
      reportError(err, { source: 'discussionApi.deleteMessage' });
      onError?.();
    }
  })();
}
