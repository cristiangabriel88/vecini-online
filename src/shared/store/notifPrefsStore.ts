import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  defaultNotifEmailPrefs,
  DEFAULT_TIMEZONE,
  type NotifEmailPrefs,
} from '@/shared/lib/notifPrefsLogic';

/**
 * Per-user notification email preferences (T14).
 *
 * Persisted offline so preferences survive reloads and persona switches.
 * Keyed by userId so different demo personas retain their own settings.
 * Live persistence (reading/writing notification_preferences in Supabase)
 * arrives with T127.
 */

interface NotifPrefsState {
  prefs: Record<string, NotifEmailPrefs>;

  /** Get prefs for a user, returning defaults when not yet configured. */
  getPrefs: (userId: string) => NotifEmailPrefs;

  /** Toggle email notifications on or off for a user. */
  setEmailEnabled: (userId: string, enabled: boolean) => void;

  /**
   * Set quiet-hours window. Pass null for both start and end to disable.
   * The window is [start, end) in local time, with wrap-around support.
   */
  setQuietHours: (
    userId: string,
    start: number | null,
    end: number | null,
    timezone?: string,
  ) => void;
}

export const useNotifPrefsStore = create<NotifPrefsState>()(
  persist(
    (set, get) => ({
      prefs: {},

      getPrefs: (userId) => get().prefs[userId] ?? defaultNotifEmailPrefs(),

      setEmailEnabled: (userId, enabled) => {
        const current = get().prefs[userId] ?? defaultNotifEmailPrefs();
        set({ prefs: { ...get().prefs, [userId]: { ...current, emailEnabled: enabled } } });
      },

      setQuietHours: (userId, start, end, timezone) => {
        const current = get().prefs[userId] ?? defaultNotifEmailPrefs();
        set({
          prefs: {
            ...get().prefs,
            [userId]: {
              ...current,
              quietHoursStart: start,
              quietHoursEnd: end,
              timezone: timezone ?? current.timezone ?? DEFAULT_TIMEZONE,
            },
          },
        });
      },
    }),
    { name: 'vecini.notif-prefs' },
  ),
);
