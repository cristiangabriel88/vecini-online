import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Gauge, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Modal } from '@/shared/components/Modal';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { formatDate } from '@/shared/lib/format';
import type { Meter } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useMetersStore, useAsociatieMeters } from './metersStore';
import { validateReading, isAnomaly, EXPECTED_MONTHLY } from './meterLogic';
import { hydrateMeters, submitMeterReading } from './metersApi';

export default function MetersPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const fetchError = useMetersStore((s) => s.fetchError);
  const { meters, readings } = useAsociatieMeters();

  const [active, setActive] = useState<Meter | null>(null);
  const [raw, setRaw] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateMeters(asociatieId);
  }, [asociatieId]);

  const lastReadingDate = (meterId: string) =>
    readings.find((r) => r.meter_id === meterId)?.reading_date ?? null;

  const value = Number(raw.replace(',', '.'));
  const validation = active ? validateReading(value, active.last_value) : ({ ok: true } as const);
  const anomaly =
    active && validation.ok && raw.trim() !== ''
      ? isAnomaly(value, active.last_value, EXPECTED_MONTHLY[active.kind])
      : false;

  const onSubmit = () => {
    if (!active || !validation.ok || raw.trim() === '' || !asociatieId) return;
    submitMeterReading(asociatieId, active.id, value, userId);
    toast.success(t('meters.submitted'));
    setActive(null);
    setRaw('');
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateMeters(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title={t('meters.title')} subtitle={t('meters.subtitle')} />

      {meters.length === 0 ? (
        <EmptyState body={t('meters.empty')} icon={<Gauge className="h-10 w-10" />} />
      ) : (
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
      )}

      <Modal open={!!active}
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
