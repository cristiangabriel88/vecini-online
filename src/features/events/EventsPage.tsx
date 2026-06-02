import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Download, List, MapPin } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { formatDateLong, formatMonthYear, formatTime } from '@/shared/lib/format';
import type { BuildingEvent } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useEventsStore, useAsociatieEvents } from './eventsStore';
import { hydrateEvents, rsvpEvent } from './eventsApi';
import {
  attendeeCount,
  buildEventIcs,
  groupByMonth,
  icsFileName,
  isAttending,
  splitEvents,
} from './eventsLogic';

type View = 'agenda' | 'month';

function downloadIcs(event: BuildingEvent) {
  const blob = new Blob([buildEventIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = icsFileName(event);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function EventCard({ event }: { event: BuildingEvent }) {
  const { t } = useTranslation();
  const rsvps = useEventsStore((s) => s.rsvps);
  const base = useEventsStore((s) => s.attendees[event.id] ?? 0);
  const userId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const going = isAttending(rsvps, event.id);

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{event.title}</h2>
        {event.category && <Badge tone="primary">{event.category}</Badge>}
      </div>
      <p className="mb-2 text-sm font-medium text-text">
        {formatDateLong(event.starts_at)} · {formatTime(event.starts_at)}
        {event.ends_at && ` – ${formatTime(event.ends_at)}`}
      </p>
      {event.description && <p className="mb-2 text-muted">{event.description}</p>}
      {event.location && (
        <p className="mb-3 flex items-center gap-1 text-sm text-muted">
          <MapPin className="h-4 w-4" /> {event.location}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={going ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => rsvpEvent(event.id, userId)}
        >
          {t('events.rsvp')}
        </Button>
        <span className="text-sm text-muted">
          {t('events.rsvpCount', { count: attendeeCount(base, going) })}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => downloadIcs(event)}
          title={t('events.exportIcs')}
        >
          <Download className="h-4 w-4" /> {t('events.exportIcs')}
        </Button>
      </div>
    </Card>
  );
}

export default function EventsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const events = useAsociatieEvents();
  const fetchError = useEventsStore((s) => s.fetchError);
  const [view, setView] = useState<View>('agenda');

  useEffect(() => {
    if (asociatieId) void hydrateEvents(asociatieId, userId);
  }, [asociatieId, userId]);

  const [now] = useState(() => Date.now());
  const { upcoming, past } = useMemo(() => splitEvents(events, now), [events, now]);
  const months = useMemo(() => groupByMonth(events), [events]);

  const retry = () => {
    if (asociatieId) void hydrateEvents(asociatieId, userId);
  };

  return (
    <div>
      <PageHeader
        title={t('events.title')}
        action={
          <div className="flex gap-1" role="group" aria-label={t('events.viewToggle')}>
            <Button
              variant={view === 'agenda' ? 'primary' : 'ghost'}
              size="sm"
              aria-pressed={view === 'agenda'}
              onClick={() => setView('agenda')}
            >
              <List className="h-4 w-4" /> {t('events.viewAgenda')}
            </Button>
            <Button
              variant={view === 'month' ? 'primary' : 'ghost'}
              size="sm"
              aria-pressed={view === 'month'}
              onClick={() => setView('month')}
            >
              <CalendarDays className="h-4 w-4" /> {t('events.viewMonth')}
            </Button>
          </div>
        }
      />

      {fetchError ? (
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button variant="ghost" onClick={retry}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : events.length === 0 ? (
        <EmptyState body={t('events.empty')} icon={<CalendarDays className="h-10 w-10" />} />
      ) : view === 'agenda' ? (
        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              {t('events.upcoming')}
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">{t('events.noUpcoming')}</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
                {t('events.past')}
              </h3>
              <div className="space-y-3">
                {past.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {months.map((m) => (
            <section key={m.key}>
              <h3 className="mb-2 text-sm font-semibold capitalize text-text">
                {formatMonthYear(m.monthStart)}
              </h3>
              <div className="space-y-3">
                {m.events.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
