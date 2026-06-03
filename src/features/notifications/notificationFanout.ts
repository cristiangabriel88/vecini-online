import type { Ticket, TicketStatus, DiscussionThread } from '@/shared/types/domain';
import {
  buildTicketStatusChangedNotification,
  buildDiscussionReplyNotification,
} from './notificationLogic';
import { persistAndFanOut } from './notificationsApi';
import { useNotificationStore } from '@/shared/store/notificationStore';

/**
 * Emit a ticket.status_changed in-app notification to the ticket's reporter.
 * Store-first (the reporter sees it immediately in the offline inbox);
 * best-effort email fan-out via persistAndFanOut in live mode.
 */
export function emitTicketStatusChanged(
  ticket: Ticket,
  newStatus: TicketStatus,
  now = Date.now(),
): void {
  if (!ticket.reporter_user_id) return;
  const n = buildTicketStatusChangedNotification({
    recipientUserId: ticket.reporter_user_id,
    asociatieId: ticket.asociatie_id,
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    newStatus,
    now,
  });
  useNotificationStore.getState().emit(n);
  persistAndFanOut(n);
}

/**
 * Emit a discussion.reply in-app notification to the thread's first-message author.
 * Skips the emit when the replier is the same user as the thread starter, or when
 * the thread has no prior messages (no one to notify yet).
 * Store-first; best-effort email fan-out via persistAndFanOut in live mode.
 */
export function emitDiscussionReply(
  thread: DiscussionThread,
  replyAuthorId: string,
  replyAuthorName: string,
  now = Date.now(),
): void {
  const threadAuthorId = thread.messages[0]?.author_user_id;
  if (!threadAuthorId || threadAuthorId === replyAuthorId) return;
  const n = buildDiscussionReplyNotification({
    recipientUserId: threadAuthorId,
    asociatieId: thread.asociatie_id,
    threadId: thread.id,
    threadTitle: thread.title,
    replyAuthorName,
    now,
  });
  useNotificationStore.getState().emit(n);
  persistAndFanOut(n);
}
