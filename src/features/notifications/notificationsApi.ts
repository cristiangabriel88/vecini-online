import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { env } from '@/shared/lib/env';
import { reportError } from '@/shared/lib/errorReporting';
import {
  type AppNotification,
  type NotificationKind,
  type NotificationPriority,
} from '@/features/notifications/notificationLogic';
import type { NotifEmailPrefs } from '@/shared/lib/notifPrefsLogic';
import { useNotificationStore } from '@/shared/store/notificationStore';
import { useNotifPrefsStore } from '@/shared/store/notifPrefsStore';

/* Dual-mode notifications repository (T127).
   The Zustand store is the synchronous source of truth; these functions
   mirror to `notifications` + `notification_preferences` under RLS when a
   backend is configured. Demo/offline stores stay the default when absent. */

// ── Row shapes (snake_case) ──────────────────────────────────────────────────

interface NotifRow {
  id: string;
  user_id: string;
  asociatie_id: string | null;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  priority: string;
  read_at: string | null;
  created_at: string;
  data: Record<string, string>;
}

// ── Mappers (exported for unit tests) ───────────────────────────────────────

export function rowToNotif(row: NotifRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    asociatieId: row.asociatie_id,
    kind: row.kind as NotificationKind,
    title: row.title,
    body: row.body,
    link: row.link,
    priority: row.priority as NotificationPriority,
    readAt: row.read_at ? new Date(row.read_at).getTime() : null,
    createdAt: new Date(row.created_at).getTime(),
    data: (row.data ?? {}) as Record<string, string>,
  };
}

export function notifToRow(n: AppNotification): NotifRow {
  return {
    id: n.id,
    user_id: n.userId,
    asociatie_id: n.asociatieId,
    kind: n.kind,
    title: n.title,
    body: n.body,
    link: n.link,
    priority: n.priority,
    read_at: n.readAt !== null ? new Date(n.readAt).toISOString() : null,
    created_at: new Date(n.createdAt).toISOString(),
    data: n.data,
  };
}

function deriveConsentKind(kind: NotificationKind): 'essential' | 'community' {
  return kind === 'membership.joined' || kind === 'breach.resident_notice' ? 'essential' : 'community';
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Hydrate the notifications for a user+asociatie from the backend.
 *  Replaces the local store slice; no-op in demo/offline mode. */
export async function hydrateNotifications(userId: string, asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId || !asociatieId) return;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(
        'id, user_id, asociatie_id, kind, title, body, link, priority, read_at, created_at, data',
      )
      .eq('user_id', userId)
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'notificationsApi.hydrate' });
      return;
    }
    useNotificationStore
      .getState()
      .replaceForUser(userId, asociatieId, (data as NotifRow[]).map(rowToNotif));
  } catch (err) {
    reportError(err, { source: 'notificationsApi.hydrate' });
  }
}

/** Insert a notification into the DB (fire-and-forget). */
export function persistNotification(n: AppNotification): void {
  if (!isSupabaseConfigured || !n.asociatieId) return;
  void (async () => {
    try {
      await supabase.from('notifications').upsert(notifToRow(n), { onConflict: 'id' });
    } catch (err) {
      reportError(err, { source: 'notificationsApi.persist' });
    }
  })();
}

/** Mark one notification read in the DB (fire-and-forget). RLS enforces owner. */
export function syncMarkRead(id: string, now: number): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date(now).toISOString() })
        .eq('id', id);
    } catch (err) {
      reportError(err, { source: 'notificationsApi.markRead' });
    }
  })();
}

/** Bulk mark-read for a user+asociatie (fire-and-forget). RLS enforces owner. */
export function syncMarkAllRead(userId: string, asociatieId: string, now: number): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date(now).toISOString() })
        .eq('user_id', userId)
        .eq('asociatie_id', asociatieId)
        .is('read_at', null);
    } catch (err) {
      reportError(err, { source: 'notificationsApi.markAllRead' });
    }
  })();
}

/** Hydrate notification prefs for a user from the DB and update the local store.
 *  DB values are authoritative on hydration; no-op in demo mode. */
export async function hydrateNotifPrefs(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('email_enabled, quiet_hours_start, quiet_hours_end, timezone')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      reportError(error, { source: 'notificationsApi.hydratePrefs' });
      return;
    }
    if (!data) return;
    const store = useNotifPrefsStore.getState();
    store.setEmailEnabled(userId, data.email_enabled ?? true);
    store.setQuietHours(
      userId,
      data.quiet_hours_start ?? null,
      data.quiet_hours_end ?? null,
      data.timezone ?? 'Europe/Bucharest',
    );
  } catch (err) {
    reportError(err, { source: 'notificationsApi.hydratePrefs' });
  }
}

/** Persist notification prefs for a user to the DB (upsert, fire-and-forget). */
export function persistNotifPrefs(userId: string, prefs: NotifEmailPrefs): void {
  if (!isSupabaseConfigured || !userId) return;
  void (async () => {
    try {
      await supabase.from('notification_preferences').upsert(
        {
          user_id: userId,
          email_enabled: prefs.emailEnabled,
          quiet_hours_start: prefs.quietHoursStart,
          quiet_hours_end: prefs.quietHoursEnd,
          timezone: prefs.timezone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    } catch (err) {
      reportError(err, { source: 'notificationsApi.persistPrefs' });
    }
  })();
}

/** Fan out a notification to the email channel via notify-email (fire-and-forget).
 *  Authorization: the bearer token must belong to an admin of the asociatie or the
 *  recipient themselves; T14's `notify-email` function handles the gate. */
export function fanOutEmail(n: AppNotification, bearerToken: string): void {
  if (!isSupabaseConfigured || !n.asociatieId || !bearerToken) return;
  void (async () => {
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : env.appUrl;
      await fetch(`${origin}/.netlify/functions/notify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          recipientUserId: n.userId,
          asociatieId: n.asociatieId,
          kind: n.kind,
          priority: n.priority,
          data: n.data,
          consentKind: deriveConsentKind(n.kind),
        }),
      });
    } catch (err) {
      reportError(err, { source: 'notificationsApi.fanOutEmail' });
    }
  })();
}

/** Persist a notification to the DB and fan out to the email channel.
 *  Gets the bearer token from the active Supabase session.
 *  Fire-and-forget: failures are logged but do not block the caller. */
export function persistAndFanOut(n: AppNotification): void {
  if (!isSupabaseConfigured || !n.asociatieId) return;
  void (async () => {
    try {
      await supabase.from('notifications').upsert(notifToRow(n), { onConflict: 'id' });
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        fanOutEmail(n, session.access_token);
      }
    } catch (err) {
      reportError(err, { source: 'notificationsApi.persistAndFanOut' });
    }
  })();
}
