import type { DiscussionMessage, DiscussionThread } from '@/shared/types/domain';
import type { Role } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_DISCUSSIONS } from '@/shared/demo/demoData';
import { genId } from '@/shared/lib/id';

/** New users are rate-limited to this many messages per hour until vetted. */
export const NEW_USER_HOURLY_LIMIT = 10;

/** Sliding window for the per-author post rate limit (1 hour). */
export const POST_RATE_WINDOW_MS = 60 * 60_000;

/**
 * Drop timestamps that have aged out of the sliding window so the count stays
 * accurate without accumulating unboundedly.
 */
export function prunePostTimestamps(timestamps: number[], now: number): number[] {
  return timestamps.filter((t) => now - t < POST_RATE_WINDOW_MS);
}

/**
 * Whether a role is considered vetted (trusted by the committee) and therefore
 * exempt from the hourly post rate limit. Residents (proprietar / chirias) and
 * unauthenticated users are unvetted.
 */
export function isVettedRole(role: Role | null): boolean {
  return role !== null && role !== 'proprietar' && role !== 'locatar';
}

/** A message must have non-blank text within a sane length. */
export function isValidMessage(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.length > 0 && trimmed.length <= 2000;
}

/** A thread needs a title. */
export function isValidThread(title: string): boolean {
  return title.trim().length > 0;
}

/** Timestamp of the latest message, or the thread's creation if it has none. */
export function lastActivityAt(thread: DiscussionThread): string {
  if (thread.messages.length === 0) return thread.created_at;
  return thread.messages.reduce(
    (latest, m) => (m.created_at > latest ? m.created_at : latest),
    thread.messages[0].created_at,
  );
}

/** Pinned threads float to the top; otherwise most-recently-active first. */
export function sortThreads(threads: DiscussionThread[]): DiscussionThread[] {
  return [...threads].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(lastActivityAt(b)).getTime() - new Date(lastActivityAt(a)).getTime();
  });
}

/** Whether a (possibly new) user may post given how many messages they sent this hour. */
export function canPost(recentMessageCount: number, vetted: boolean): boolean {
  if (vetted) return true;
  return recentMessageCount < NEW_USER_HOURLY_LIMIT;
}

/**
 * Discuții / forum (F02) scoped per asociație (T48).
 *
 * Pure model so the demo store stays the offline source of truth and the loop
 * (a resident starts a thread, neighbours reply) works fully offline. Each
 * asociație owns its own threads, keyed by asociație id, so a thread and the
 * messages in it belong to the active tenant and never leak across asociații.
 * With a real backend the threads are hydrated from / written back to
 * `discussion_threads` + `discussion_messages` under RLS (live activation is
 * T57); this module stays the single source of the shape and the per-asociație
 * partitioning.
 */

/** All asociații's discussion threads, keyed by asociație id. */
export type ThreadsByAsociatie = Record<string, DiscussionThread[]>;

/**
 * Stable empty list returned for an unknown or null asociație so React selectors
 * keep a constant reference (a fresh `[]` per call would force needless
 * re-renders). Never mutate it; the helpers always build a new array.
 */
const EMPTY_THREADS = Object.freeze([] as DiscussionThread[]) as DiscussionThread[];

/**
 * Seed used the first time the store initialises (before any persisted state):
 * the demo asociație gets the seeded threads so the offline app is populated.
 * Other asociații start empty until a resident opens a thread.
 */
export function seedThreads(): ThreadsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_DISCUSSIONS] };
}

/**
 * Migrate persisted state from any earlier version to the current shape.
 * Preserves non-demo asociații so a locally-created asociație keeps its
 * discussion threads, but always reseeds the demo asociație from
 * `DEMO_DISCUSSIONS` so stale demo content is refreshed on version bump.
 */
export function migrateThreadsState(persisted: unknown): ThreadsByAsociatie {
  const state = persisted as { byAsociatie?: unknown } | null;
  const old = state?.byAsociatie;
  if (old && typeof old === 'object') {
    return { ...(old as ThreadsByAsociatie), [DEMO_ASOCIATIE.id]: [...DEMO_DISCUSSIONS] };
  }
  return seedThreads();
}

/**
 * The threads for one asociație. Returns the stored list (a stable reference) or
 * a shared frozen empty list when the asociație has none yet or none is active.
 */
export function threadsForAsociatie(
  byAsociatie: ThreadsByAsociatie,
  asociatieId: string | null,
): DiscussionThread[] {
  if (!asociatieId) return EMPTY_THREADS;
  return byAsociatie[asociatieId] ?? EMPTY_THREADS;
}

/**
 * The threads across several asociații (a resident's memberships), unioned in
 * the order the ids are given and deduping repeated ids. Used by the GDPR export
 * (T77) so a multi-asociație resident's forum messages (art. 15) span every
 * asociație they belong to, not just the active one. Returns a fresh array; the
 * caller filters the messages to the subject's own.
 */
export function threadsForAsociatii(
  byAsociatie: ThreadsByAsociatie,
  asociatieIds: string[],
): DiscussionThread[] {
  const seen = new Set<string>();
  const out: DiscussionThread[] = [];
  for (const id of asociatieIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const list = byAsociatie[id];
    if (list) out.push(...list);
  }
  return out;
}

/** The fields a resident supplies to open a thread; the rest is derived. */
export interface NewThreadInput {
  title: string;
  topic: string;
}

/** Identity of the author posting a thread or a message. */
export interface MessageAuthor {
  id: string;
  name: string;
}

/** Build an empty thread owned by `asociatieId`, defaulting a blank topic. */
export function newThread(
  input: NewThreadInput,
  asociatieId: string,
  now: Date = new Date(),
): DiscussionThread {
  return {
    id: genId(),
    asociatie_id: asociatieId,
    topic: input.topic.trim() || '#general',
    title: input.title.trim(),
    pinned: false,
    created_at: now.toISOString(),
    messages: [],
  };
}

/** Build a message authored by `author` in the given thread. */
export function newMessage(
  threadId: string,
  body: string,
  author: MessageAuthor,
  now: Date = new Date(),
): DiscussionMessage {
  return {
    id: genId(),
    thread_id: threadId,
    author_user_id: author.id,
    author_name: author.name,
    body: body.trim(),
    created_at: now.toISOString(),
  };
}

/**
 * Prepend a thread to one asociație's list (newest first), returning a new
 * `byAsociatie` map without mutating the input.
 */
export function addThreadIn(
  byAsociatie: ThreadsByAsociatie,
  asociatieId: string,
  thread: DiscussionThread,
): ThreadsByAsociatie {
  return {
    ...byAsociatie,
    [asociatieId]: [thread, ...(byAsociatie[asociatieId] ?? [])],
  };
}

/**
 * Apply a pure transform to one asociație's thread list, leaving every other
 * asociație untouched. A no-op (returns the same map) if the asociație has no
 * list yet, so a stray mutation can never seed a phantom asociație.
 */
function mapThreads(
  byAsociatie: ThreadsByAsociatie,
  asociatieId: string,
  fn: (threads: DiscussionThread[]) => DiscussionThread[],
): ThreadsByAsociatie {
  const list = byAsociatie[asociatieId];
  if (!list) return byAsociatie;
  return { ...byAsociatie, [asociatieId]: fn(list) };
}

/** Append a message to a thread within one asociație, purely. */
export function addMessageIn(
  byAsociatie: ThreadsByAsociatie,
  asociatieId: string,
  threadId: string,
  message: DiscussionMessage,
): ThreadsByAsociatie {
  return mapThreads(byAsociatie, asociatieId, (threads) =>
    threads.map((th) =>
      th.id === threadId ? { ...th, messages: [...th.messages, message] } : th,
    ),
  );
}

/** Toggle a thread's pinned flag within one asociație, purely. */
export function togglePinIn(
  byAsociatie: ThreadsByAsociatie,
  asociatieId: string,
  threadId: string,
): ThreadsByAsociatie {
  return mapThreads(byAsociatie, asociatieId, (threads) =>
    threads.map((th) => (th.id === threadId ? { ...th, pinned: !th.pinned } : th)),
  );
}

/** Remove a message from a thread within one asociație, purely. */
export function deleteMessageIn(
  byAsociatie: ThreadsByAsociatie,
  asociatieId: string,
  threadId: string,
  messageId: string,
): ThreadsByAsociatie {
  return mapThreads(byAsociatie, asociatieId, (threads) =>
    threads.map((th) =>
      th.id === threadId
        ? { ...th, messages: th.messages.filter((m) => m.id !== messageId) }
        : th,
    ),
  );
}
