import type { Ticket, TicketStatus, DiscussionThread, AgaMeeting, Apartment } from '@/shared/types/domain';
import type { BreachRecord } from '@/features/gdpr/breachLogic';
import {
  buildTicketStatusChangedNotification,
  buildDiscussionReplyNotification,
  buildAgaConvokedNotification,
  buildAgaVotingOpenNotification,
  buildBreachResidentNoticeNotification,
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

/** Collect unique claimed user IDs from apartments, excluding selfUserId and empty strings. */
function claimedHolders(apartments: Apartment[], selfUserId: string): string[] {
  return [
    ...new Set(
      apartments
        .flatMap((a) => a.persons.map((p) => p.claimed_user_id ?? ''))
        .filter((id) => id.length > 0 && id !== selfUserId),
    ),
  ];
}

/**
 * Emit an `aga.convoked` in-app notification to all claimed apartment holders when
 * a meeting is convoked. Skips when there are no claimed holders. Store-first;
 * best-effort email fan-out via persistAndFanOut in live mode.
 */
export function emitAgaConvoked(
  meeting: AgaMeeting,
  apartments: Apartment[],
  selfUserId: string,
  now = Date.now(),
): void {
  const recipients = claimedHolders(apartments, selfUserId);
  if (recipients.length === 0) return;
  for (const recipientUserId of recipients) {
    const n = buildAgaConvokedNotification({
      recipientUserId,
      asociatieId: meeting.asociatie_id,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      scheduledAt: meeting.scheduled_at,
      location: meeting.location,
      now,
    });
    useNotificationStore.getState().emit(n);
    persistAndFanOut(n);
  }
}

/**
 * Emit an `aga.voting_open` in-app notification to all claimed apartment holders when
 * a meeting transitions to `in_desfasurare`. Skips when there are no claimed holders.
 * Store-first; best-effort email fan-out via persistAndFanOut in live mode.
 */
export function emitAgaVotingOpen(
  meeting: AgaMeeting,
  apartments: Apartment[],
  selfUserId: string,
  now = Date.now(),
): void {
  const recipients = claimedHolders(apartments, selfUserId);
  if (recipients.length === 0) return;
  for (const recipientUserId of recipients) {
    const n = buildAgaVotingOpenNotification({
      recipientUserId,
      asociatieId: meeting.asociatie_id,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      now,
    });
    useNotificationStore.getState().emit(n);
    persistAndFanOut(n);
  }
}

/**
 * Emit a `breach.resident_notice` to all claimed apartment holders (art. 34 GDPR).
 * Essential security communication: bypasses email consent in the fan-out layer.
 * Store-first; best-effort email fan-out via persistAndFanOut in live mode.
 * Skips when no claimed holders are found (demo or unclaimed apartments).
 */
export function emitBreachResidentNotice(
  breach: BreachRecord,
  apartments: Apartment[],
  selfUserId: string,
  now = Date.now(),
): void {
  const recipients = claimedHolders(apartments, selfUserId);
  if (recipients.length === 0) return;
  for (const recipientUserId of recipients) {
    const n = buildBreachResidentNoticeNotification({
      recipientUserId,
      asociatieId: breach.asociatie_id,
      breachId: breach.id,
      breachTitle: breach.title,
      now,
    });
    useNotificationStore.getState().emit(n);
    persistAndFanOut(n);
  }
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
