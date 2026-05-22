import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Truck, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useMovingStore, DEMO_USER } from './movingStore';
import { MOVING_SLOTS, isSlotTaken, isValidBooking, sortBookings } from './movingLogic';

const today = () => new Date().toISOString().slice(0, 10);

export default function MovingPage() {
  const { t } = useTranslation();
  const { bookings, book, cancel } = useMovingStore();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today());
  const [slot, setSlot] = useState(MOVING_SLOTS[0]);
  const [floor, setFloor] = useState('');

  const ordered = sortBookings(bookings);
  const taken = isSlotTaken(bookings, date, slot);
  const valid = isValidBooking(date, slot, floor) && !taken;

  const submit = () => {
    if (!valid) return;
    book(date, slot, floor);
    toast.success(t('moving.booked'));
    setFloor('');
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={t('moving.title')}
        subtitle={t('moving.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('moving.book')}
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('moving.empty')} icon={<Truck className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((b) => {
            const mine = b.user_id === DEMO_USER.id;
            return (
              <Card key={b.id} className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">
                    {formatDate(b.date)} · {b.slot}
                  </p>
                  <p className="text-sm text-muted">{t('moving.floorLabel', { floor: b.floor })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {mine ? (
                    <>
                      <Badge tone="primary">{t('moving.mine')}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => cancel(b.id)}>
                        {t('moving.cancel')}
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
        title={t('moving.book')}
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
          <Input label={t('moving.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label={t('moving.slot')} value={slot} onChange={(e) => setSlot(e.target.value)}>
            {MOVING_SLOTS.map((sl) => (
              <option key={sl} value={sl}>
                {sl}
              </option>
            ))}
          </Select>
          <Input
            label={t('moving.floor')}
            type="number"
            inputMode="numeric"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
          />
          {taken && <p className="text-sm text-danger">{t('moving.taken')}</p>}
        </div>
      </Modal>
    </div>
  );
}
