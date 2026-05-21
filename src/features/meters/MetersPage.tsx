import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Gauge, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Modal } from '@/shared/components/Modal';
import { Input } from '@/shared/components/Input';
import { formatDate } from '@/shared/lib/format';
import type { Meter } from '@/shared/types/domain';
import { useMetersStore } from './metersStore';
import { validateReading, isAnomaly, EXPECTED_MONTHLY } from './meterLogic';

export default function MetersPage() {
  const { t } = useTranslation();
  const { meters, readings, submit } = useMetersStore();
  const [active, setActive] = useState<Meter | null>(null);
  const [raw, setRaw] = useState('');

  const lastReadingDate = (meterId: string) =>
    readings.find((r) => r.meter_id === meterId)?.reading_date ?? null;

  const value = Number(raw.replace(',', '.'));
  const validation = active ? validateReading(value, active.last_value) : ({ ok: true } as const);
  const anomaly =
    active && validation.ok && raw.trim() !== ''
      ? isAnomaly(value, active.last_value, EXPECTED_MONTHLY[active.kind])
      : false;

  const onSubmit = () => {
    if (!active || !validation.ok || raw.trim() === '') return;
    submit(active.id, value);
    toast.success(t('meters.submitted'));
    setActive(null);
    setRaw('');
  };

  return (
    <div>
      <PageHeader title={t('meters.title')} subtitle={t('meters.subtitle')} />

      <div className="space-y-3">
        {meters.map((m) => (
          <Card key={m.id} className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <Gauge className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">{t(`meters.kind_${m.kind}`)}</p>
                <p className="text-sm text-muted">
                  {t('meters.serial')}: {m.serial} · {t('meters.lastIndex')}: {m.last_value}
                  {lastReadingDate(m.id) && ` (${formatDate(lastReadingDate(m.id)!)})`}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setActive(m);
                setRaw('');
              }}
            >
              {t('meters.submit')}
            </Button>
          </Card>
        ))}
      </div>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? t(`meters.kind_${active.kind}`) : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setActive(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onSubmit} disabled={!validation.ok || raw.trim() === ''}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {active && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {t('meters.previous', { value: active.last_value })}
            </p>
            <Input
              label={t('meters.newIndex')}
              inputMode="decimal"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              error={!validation.ok ? t('meters.errorBelowPrevious') : undefined}
            />
            {anomaly && (
              <p className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t('meters.anomaly')}
              </p>
            )}
            <Badge tone="neutral">{t('meters.window')}</Badge>
          </div>
        )}
      </Modal>
    </div>
  );
}
