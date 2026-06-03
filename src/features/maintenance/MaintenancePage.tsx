import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CalendarClock, Plus, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useMaintenanceStore, useAsociatieMaintenance } from './maintenanceStore';
import {
  isValidMaintenance,
  maintenanceStatus,
  sortByNextDue,
  type MaintenanceStatus,
} from './maintenanceLogic';
import { hydrateMaintenance, addMaintenanceItem, markMaintenanceDone } from './scheduledMaintenanceApi';

function defaultNextDue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

const TONE: Record<MaintenanceStatus, 'danger' | 'warning' | 'success'> = {
  overdue: 'danger',
  due_soon: 'warning',
  scheduled: 'success',
};

export default function MaintenancePage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useMaintenanceStore((s) => s.fetchError);
  const items = useAsociatieMaintenance();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState('');
  const [recurrence, setRecurrence] = useState('Anual');
  const [nextDue, setNextDue] = useState(defaultNextDue());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateMaintenance(asociatieId);
  }, [asociatieId]);

  const sorted = sortByNextDue(items);
  const valid = isValidMaintenance(title, nextDue);

  const resetForm = () => {
    setTitle('');
    setVendor('');
    setRecurrence('Anual');
    setNextDue(defaultNextDue());
    setNotes('');
  };

  const submit = () => {
    if (!valid || !asociatieId) return;
    addMaintenanceItem(asociatieId, { title, vendor, recurrence, nextDue, notes });
    toast.success(t('maintenance.added'));
    setOpen(false);
    resetForm();
  };

  const onDone = (id: string) => {
    if (!asociatieId) return;
    markMaintenanceDone(asociatieId, id, 365);
    toast.success(t('maintenance.markedDone'));
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateMaintenance(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('maintenance.title')}
        subtitle={t('maintenance.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('maintenance.new')}
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState body={t('maintenance.empty')} icon={<CalendarClock className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {sorted.map((m) => {
            const status = maintenanceStatus(m.next_due);
            return (
              <Card key={m.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    {m.vendor && <p className="text-sm text-muted">{m.vendor} · {m.recurrence}</p>}
                  </div>
                  <Badge tone={TONE[status]}>{t(`maintenance.status_${status}`)}</Badge>
                </div>
                {m.notes && <p className="text-sm text-text">{m.notes}</p>}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-sm text-muted">
                    {t('maintenance.nextDue', { date: formatDate(m.next_due) })}
                  </span>
                  <Button variant="ghost" onClick={() => onDone(m.id)}>
                    <CheckCircle2 className="h-4 w-4" /> {t('maintenance.markDone')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); resetForm(); }}
        title={t('maintenance.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label={t('maintenance.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label={t('maintenance.vendor')} value={vendor} onChange={(e) => setVendor(e.target.value)} />
          <Input label={t('maintenance.recurrence')} value={recurrence} onChange={(e) => setRecurrence(e.target.value)} />
          <Input label={t('maintenance.nextDue2')} type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
          <Textarea label={t('maintenance.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
