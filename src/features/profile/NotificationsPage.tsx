import { useTranslation } from 'react-i18next';
import { Bell, BellOff, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { useNotificationStore } from '@/shared/store/notificationStore';
import { useMyIdentity } from '@/features/profile/profileStore';
import { useAuthStore } from '@/shared/store/authStore';
import { notifAgeMs, type AppNotification } from '@/features/notifications/notificationLogic';
import { cn } from '@/shared/lib/cn';

/** Translate a role code to a bilingual label using the `profile.roleLabel.*` keys. */
function roleLabel(role: string, t: (key: string) => string): string {
  const key = `profile.roleLabel.${role}`;
  const translated = t(key);
  // Fall back to raw value when no translation key exists.
  return translated === key ? role : translated;
}

/** Format a relative timestamp (e.g. "acum 3 min"). */
function useRelativeAge(createdAt: number): string {
  const { t } = useTranslation();
  const ageMs = notifAgeMs(createdAt, Date.now());
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return t('notifications.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('notifications.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('notifications.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('notifications.daysAgo', { count: days });
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
      onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? handleClick() : undefined}
    >
      <div className="notif-row__dot-wrap" aria-hidden="true">
        {unread ? (
          <span className="notif-row__dot" />
        ) : (
          <span className="notif-row__dot notif-row__dot--read" />
        )}
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

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { userId } = useMyIdentity();
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId) ?? '';
  const store = useNotificationStore();
  const notifications = store.forUser(userId, currentAsociatieId);
  const unread = notifications.filter((n) => n.readAt === null).length;

  const handleRead = (id: string) => store.markRead(id);
  const handleMarkAllRead = () => store.markAllRead(userId, currentAsociatieId);

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
    </div>
  );
}
