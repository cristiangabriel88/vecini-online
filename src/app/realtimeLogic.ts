import type { Announcement, Ticket, PrivateThread, PrivateMessage } from '@/shared/types/domain';

/** Prepend an announcement if not already present (dedup by id); replace on UPDATE. */
export function applyAnnouncementChange(
  current: Announcement[],
  event: 'INSERT' | 'UPDATE',
  item: Announcement,
): Announcement[] {
  if (event === 'INSERT') {
    return current.some((a) => a.id === item.id) ? current : [item, ...current];
  }
  return current.map((a) => (a.id === item.id ? item : a));
}

/** Remove an announcement by id. */
export function applyAnnouncementDelete(current: Announcement[], id: string): Announcement[] {
  return current.filter((a) => a.id !== id);
}

/** Prepend a ticket if not already present (dedup by id); replace on UPDATE. */
export function applyTicketChange(
  current: Ticket[],
  event: 'INSERT' | 'UPDATE',
  item: Ticket,
): Ticket[] {
  if (event === 'INSERT') {
    return current.some((t) => t.id === item.id) ? current : [item, ...current];
  }
  return current.map((t) => (t.id === item.id ? item : t));
}

/** Remove a ticket by id. */
export function applyTicketDelete(current: Ticket[], id: string): Ticket[] {
  return current.filter((t) => t.id !== id);
}

/** Prepend a thread if not already present (dedup by id). */
export function applyThreadInsert(current: PrivateThread[], thread: PrivateThread): PrivateThread[] {
  return current.some((t) => t.id === thread.id) ? current : [thread, ...current];
}

/** Patch a thread's status when the backend signals an open/resolved change.
 *  Preserves the local messages array, which the DB does not carry on the thread row. */
export function applyThreadStatusUpdate(
  current: PrivateThread[],
  id: string,
  status: PrivateThread['status'],
): PrivateThread[] {
  return current.map((t) => (t.id === id ? { ...t, status } : t));
}

/** Remove a thread by id. */
export function applyThreadDelete(current: PrivateThread[], id: string): PrivateThread[] {
  return current.filter((t) => t.id !== id);
}

/** Append a message to its parent thread. No-op when the thread is absent or the
 *  message is already present (dedup by id guards against optimistic-write echoes). */
export function applyMessageInsert(
  threads: PrivateThread[],
  message: PrivateMessage,
): PrivateThread[] {
  return threads.map((t) => {
    if (t.id !== message.thread_id) return t;
    if (t.messages.some((m) => m.id === message.id)) return t;
    return { ...t, messages: [...t.messages, message] };
  });
}
