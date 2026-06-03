import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Zap, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatLei } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useEnergyStore, useAsociatieEnergy } from './energyStore';
import { hydrateEnergy, addEnergyRecordLive } from './energyApi';
import {
  ENERGY_KINDS,
  formatPeriod,
  isValidEnergyRecord,
  sortedRecords,
  totalCost,
  totalsByKind,
} from './energyLogic';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function EnergyPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useEnergyStore((s) => s.fetchError);
  const records = useAsociatieEnergy();

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [kind, setKind] = useState<string>(ENERGY_KINDS[0]);
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateEnergy(asociatieId);
  }, [asociatieId]);

  const amountNum = Number(amount.replace(',', '.'));
  const costNum = Number(cost.replace(',', '.'));
  const valid = month !== '' && isValidEnergyRecord(amountNum, costNum);

  const rows = sortedRecords(records);
  const byKind = totalsByKind(records);

  const submit = () => {
    if (!valid || !asociatieId) return;
    const record = {
      id: `en-${Date.now()}`,
      asociatie_id: asociatieId,
      period: `${month}-01`,
      kind,
      amount: amountNum,
      cost: costNum,
    };
    addEnergyRecordLive(asociatieId, record);
    toast.success(t('energy.added'));
    setOpen(false);
    setAmount('');
    setCost('');
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateEnergy(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('energy.title')}
        subtitle={t('energy.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('energy.new')}
          </Button>
        }
      />

      {records.length > 0 && (
        <Card className="mb-4 space-y-2 p-4">
          <p className="text-sm text-muted">{t('energy.totalLabel')}</p>
          <p className="text-2xl font-semibold">{formatLei(totalCost(records))}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted">
            {Object.entries(byKind).map(([k, v]) => (
              <span key={k}>
                {k}: {formatLei(v.cost)}
              </span>
            ))}
          </div>
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState body={t('energy.empty')} icon={<Zap className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{r.kind}</p>
                <p className="text-sm text-muted">{formatPeriod(r.period)}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatLei(r.cost)}</p>
                <p className="text-sm text-muted">{t('energy.amountUnit', { amount: r.amount })}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('energy.new')}
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
        <div className="space-y-4">
          <Input
            label={t('energy.period')}
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Select label={t('energy.kind')} value={kind} onChange={(e) => setKind(e.target.value)}>
            {ENERGY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
          <Input
            label={t('energy.amount')}
            hint={t('energy.amountHint')}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label={t('energy.cost')}
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
