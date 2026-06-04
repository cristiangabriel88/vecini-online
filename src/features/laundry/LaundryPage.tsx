import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { WashingMachine, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { DatePicker } from '@/shared/components/DatePicker';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useLaundryStore, LAUNDRY_RESOURCES, DEMO_USER } from './laundryStore';
import { LAUNDRY_SLOTS, isSlotTaken, isValidBooking, sortBookings } from './laundryLogic';

const today = () => new Date().toISOString().slice(0, 10);

export default function LaundryPage() {
  const { t } = useTranslation();
  const { bookings, book, cancel } = useLaundryStore();
  const [open, setOpen] = useState(false);
  const [resource, setResource] = useState(LAUNDRY_RESOURCES[0]);
  const [date, setDate] = useState(today());
  const [slot, setSlot] = useState(LAUNDRY_SLOTS[0]);

  const ordered = sortBookings(bookings);
  const taken = isSlotTaken(bookings, resource, date, slot);
  const valid = isValidBooking(resource, date, slot) && !taken;

  const submit = () => {
    if (!valid) return;
    book(resource, date, slot);
    toast.success(t('laundry.booked'));
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={t('laundry.title')}
        subtitle={t('laundry.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('laundry.book')}
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('laundry.empty')} icon={<WashingMachine className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((b) => {
            const mine = b.user_id === DEMO_USER.id;
            return (
              <Card key={b.id} className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{b.resource}</p>
                  <p className="text-sm text-muted">
                    {formatDate(b.date)} · {b.slot}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {mine ? (
                    <>
                      <Badge tone="primary">{t('laundry.mine')}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => cancel(b.id)}>
                        {t('laundry.cancel')}
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
        title={t('laundry.book')}
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
          <Select label={t('laundry.resource')} value={resource} onChange={(e) => setResource(e.target.value)}>
            {LAUNDRY_RESOURCES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <DatePicker label={t('laundry.date')} value={date} onChange={(v) => setDate(v)} />
          <Select label={t('laundry.slot')} value={slot} onChange={(e) => setSlot(e.target.value)}>
            {LAUNDRY_SLOTS.map((sl) => (
              <option key={sl} value={sl}>
                {sl}
              </option>
            ))}
          </Select>
          {taken && <p className="text-sm text-danger">{t('laundry.taken')}</p>}
        </div>
      </Modal>
    </div>
  );
}
