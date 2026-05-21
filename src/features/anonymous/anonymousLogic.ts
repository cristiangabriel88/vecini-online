import type { AnonymousMessage, AnonymousStatus } from '@/shared/types/domain';

/** Minimum body length for a useful anonymous message. */
export const MIN_BODY_LENGTH = 10;

/** A message needs a non-trivial body. */
export function isValidMessage(body: string): boolean {
  return body.trim().length >= MIN_BODY_LENGTH;
}

/** Toggle between open ("nou") and resolved. */
export function toggledStatus(status: AnonymousStatus): AnonymousStatus {
  return status === 'nou' ? 'rezolvat' : 'nou';
}

/** Messages newest-first, with open ones always above resolved ones. */
export function orderedMessages(messages: AnonymousMessage[]): AnonymousMessage[] {
  return [...messages].sort((a, b) => {
    const aOpen = a.status === 'nou' ? 0 : 1;
    const bOpen = b.status === 'nou' ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/** How many messages are still awaiting a comitet response. */
export function openCount(messages: AnonymousMessage[]): number {
  return messages.filter((m) => m.status === 'nou').length;
}
