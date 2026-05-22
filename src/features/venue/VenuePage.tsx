import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { PartyPopper, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useVenueStore, DEMO_USER } from './venueStore';
import { VENUES, VENUE_SLOTS, isSlotTaken, isValidBooking, sortBookings } from './venueLogic';

const today = () => new Date().toISOString().slice(0, 10);

export default function VenuePage() {
  const { t } = useTranslation();
  const { bookings, book, cancel } = useVenueStore();
  const [open, setOpen] = useState(false);
  const [venue, setVenue] = useState(VENUES[0]);
  const [date, setDate] = useState(today());
  const [slot, setSlot] = useState(VENUE_SLOTS[0]);
  const [purpose, setPurpose] = useState('');

  const ordered = sortBookings(bookings);
  const taken = isSlotTaken(bookings, venue, date, slot);
  const valid = isValidBooking(venue, date, slot, purpose) && !taken;

  const submit = () => {
    if (!valid) return;
    book(venue, date, slot, purpose);
    toast.success(t('venue.booked'));
    setPurpose('');
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={t('venue.title')}
        subtitle={t('venue.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('venue.book')}
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('venue.empty')} icon={<PartyPopper className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((b) => {
            const mine = b.user_id === DEMO_USER.id;
            return (
              <Card key={b.id} className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">
                    {b.venue} · {formatDate(b.date)} · {b.slot}
                  </p>
                  <p className="text-sm text-muted">{b.purpose}</p>
                </div>
                <div className="flex items-center gap-2">
                  {mine ? (
                    <>
                      <Badge tone="primary">{t('venue.mine')}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => cancel(b.id)}>
                        {t('venue.cancel')}
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-muted">{b.user_name}</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('venue.book')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select label={t('venue.venue')} value={venue} onChange={(e) => setVenue(e.target.value)}>
            {VENUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
          <Input label={t('venue.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label={t('venue.slot')} value={slot} onChange={(e) => setSlot(e.target.value)}>
            {VENUE_SLOTS.map((sl) => (
              <option key={sl} value={sl}>
                {sl}
              </option>
            ))}
          </Select>
          <Input
            label={t('venue.purpose')}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder={t('venue.purposeHint')}
          />
          {taken && <p className="text-sm text-danger">{t('venue.taken')}</p>}
        </div>
      </Modal>
    </div>
  );
}
