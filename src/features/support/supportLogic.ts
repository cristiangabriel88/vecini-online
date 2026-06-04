import type { SupportSender, SupportThread } from '@/shared/types/domain';

export const MIN_SUBJECT_LENGTH = 3;
export const MIN_BODY_LENGTH = 2;

export function isValidSubject(subject: string): boolean {
  return subject.trim().length >= MIN_SUBJECT_LENGTH;
}

export function isValidMessage(body: string): boolean {
  return body.trim().length >= MIN_BODY_LENGTH;
}

export function lastActivityAt(thread: SupportThread): string {
  return thread.messages.reduce(
    (latest, m) => (m.created_at > latest ? m.created_at : latest),
    thread.created_at,
  );
}

/** A thread is awaiting a reply from `viewer` when the last message was from the other side. */
export function awaitingReply(thread: SupportThread, viewer: SupportSender): boolean {
  if (thread.status !== 'open' || thread.messages.length === 0) return false;
  return thread.messages[thread.messages.length - 1].sender !== viewer;
}

/** Unread messages from the other side, for the given viewer. */
export function unreadFor(thread: SupportThread, viewer: SupportSender): number {
  return thread.messages.filter((m) => m.sender !== viewer && !m.read).length;
}

/** Open threads first, each ordered by most recent activity. */
export function sortThreads(threads: SupportThread[]): SupportThread[] {
  return [...threads].sort((a, b) => {
    const aOpen = a.status === 'open' ? 0 : 1;
    const bOpen = b.status === 'open' ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return lastActivityAt(b).localeCompare(lastActivityAt(a));
  });
}
