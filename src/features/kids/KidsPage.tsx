import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ToyBrick, Plus, Users, Trash2, MapPin, Clock, Check, Pencil } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { DatePicker } from '@/shared/components/DatePicker';
import { Select } from '@/shared/components/Select';
import { Modal } from '@/shared/components/Modal';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { formatDate } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useMyIdentity, useProfileStore } from '@/features/profile/profileStore';
import { useKidsStore, useAsociatieKids } from './kidsStore';
import { hydrateKids, addKidsEventLive, updateKidsEventLive } from './kidsApi';
import {
  AGE_BUCKETS,
  EVENT_BUCKETS,
  aggregateByBucket,
  goingCount,
  isValidEvent,
  isValidRegistration,
  myRanges,
  splitEvents,
  totalKids,
} from './kidsLogic';
import type { KidsAgeBucket, KidsEvent } from '@/shared/types/domain';
import { assertAggregateOnly, KIDS_EVENT_FIELDS } from '@/shared/lib/minorsGuard';

const today = () => new Date().toISOString().slice(0, 10);

export default function KidsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useKidsStore((s) => s.fetchError);
  const joinedIds = useKidsStore((s) => s.joinedIds);
  const { registerKids, removeRange, toggleJoin, removeEvent } = useKidsStore();
  const { ranges, events } = useAsociatieKids();
  const { userId } = useMyIdentity();
  const profileGet = useProfileStore((s) => s.get);

  const [regOpen, setRegOpen] = useState(false);
  const [bucket, setBucket] = useState<KidsAgeBucket>(AGE_BUCKETS[0]);
  const [count, setCount] = useState('1');
  const [pendingRemoveEventId, setPendingRemoveEventId] = useState<string | null>(null);
  const [pendingRemoveRange, setPendingRemoveRange] = useState<{ bucket: KidsAgeBucket; userId: string } | null>(null);
  const [editingEvent, setEditingEvent] = useState<KidsEvent | null>(null);

  const [evtOpen, setEvtOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('17:00');
  const [location, setLocation] = useState('');
  const [evtBucket, setEvtBucket] = useState<KidsAgeBucket | 'all'>('all');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateKids(asociatieId);
  }, [asociatieId]);

  const bucketLabel = (b: KidsAgeBucket | 'all') =>
    b === 'all' ? t('kids.allAges') : t('kids.bucketLabel', { range: b });

  const aggregate = aggregateByBucket(ranges);
  const total = totalKids(ranges);
  const mine = myRanges(ranges, userId ?? 'u-res');
  const { upcoming, past } = splitEvents(events, today());

  const regCount = Number(count);
  const regValid = isValidRegistration(bucket, regCount);
  const evtValid = isValidEvent(title, date);

  const submitRegistration = () => {
    if (!regValid || !asociatieId) return;
    registerKids(asociatieId, userId ?? 'u-res', '', bucket, regCount);
    toast.success(t('kids.registered'));
    setRegOpen(false);
  };

  const openEditEvent = (e: KidsEvent) => {
    setEditingEvent(e);
    setTitle(e.title);
    setDate(e.date);
    setTime(e.time);
    setLocation(e.location);
    setEvtBucket(e.bucket);
    setNote(e.note);
    setEvtOpen(true);
  };

  const closeEvtModal = () => {
    setEvtOpen(false);
    setEditingEvent(null);
    setTitle('');
    setDate(today());
    setTime('17:00');
    setLocation('');
    setEvtBucket('all');
    setNote('');
  };

  const submitEvent = () => {
    if (!evtValid || !asociatieId) return;
    if (editingEvent) {
      const updated: KidsEvent = {
        ...editingEvent,
        title: title.trim(),
        date,
        time: time.trim(),
        location: location.trim(),
        bucket: evtBucket,
        note: note.trim(),
      };
      assertAggregateOnly(updated, KIDS_EVENT_FIELDS, 'kids_events');
      updateKidsEventLive(asociatieId, updated);
      toast.success(t('kids.eventUpdated'));
      closeEvtModal();
      return;
    }
    const prof = profileGet(userId ?? '', '');
    const organizerName = prof.fullName || prof.displayName || 'Rezident';
    const event: KidsEvent = {
      id: `ke-${Date.now()}`,
      asociatie_id: asociatieId,
      title: title.trim(),
      date,
      time: time.trim(),
      location: location.trim(),
      bucket: evtBucket,
      note: note.trim(),
      interested: 0,
      organizer_user_id: userId ?? 'u-res',
      organizer_name: organizerName,
      created_at: new Date().toISOString(),
    };
    assertAggregateOnly(event, KIDS_EVENT_FIELDS, 'kids_events');
    addKidsEventLive(asociatieId, event);
    toast.success(t('kids.eventAdded'));
    closeEvtModal();
  };

  const renderEvent = (e: KidsEvent, faded: boolean) => {
    const joined = joinedIds.includes(e.id);
    const isOrganizer = e.organizer_user_id === (userId ?? 'u-res');
    return (
      <Card key={e.id} className={`p-4 ${faded ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{e.title}</p>
              <Badge tone={e.bucket === 'all' ? 'neutral' : 'primary'}>{bucketLabel(e.bucket)}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {formatDate(e.date)}
                {e.time ? `, ${e.time}` : ''}
              </span>
              {e.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {e.location}
                </span>
              )}
            </div>
            {e.note && <p className="mt-2 text-sm">{e.note}</p>}
            <p className="mt-2 text-xs text-muted">
              {t('kids.organizedBy', { name: e.organizer_name })} ·{' '}
              {t('kids.going', { count: goingCount(e, joined) })}
            </p>
          </div>
          {isOrganizer && !faded && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openEditEvent(e)}
                aria-label={t('kids.editEvent')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPendingRemoveEventId(e.id)}
                aria-label={t('kids.removeEvent')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        {!faded && (
          <div className="mt-3">
            <Button
              size="sm"
              variant={joined ? 'secondary' : 'primary'}
              onClick={() => toggleJoin(e.id)}
            >
              {joined ? (
                <>
                  <Check className="h-4 w-4" /> {t('kids.joined')}
                </>
              ) : (
                t('kids.join')
              )}
            </Button>
          </div>
        )}
      </Card>
    );
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateKids(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('kids.title')}
        subtitle={t('kids.subtitle')}
        action={
          <Button onClick={() => { setEditingEvent(null); setEvtOpen(true); }}>
            <Plus className="h-4 w-4" /> {t('kids.addEvent')}
          </Button>
        }
      />

      {/* Privacy-preserving age registry */}
      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4 text-primary" /> {t('kids.registryTitle')}
          </h2>
          <Button size="sm" variant="secondary" onClick={() => setRegOpen(true)}>
            {t('kids.registerKids')}
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted">{t('kids.registryHint')}</p>

        {total === 0 ? (
          <p className="mt-3 text-sm text-muted">{t('kids.registryEmpty')}</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {aggregate.map((b) => (
                <span key={b.bucket} className="rounded-full bg-surface-2 px-3 py-1 text-sm">
                  <strong>{b.count}</strong> {t('kids.bucketLabel', { range: b.bucket })}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">{t('kids.totalKids', { count: total })}</p>
          </>
        )}

        {mine.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              {t('kids.mine')}
            </p>
            <div className="flex flex-wrap gap-2">
              {mine.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"
                >
                  {r.count}× {t('kids.bucketLabel', { range: r.bucket })}
                  <button
                    type="button"
                    onClick={() => setPendingRemoveRange({ bucket: r.bucket, userId: userId ?? 'u-res' })}
                    aria-label={t('kids.removeRange')}
                    className="text-muted hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Activities */}
      <h2 className="mb-3 font-semibold">{t('kids.activitiesTitle')}</h2>
      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState body={t('kids.eventsEmpty')} icon={<ToyBrick className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {upcoming.map((e) => renderEvent(e, false))}
          {past.length > 0 && (
            <>
              <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted">
                {t('kids.pastActivities')}
              </p>
              {past.map((e) => renderEvent(e, true))}
            </>
          )}
        </div>
      )}

      {/* Confirm remove event */}
      <Modal
        open={pendingRemoveEventId !== null}
        onClose={() => setPendingRemoveEventId(null)}
        title={t('kids.removeEventTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingRemoveEventId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (asociatieId && pendingRemoveEventId) {
                  removeEvent(asociatieId, pendingRemoveEventId);
                  setPendingRemoveEventId(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </>
        }
      >
        <p>{t('kids.removeEventConfirm')}</p>
      </Modal>

      {/* Confirm remove age range */}
      <Modal
        open={pendingRemoveRange !== null}
        onClose={() => setPendingRemoveRange(null)}
        title={t('kids.removeRangeTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingRemoveRange(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (asociatieId && pendingRemoveRange) {
                  removeRange(asociatieId, pendingRemoveRange.userId, pendingRemoveRange.bucket);
                  setPendingRemoveRange(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </>
        }
      >
        <p>{t('kids.removeRangeConfirm')}</p>
      </Modal>

      {/* Register kids modal */}
      <Modal
        open={regOpen}
        onClose={() => setRegOpen(false)}
        title={t('kids.registerKids')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRegOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitRegistration} disabled={!regValid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">{t('kids.registerHint')}</p>
          <Select
            label={t('kids.ageBucket')}
            value={bucket}
            onChange={(e) => setBucket(e.target.value as KidsAgeBucket)}
          >
            {AGE_BUCKETS.map((b) => (
              <option key={b} value={b}>
                {t('kids.bucketLabel', { range: b })}
              </option>
            ))}
          </Select>
          <Input
            label={t('kids.count')}
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </div>
      </Modal>

      {/* Add / edit activity modal */}
      <Modal
        open={evtOpen}
        onClose={closeEvtModal}
        title={editingEvent ? t('kids.editEvent') : t('kids.addEvent')}
        footer={
          <>
            <Button variant="ghost" onClick={closeEvtModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitEvent} disabled={!evtValid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label={t('kids.eventTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('kids.eventTitleHint')}
          />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label={t('kids.date')} value={date} onChange={(v) => setDate(v)} />
            <Input label={t('kids.time')} value={time} onChange={(e) => setTime(e.target.value)} placeholder="17:00" />
          </div>
          <Input
            label={t('kids.location')}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('kids.locationHint')}
          />
          <Select
            label={t('kids.targetAge')}
            value={evtBucket}
            onChange={(e) => setEvtBucket(e.target.value as KidsAgeBucket | 'all')}
          >
            {EVENT_BUCKETS.map((b) => (
              <option key={b} value={b}>
                {b === 'all' ? t('kids.allAges') : t('kids.bucketLabel', { range: b })}
              </option>
            ))}
          </Select>
          <Textarea
            label={t('kids.note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('kids.noteHint')}
          />
        </div>
      </Modal>
    </div>
  );
}
