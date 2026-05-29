import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '@/shared/types/domain';
import {
  type AppNotification,
  buildMembershipJoinedNotification,
  markNotificationRead,
  notificationsFor,
  unreadCountFor,
} from '@/features/notifications/notificationLogic';
import { mayNotify, type NotificationKind as ConsentGateKind } from '@/shared/notify/consentGate';
import type { ConsentRecord } from '@/features/legal/consentLogic';
import { DEMO_NOTIFICATIONS } from '@/shared/demo/demoData';

/**
 * In-app notification inbox (T126).
 *
 * A flat list of `AppNotification` records shared across all users. Persisted
 * so demo mode retains notifications across reloads. Scoped by
 * `(userId, asociatieId)` at read time — callers pass their own ids rather than
 * the store holding a single active context, so the inbox stays correct across
 * demo-persona switches.
 *
 * Live persistence (fan-out via triggers, email/Telegram channels) is T127.
 */

interface NotificationState {
  notifications: AppNotification[];

  /**
   * Append a notification to the store. Live path mirrors to `notifications`
   * under RLS (T127); offline the local list is authoritative.
   */
  emit: (n: AppNotification) => void;

  /**
   * Consent-gated emit: checks `mayNotify(record, consentKind)` before storing.
   * Use this for non-essential (community/marketing) in-app notifications so a
   * resident who refused a category receives nothing of that kind.
   */
  emitGated: (n: AppNotification, consentKind: ConsentGateKind, record: ConsentRecord | null) => void;

  /** Mark a single notification read by id. */
  markRead: (id: string) => void;

  /** Mark every notification unread for a user+asociație as read. */
  markAllRead: (userId: string, asociatieId: string, now?: number) => void;

  /**
   * Return notifications for a specific user+asociație, newest first.
   * Intended for selectors — do not call in render-critical paths without
   * memoisation (the filtering allocates a new array each call).
   */
  forUser: (userId: string, asociatieId: string) => AppNotification[];

  /** Count of unread notifications for a specific user+asociație. */
  unreadCount: (userId: string, asociatieId: string) => number;

  /**
   * Emit a `membership.joined` notification to the invite issuer.
   * Called from `authStore.redeemInvite` on a successful offline redemption.
   */
  emitMembershipJoined: (opts: {
    recipientUserId: string;
    asociatieId: string;
    memberName: string | null;
    memberRole: Role;
    now?: number;
  }) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Seeded with demo data so the offline inbox is populated; a persisted
      // store (returning user) replaces this on rehydrate.
      notifications: [...DEMO_NOTIFICATIONS],

      emit: (n) => set({ notifications: [...get().notifications, n] }),

      emitGated: (n, consentKind, record) => {
        if (mayNotify(record, consentKind)) {
          set({ notifications: [...get().notifications, n] });
        }
      },

      markRead: (id) => {
        const now = Date.now();
        set({
          notifications: get().notifications.map((n) =>
            n.id === id ? markNotificationRead(n, now) : n,
          ),
        });
      },

      markAllRead: (userId, asociatieId, now = Date.now()) =>
        set({
          notifications: get().notifications.map((n) =>
            n.userId === userId && n.asociatieId === asociatieId
              ? markNotificationRead(n, now)
              : n,
          ),
        }),

      forUser: (userId, asociatieId) =>
        notificationsFor(get().notifications, userId, asociatieId),

      unreadCount: (userId, asociatieId) =>
        unreadCountFor(get().notifications, userId, asociatieId),

      emitMembershipJoined: (opts) => {
        const n = buildMembershipJoinedNotification(opts);
        set({ notifications: [...get().notifications, n] });
      },
    }),
    { name: 'vecini.notifications' },
  ),
);
