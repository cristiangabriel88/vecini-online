import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { BellRing, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import { useAlarmStore } from './alarmStore';
import {
  attentionCount,
  daysSinceTest,
  isValidSystem,
  sortSystems,
  statusTone,
} from './alarmLogic';

export default function AlarmPage() {
  const { t } = useTranslation();
  const { systems, add, logTest, reportFault } = useAlarmStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const today = new Date().toISOString();
  const ordered = sortSystems(systems, today);
  const attention = attentionCount(systems, today);
  const valid = isValidSystem(name);

  const submit = () => {
    if (!valid) return;
    add(name);
    toast.success(t('alarm.added'));
    setOpen(false);
    setName('');
  };

  return (
    <div>
      <PageHeader
        title={t('alarm.title')}
        subtitle={t('alarm.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('alarm.new')}
          </Button>
        }
      />

      {attention > 0 && (
        <Card className="mb-3 bg-warning/10 p-3 text-sm text-warning">
          {t('alarm.attentionBanner', { count: attention })}
        </Card>
      )}

      {ordered.length === 0 ? (
        <EmptyState body={t('alarm.empty')} icon={<BellRing className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((sys) => {
            const days = daysSinceTest(sys, today);
            return (
              <Card key={sys.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{sys.name}</p>
                  <Badge tone={statusTone(sys.status)}>{t(`alarm.status_${sys.status}`)}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {sys.last_test
                    ? t('alarm.lastTest', { date: formatDate(sys.last_test), days })
                    : t('alarm.neverTested')}
                </p>
                {sys.events.length > 0 && (
                  <ul className="space-y-1 text-sm text-muted">
                    {sys.events.slice(0, 3).map((e) => (
                      <li key={e.id}>
                        {e.kind} · {formatDateTime(e.occurred_at)}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => logTest(sys.id)}>
                    {t('alarm.logTest')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => reportFault(sys.id)}>
                    {t('alarm.reportFault')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('alarm.new')}
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
        <Input label={t('alarm.name')} value={name} onChange={(e) => setName(e.target.value)} />
      </Modal>
    </div>
  );
}
