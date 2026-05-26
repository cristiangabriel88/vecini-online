import type { Role } from '@/shared/types/domain';

/**
 * In-app notification model (T126).
 *
 * Mirrors the `notifications` DB table shape so the offline store and the
 * future live persistence (T127) stay aligned; timestamps are epoch ms for
 * cheap comparison and persistence. Notification content is bilingual: typed
 * notifications (`membership.joined`, etc.) store raw params in `data` and let
 * the UI render them through i18n; generic notifications carry pre-rendered
 * `title` + `body` strings.
 */

export type NotificationKind = 'membership.joined' | 'announcement.published' | 'generic';

export type NotificationPriority = 'low' | 'normal' | 'urgent';

export interface AppNotification {
  id: string;
  /** The user this notification is addressed to. */
  userId: string;
  asociatieId: string | null;
  kind: NotificationKind;
  /**
   * For typed notifications: empty (the UI renders from `kind` + `data`).
   * For `generic`: the pre-rendered display title.
   */
  title: string;
  /**
   * For typed notifications: empty (the UI renders from `kind` + `data`).
   * For `generic`: the pre-rendered display body.
   */
  body: string;
  link: string | null;
  priority: NotificationPriority;
  /** Epoch ms when the recipient read this notification; null means unread. */
  readAt: number | null;
  /** Epoch ms when the notification was created. */
  createdAt: number;
  /** Extra params used for i18n rendering of typed notifications. */
  data: Record<string, string>;
}

/* -------------------------------- factories -------------------------------- */

function newNotifId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createNotification(
  input: Omit<AppNotification, 'id' | 'readAt' | 'createdAt'>,
  now = Date.now(),
): AppNotification {
  return { ...input, id: newNotifId(), readAt: null, createdAt: now };
}

/** Build a `membership.joined` notification for the invite issuer (admin). */
export function buildMembershipJoinedNotification(opts: {
  recipientUserId: string;
  asociatieId: string;
  memberName: string | null;
  memberRole: Role;
  now?: number;
}): AppNotification {
  return createNotification(
    {
      userId: opts.recipientUserId,
      asociatieId: opts.asociatieId,
      kind: 'membership.joined',
      title: '',
      body: '',
      link: '/app/admin/invitatii',
      priority: 'normal',
      data: {
        name: opts.memberName ?? '',
        role: opts.memberRole,
      },
    },
    opts.now,
  );
}

/* -------------------------------- helpers ---------------------------------- */

export function markNotificationRead(n: AppNotification, now = Date.now()): AppNotification {
  if (n.readAt !== null) return n;
  return { ...n, readAt: now };
}

export function isUnread(n: AppNotification): boolean {
  return n.readAt === null;
}

/**
 * Return the notifications for a specific user+asociație, newest first.
 */
export function notificationsFor(
  notifications: AppNotification[],
  userId: string,
  asociatieId: string,
): AppNotification[] {
  return notifications
    .filter((n) => n.userId === userId && n.asociatieId === asociatieId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Count unread notifications for a specific user+asociație.
 */
export function unreadCountFor(
  notifications: AppNotification[],
  userId: string,
  asociatieId: string,
): number {
  return notifications.filter(
    (n) => n.userId === userId && n.asociatieId === asociatieId && n.readAt === null,
  ).length;
}

/**
 * Age of a notification relative to `now` (ms). Used by the UI to derive a
 * relative timestamp string via i18n.
 */
export function notifAgeMs(createdAt: number, now: number): number {
  return Math.max(0, now - createdAt);
}
