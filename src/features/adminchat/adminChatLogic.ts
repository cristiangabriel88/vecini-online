import type { PrivateThread, PrivateThreadStatus } from '@/shared/types/domain';

/** A subject needs to be short but meaningful. */
export const MIN_SUBJECT_LENGTH = 3;
/** A message needs at least a couple of characters. */
export const MIN_BODY_LENGTH = 2;

export function isValidSubject(subject: string): boolean {
  return subject.trim().length >= MIN_SUBJECT_LENGTH;
}

export function isValidMessage(body: string): boolean {
  return body.trim().length >= MIN_BODY_LENGTH;
}

/** Timestamp of the most recent message, falling back to the thread creation time. */
export function lastActivityAt(thread: PrivateThread): string {
  return thread.messages.reduce(
    (latest, m) => (m.created_at > latest ? m.created_at : latest),
    thread.created_at,
  );
}

/** A thread awaits the administrator when it is open and the last word was the resident's. */
export function awaitingReply(thread: PrivateThread): boolean {
  if (thread.status !== 'open' || thread.messages.length === 0) return false;
  return thread.messages[thread.messages.length - 1].sender === 'resident';
}

/** Whole hours the resident has been waiting for a reply (0 when not awaiting). */
export function waitingHours(thread: PrivateThread, now: Date = new Date()): number {
  if (!awaitingReply(thread)) return 0;
  const last = thread.messages[thread.messages.length - 1];
  const ms = now.getTime() - new Date(last.created_at).getTime();
  return Math.max(0, Math.floor(ms / 3_600_000));
}

/** Unread administrator messages, from the resident's perspective. */
export function unreadFromAdmin(thread: PrivateThread): number {
  return thread.messages.filter((m) => m.sender === 'admin' && !m.read).length;
}

/** Open threads first, each ordered by most recent activity. */
export function sortThreads(threads: PrivateThread[]): PrivateThread[] {
  return [...threads].sort((a, b) => {
    const aOpen = a.status === 'open' ? 0 : 1;
    const bOpen = b.status === 'open' ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return lastActivityAt(b).localeCompare(lastActivityAt(a));
  });
}

export function toggledStatus(status: PrivateThreadStatus): PrivateThreadStatus {
  return status === 'open' ? 'resolved' : 'open';
}
