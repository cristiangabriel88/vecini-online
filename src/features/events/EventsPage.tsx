import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, MapPin } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDateLong, formatTime } from '@/shared/lib/format';
import { DEMO_EVENTS } from '@/shared/demo/demoData';

export default function EventsPage() {
  const { t } = useTranslation();
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({});
  const events = [...DEMO_EVENTS].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  return (
    <div>
      <PageHeader title={t('events.title')} />
      {events.length === 0 ? (
        <EmptyState body={t('events.empty')} icon={<CalendarDays className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const going = rsvps[ev.id];
            return (
              <Card key={ev.id}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{ev.title}</h2>
                  {ev.category && <Badge tone="primary">{ev.category}</Badge>}
                </div>
                <p className="mb-2 text-sm font-medium text-text">
                  {formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}
                  {ev.ends_at && ` – ${formatTime(ev.ends_at)}`}
                </p>
                {ev.description && <p className="mb-2 text-muted">{ev.description}</p>}
                {ev.location && (
                  <p className="mb-3 flex items-center gap-1 text-sm text-muted">
                    <MapPin className="h-4 w-4" /> {ev.location}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    variant={going ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setRsvps((r) => ({ ...r, [ev.id]: !going }))}
                  >
                    {t('events.rsvp')}
                  </Button>
                  <span className="text-sm text-muted">
                    {t('events.rsvpCount', { count: (going ? 1 : 0) + 7 })}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
