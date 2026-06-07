import type { PrivateSender, PrivateThread, PrivateThreadStatus } from '@/shared/types/domain';
import { PRIVATE_SUBJECT_MAX, PRIVATE_BODY_MAX } from '@/shared/lib/contentGuard';

export { PRIVATE_SUBJECT_MAX, PRIVATE_BODY_MAX };

/** A subject needs to be short but meaningful. */
export const MIN_SUBJECT_LENGTH = 3;
/** A message needs at least a couple of characters. */
export const MIN_BODY_LENGTH = 2;

export function isValidSubject(subject: string): boolean {
  const t = subject.trim();
  return t.length >= MIN_SUBJECT_LENGTH && t.length <= PRIVATE_SUBJECT_MAX;
}

export function isValidMessage(body: string): boolean {
  const t = body.trim();
  return t.length >= MIN_BODY_LENGTH && t.length <= PRIVATE_BODY_MAX;
}

/** The other party to a viewer: the administrator reads the resident's messages
 *  and vice versa. */
export function counterpartOf(viewer: PrivateSender): PrivateSender {
  return viewer === 'admin' ? 'resident' : 'admin';
}

/** Timestamp of the most recent message, falling back to the thread creation time. */
export function lastActivityAt(thread: PrivateThread): string {
  return thread.messages.reduce(
    (latest, m) => (m.created_at > latest ? m.created_at : latest),
    thread.created_at,
  );
}

/** A thread awaits the administrator when it is open and the last word was the
 *  resident's — the signal that drives the admin inbox's "needs reply" hint. */
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

/** Unread messages from the other party, for the given viewer: the administrator
 *  counts unread resident messages, the resident counts unread admin messages. */
export function unreadFor(thread: PrivateThread, viewer: PrivateSender): number {
  const from = counterpartOf(viewer);
  return thread.messages.filter((m) => m.sender === from && !m.read).length;
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

/** Label for the other party in an inbox row: the resident sees "Administrator"
 *  (passed in, already localized); the administrator sees the resident's name
 *  with their apartment. */
export function threadParticipantLabel(
  thread: PrivateThread,
  viewer: PrivateSender,
  adminLabel: string,
): string {
  if (viewer === 'resident') return adminLabel;
  return thread.apartment_label
    ? `${thread.resident_name} · ${thread.apartment_label}`
    : thread.resident_name;
}

export function toggledStatus(status: PrivateThreadStatus): PrivateThreadStatus {
  return status === 'open' ? 'resolved' : 'open';
}

/** Flatten the private threads across the given asociații (deduped). Used by the
 *  GDPR data-subject export to gather every thread the subject is a party to. */
export function privateThreadsForAsociatii(
  byAsociatie: Record<string, PrivateThread[]>,
  asociatieIds: string[],
): PrivateThread[] {
  const seen = new Set<string>();
  const out: PrivateThread[] = [];
  for (const id of asociatieIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    for (const th of byAsociatie[id] ?? []) out.push(th);
  }
  return out;
}
