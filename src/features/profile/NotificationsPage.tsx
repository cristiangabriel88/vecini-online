import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, CheckCheck, Copy, ExternalLink, Link2Off, Mail, MailX, Moon, Send } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { useNotificationStore } from '@/shared/store/notificationStore';
import { useNotifPrefsStore } from '@/shared/store/notifPrefsStore';
import { useMyIdentity } from '@/features/profile/profileStore';
import { useAuthStore } from '@/shared/store/authStore';
import { useTelegramLinkStore } from '@/shared/store/telegramLinkStore';
import { env } from '@/shared/lib/env';
import { formatDate } from '@/shared/lib/format';
import { buildTelegramDeepLink } from '@/features/telegram/telegramDeepLink';
import {
  hydrateNotifications,
  hydrateNotifPrefs,
  syncMarkRead,
  syncMarkAllRead,
  persistNotifPrefs,
} from '@/features/notifications/notificationsApi';
import { notifAgeMs, type AppNotification } from '@/features/notifications/notificationLogic';
import { isValidQuietHour } from '@/shared/lib/notifPrefsLogic';
import { cn } from '@/shared/lib/cn';

function roleLabel(role: string, t: (key: string) => string): string {
  const key = `profile.roleLabel.${role}`;
  const translated = t(key);
  return translated === key ? role : translated;
}

function useRelativeAge(createdAt: number): string {
  const { t } = useTranslation();
  const ageMs = notifAgeMs(createdAt, Date.now());
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return t('notifications.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('notifications.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('notifications.hoursAgo', { count: hours });
  return t('notifications.daysAgo', { count: Math.floor(hours / 24) });
}

function NotifRow({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rl = roleLabel(n.data.role ?? '', t);
  const age = useRelativeAge(n.createdAt);
  const unread = n.readAt === null;

  let title: string;
  let body: string;

  if (n.kind === 'membership.joined') {
    const name = n.data.name || t('notifications.anonymousMember');
    title = t('notifications.membershipJoined', { name });
    body = t('notifications.membershipJoinedBody', { name, role: rl });
  } else if (n.kind === 'announcement.published') {
    title = n.title || t('notifications.announcementPublished');
    body = n.body;
  } else if (n.kind === 'ticket.status_changed') {
    title = t('notifications.ticketStatusChanged', { title: n.data.title || '' });
    body = t('notifications.ticketStatusChangedBody', { title: n.data.title || '', status: n.data.status || '' });
  } else if (n.kind === 'discussion.reply') {
    title = t('notifications.discussionReply', { title: n.data.threadTitle || '' });
    body = t('notifications.discussionReplyBody', { name: n.data.name || '' });
  } else if (n.kind === 'aga.convoked') {
    title = t('notifications.agaConvoked', { title: n.data.title || '' });
    body = t('notifications.agaConvokedBody', { date: n.data.date || '', location: n.data.location || '' });
  } else if (n.kind === 'aga.voting_open') {
    title = t('notifications.agaVotingOpen', { title: n.data.title || '' });
    body = t('notifications.agaVotingOpenBody');
  } else if (n.kind === 'breach.resident_notice') {
    title = t('notifications.breachResidentNotice', { title: n.data.title || '' });
    body = t('notifications.breachResidentNoticeBody');
  } else {
    title = n.title;
    body = n.body;
  }

  const handleClick = () => {
    if (unread) onRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div
      className={cn('notif-row', unread && 'notif-row--unread')}
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={handleClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? handleClick() : undefined)}
    >
      <div className="notif-row__dot-wrap" aria-hidden="true">
        <span className={cn('notif-row__dot', !unread && 'notif-row__dot--read')} />
      </div>
      <div className="notif-row__body">
        <div className="notif-row__title">{title}</div>
        {body && <div className="notif-row__text">{body}</div>}
        <div className="notif-row__meta">
          <span className="notif-row__age">{age}</span>
          {n.link && (
            <span className="notif-row__link-hint" aria-hidden="true">
              <ExternalLink size={11} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Panel for the resident to link / unlink their Telegram account (T68). */
function TelegramLinkPanel({
  userId,
  asociatieId,
  role,
}: {
  userId: string;
  asociatieId: string;
  role: import('@/shared/types/domain').Role | null;
}) {
  const { t } = useTranslation();
  const links = useTelegramLinkStore((s) => s.links);
  const issueLinkCode = useTelegramLinkStore((s) => s.issueLinkCode);
  const unlink = useTelegramLinkStore((s) => s.unlink);
  const botUsername = env.telegramBotUsername;

  const myLink = links.find((l) => l.userId === userId) ?? null;
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const deepLink =
    activeCode && botUsername ? buildTelegramDeepLink(botUsername, activeCode) : null;

  function handleIssueCode() {
    const linkCode = issueLinkCode({
      userId,
      asociatieId,
      role: role ?? 'proprietar',
      expiresAt: null,
    });
    setActiveCode(linkCode.code);
  }

  async function handleCopy() {
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
      toast.success(t('notifications.telegramCopied'));
    } catch {
      /* clipboard unavailable */
    }
  }

  function handleUnlink() {
    if (!myLink) return;
    unlink(myLink.telegramUserId);
    setActiveCode(null);
    toast.success(t('notifications.telegramUnlinked'));
  }

  const handle = myLink?.username ?? myLink?.firstName ?? null;
  const linkedAtFormatted = myLink ? formatDate(myLink.linkedAt) : null;

  return (
    <Card title={t('notifications.telegramTitle')}>
      <p className="text-sm text-muted">{t('notifications.telegramBody')}</p>

      {myLink ? (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft,var(--primary-soft))] text-[var(--success,var(--primary))]">
              <Send className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t('notifications.telegramLinked')}</p>
              {handle && (
                <p className="text-xs text-muted">
                  {t('notifications.telegramLinkedHint', { handle })}
                </p>
              )}
              {linkedAtFormatted && (
                <p className="text-xs text-muted">
                  {t('notifications.telegramLinkedAt', { date: linkedAtFormatted })}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Button variant="danger" size="sm" onClick={handleUnlink}>
              <Link2Off className="h-4 w-4" /> {t('notifications.telegramUnlink')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {!activeCode ? (
            <Button variant="secondary" onClick={handleIssueCode}>
              <Send className="h-4 w-4" /> {t('notifications.telegramGenerateCode')}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">{t('notifications.telegramCodeTitle')}</p>
              <p className="text-xs text-muted">{t('notifications.telegramCodeHint')}</p>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3">
                <p className="iv-mono text-center text-xl font-bold tracking-[0.25em] text-text">
                  {activeCode}
                </p>
              </div>
              {!botUsername && (
                <p className="text-xs text-warning">{t('notifications.telegramNoBotUsername')}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {deepLink && (
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--secondary btn--sm inline-flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" /> {t('notifications.telegramDeepLink')}
                  </a>
                )}
                <Button variant="secondary" size="sm" onClick={() => void handleCopy()}>
                  <Copy className="h-4 w-4" /> {t('notifications.telegramCopyLink')}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleIssueCode}>
                  {t('notifications.telegramGenerateAnother')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** Preference panel: email toggle + quiet hours (T14). */
function NotifPrefsPanel({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const store = useNotifPrefsStore();
  const prefs = store.getPrefs(userId);

  // Local state for quiet-hours inputs (submitted on save)
  const [qStart, setQStart] = useState<string>(
    prefs.quietHoursStart !== null ? String(prefs.quietHoursStart) : '',
  );
  const [qEnd, setQEnd] = useState<string>(
    prefs.quietHoursEnd !== null ? String(prefs.quietHoursEnd) : '',
  );

  const hasQuietHours = prefs.quietHoursStart !== null && prefs.quietHoursEnd !== null;

  const handleToggleEmail = () => {
    const updated = { ...prefs, emailEnabled: !prefs.emailEnabled };
    store.setEmailEnabled(userId, updated.emailEnabled);
    persistNotifPrefs(userId, updated);
  };

  const handleSaveQuietHours = () => {
    const start = parseInt(qStart, 10);
    const end = parseInt(qEnd, 10);
    if (isValidQuietHour(start) && isValidQuietHour(end)) {
      const updated = { ...prefs, quietHoursStart: start, quietHoursEnd: end };
      store.setQuietHours(userId, start, end);
      persistNotifPrefs(userId, updated);
    }
  };

  const handleClearQuietHours = () => {
    const updated = { ...prefs, quietHoursStart: null, quietHoursEnd: null };
    store.setQuietHours(userId, null, null);
    persistNotifPrefs(userId, updated);
    setQStart('');
    setQEnd('');
  };

  const emailOn = prefs.emailEnabled;

  return (
    <Card title={t('notifications.prefTitle')}>
      {/* Email channel toggle */}
      <ul className="divide-y divide-[var(--border)]">
        <li className="flex items-center gap-3 py-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: emailOn ? 'var(--success-soft, var(--primary-soft))' : 'var(--bg-sunken)',
              color: emailOn ? 'var(--success, var(--primary))' : 'var(--text-muted)',
            }}
          >
            {emailOn ? <Mail className="h-4 w-4" /> : <MailX className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t('notifications.prefEmailLabel')}</p>
            <p className="text-xs text-muted">
              {emailOn ? t('notifications.prefEmailOn') : t('notifications.prefEmailOff')}
            </p>
          </div>
          <button
            type="button"
            className={cn('btn btn--sm shrink-0', emailOn ? 'btn--danger' : 'btn--secondary')}
            onClick={handleToggleEmail}
          >
            {emailOn ? t('notifications.prefEmailToggleOff') : t('notifications.prefEmailToggleOn')}
          </button>
        </li>
      </ul>
      <p className="mt-2 text-xs text-muted">{t('notifications.prefEmailHint')}</p>

      {/* Quiet hours */}
      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <div className="mb-2 flex items-center gap-2">
          <Moon size={14} className="text-muted" />
          <span className="text-sm font-medium">{t('notifications.prefQuietHours')}</span>
          {hasQuietHours && (
            <span className="text-xs text-muted">
              {prefs.quietHoursStart}:00 - {prefs.quietHoursEnd}:00
            </span>
          )}
        </div>
        <p className="mb-3 text-xs text-muted">{t('notifications.prefQuietHoursHint')}</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{t('notifications.prefQuietStart')}</span>
            <input
              type="number"
              min={0}
              max={23}
              className="input input--sm w-20"
              placeholder="22"
              value={qStart}
              onChange={(e) => setQStart(e.target.value)}
              aria-label={t('notifications.prefQuietStart')}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{t('notifications.prefQuietEnd')}</span>
            <input
              type="number"
              min={0}
              max={23}
              className="input input--sm w-20"
              placeholder="8"
              value={qEnd}
              onChange={(e) => setQEnd(e.target.value)}
              aria-label={t('notifications.prefQuietEnd')}
            />
          </label>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={handleSaveQuietHours}
            disabled={!qStart || !qEnd}
          >
            {t('notifications.prefQuietSave')}
          </button>
          {hasQuietHours && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleClearQuietHours}
            >
              {t('notifications.prefQuietClear')}
            </button>
          )}
        </div>
        {!hasQuietHours && (
          <p className="mt-2 text-xs text-muted">{t('notifications.prefQuietNone')}</p>
        )}
      </div>
    </Card>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userId } = useMyIdentity();
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId) ?? '';
  const activeRole = useAuthStore((s) => s.activeRole)();
  const store = useNotificationStore();
  const prefsStore = useNotifPrefsStore();
  const notifications = store.forUser(userId, currentAsociatieId);
  const unread = notifications.filter((n) => n.readAt === null).length;

  // Hydrate notifications + prefs from the backend on mount (live mode only).
  useEffect(() => {
    if (userId && currentAsociatieId) {
      void hydrateNotifications(userId, currentAsociatieId);
      void hydrateNotifPrefs(userId);
    }
  }, [userId, currentAsociatieId]);

  // One-click unsubscribe via email footer link (?action=unsubscribe-email).
  const [unsubscribed, setUnsubscribed] = useState(false);
  useEffect(() => {
    if (searchParams.get('action') === 'unsubscribe-email') {
      const updated = { ...prefsStore.getPrefs(userId), emailEnabled: false };
      prefsStore.setEmailEnabled(userId, false);
      persistNotifPrefs(userId, updated);
      setUnsubscribed(true);
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRead = (id: string) => {
    const now = Date.now();
    store.markRead(id);
    syncMarkRead(id, now);
  };
  const handleMarkAllRead = () => {
    const now = Date.now();
    store.markAllRead(userId, currentAsociatieId, now);
    syncMarkAllRead(userId, currentAsociatieId, now);
  };

  return (
    <div>
      <PageHeader
        title={t('nav.notifications')}
        action={
          unread > 0 ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleMarkAllRead}
              aria-label={t('notifications.markAllRead')}
            >
              <CheckCheck size={15} />
              <span>{t('notifications.markAllRead')}</span>
            </button>
          ) : undefined
        }
      />

      {unsubscribed && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-[var(--success-border,var(--border))] bg-[var(--success-soft,var(--bg-sunken))] px-4 py-3 text-sm text-[var(--success,var(--text-primary))]"
        >
          <strong>{t('notifications.prefUnsubscribeTitle')}</strong>
          {' — '}
          {t('notifications.prefUnsubscribeBody')}
        </div>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-10 w-10" />}
          body={t('notifications.empty')}
        />
      ) : (
        <div className="notif-list">
          {unread > 0 && (
            <div className="notif-list__summary">
              <Bell size={14} aria-hidden="true" />
              <span>{t('notifications.unreadCount', { count: unread })}</span>
            </div>
          )}
          {notifications.map((n) => (
            <NotifRow key={n.id} n={n} onRead={handleRead} />
          ))}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <NotifPrefsPanel userId={userId} />
        <TelegramLinkPanel
          userId={userId}
          asociatieId={currentAsociatieId}
          role={activeRole}
        />
      </div>
    </div>
  );
}
