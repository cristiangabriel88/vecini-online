import type { DiscussionThread } from '@/shared/types/domain';

/** New users are rate-limited to this many messages per hour until vetted. */
export const NEW_USER_HOURLY_LIMIT = 10;

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
