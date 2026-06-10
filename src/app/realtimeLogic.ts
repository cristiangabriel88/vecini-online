import type {
  Announcement,
  Ticket,
  PrivateThread,
  PrivateMessage,
  Petition,
  DiscussionThread,
  DiscussionMessage,
} from '@/shared/types/domain';
import type { AppNotification } from '@/features/notifications/notificationLogic';

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

/** Prepend a discussion thread if not already present (dedup by id guards
 *  against optimistic-write echoes). The DB thread row carries no messages;
 *  they arrive separately through discussion_messages inserts. */
export function applyDiscussionThreadInsert(
  current: DiscussionThread[],
  thread: DiscussionThread,
): DiscussionThread[] {
  return current.some((t) => t.id === thread.id) ? current : [thread, ...current];
}

/** Patch a discussion thread's mutable fields (topic / title / pinned),
 *  preserving the locally-assembled messages array the row does not carry. */
export function applyDiscussionThreadUpdate(
  current: DiscussionThread[],
  id: string,
  patch: Pick<DiscussionThread, 'topic' | 'title' | 'pinned'>,
): DiscussionThread[] {
  return current.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

/** Remove a discussion thread by id. */
export function applyDiscussionThreadDelete(
  current: DiscussionThread[],
  id: string,
): DiscussionThread[] {
  return current.filter((t) => t.id !== id);
}

/** Apply a discussion message INSERT or UPDATE to its parent thread.
 *  A row with deleted_at set is removed (soft-delete propagates as an UPDATE);
 *  an existing id is replaced (edits); otherwise the message is appended.
 *  No-op when the parent thread is not loaded locally. */
export function applyDiscussionMessageChange(
  threads: DiscussionThread[],
  message: DiscussionMessage,
  deletedAt: string | null,
): DiscussionThread[] {
  return threads.map((t) => {
    if (t.id !== message.thread_id) return t;
    if (deletedAt) {
      return { ...t, messages: t.messages.filter((m) => m.id !== message.id) };
    }
    if (t.messages.some((m) => m.id === message.id)) {
      return { ...t, messages: t.messages.map((m) => (m.id === message.id ? message : m)) };
    }
    return { ...t, messages: [...t.messages, message] };
  });
}

/** Prepend a notification if not already present (dedup by id). */
export function applyNotificationInsert(
  current: AppNotification[],
  item: AppNotification,
): AppNotification[] {
  return current.some((n) => n.id === item.id) ? current : [item, ...current];
}

/** Increment the signature count on the matching petition; flip status to
 *  'inaintata' when the forwarding threshold is reached. No-op if absent. */
export function applyPetitionSignatureInsert(
  petitions: Petition[],
  petitionId: string,
): Petition[] {
  return petitions.map((p) => {
    if (p.id !== petitionId) return p;
    const updated = { ...p, signatures: p.signatures + 1 };
    const threshold = Math.ceil((updated.threshold_percent / 100) * updated.total_apartments);
    return { ...updated, status: updated.signatures >= threshold ? 'inaintata' : updated.status };
  });
}

/** Increment running poll counts for each voted option id (one unit each). */
export function applyVoteInsert(
  counts: Record<string, number>,
  optionIds: string[],
): Record<string, number> {
  const result = { ...counts };
  for (const id of optionIds) {
    result[id] = (result[id] ?? 0) + 1;
  }
  return result;
}

/** Update the own-RSVP map for one event: INSERT sets true, DELETE-equivalent
 *  update sets false (cross-device sync of the current resident's RSVP). */
export function applyRsvpChange(
  rsvps: Record<string, boolean>,
  eventId: string,
  going: boolean,
): Record<string, boolean> {
  if (!going) {
    const next = { ...rsvps };
    delete next[eventId];
    return next;
  }
  return { ...rsvps, [eventId]: true };
}
