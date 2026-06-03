import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Wrench, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatDate, formatLei } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import type { RepairRecord, RepairSystem } from '@/shared/types/domain';
import { searchRepairs, warrantyStatus, canManageRepairs, newRepairRecord, type WarrantyStatus } from './repairLogic';
import { useRepairRecordsStore, useAsociatieRepairs } from './repairRecordsStore';
import { hydrateRepairs, addRepair } from './repairRecordsApi';

const SYSTEMS: RepairSystem[] = ['apa', 'electric', 'lift', 'incalzire', 'structura', 'altele'];
const warrantyTone: Record<WarrantyStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
  none: 'neutral',
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RepairsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const role = useAuthStore((s) => s.activeRole());
  const fetchError = useRepairRecordsStore((s) => s.fetchError);
  const records = useAsociatieRepairs();

  const canManage = canManageRepairs(role);

  const [query, setQuery] = useState('');
  const [system, setSystem] = useState<RepairSystem | 'all'>('all');

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [sys, setSys] = useState<RepairSystem>('altele');
  const [desc, setDesc] = useState('');
  const [contractor, setContractor] = useState('');
  const [cost, setCost] = useState('');
  const [warrantyUntil, setWarrantyUntil] = useState('');
  const [performedAt, setPerformedAt] = useState(todayStr());

  useEffect(() => {
    if (asociatieId) void hydrateRepairs(asociatieId);
  }, [asociatieId]);

  const results = searchRepairs(records, query, system).sort(
    (a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime(),
  );

  const valid = title.trim().length >= 2 && performedAt.length > 0;

  const resetForm = () => {
    setTitle('');
    setSys('altele');
    setDesc('');
    setContractor('');
    setCost('');
    setWarrantyUntil('');
    setPerformedAt(todayStr());
  };

  const onSubmit = () => {
    if (!valid || !asociatieId) return;
    const record = newRepairRecord(
      { title, system: sys, description: desc, contractor, cost, warrantyUntil, performedAt },
      asociatieId,
    );
    addRepair(asociatieId, record);
    toast.success(t('repairs.added'));
    setOpen(false);
    resetForm();
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateRepairs(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('repairs.title')}
        subtitle={t('repairs.subtitle')}
        action={
          canManage ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t('repairs.new')}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          aria-label={t('common.search')}
          placeholder={t('repairs.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          aria-label={t('repairs.system')}
          value={system}
          onChange={(e) => setSystem(e.target.value as RepairSystem | 'all')}
        >
          <option value="all">{t('common.all')}</option>
          {SYSTEMS.map((s) => (
            <option key={s} value={s}>
              {t(`repairs.system_${s}`)}
            </option>
          ))}
        </Select>
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('repairs.empty')} icon={<Wrench className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((r: RepairRecord) => {
            const w = warrantyStatus(r.warranty_until);
            return (
              <Card key={r.id}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{r.title}</h2>
                  <Badge tone="primary">{t(`repairs.system_${r.system}`)}</Badge>
                </div>
                <p className="mb-2 whitespace-pre-line text-text">{r.description}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted sm:grid-cols-4">
                  <div>
                    <dt className="font-medium text-text">{t('repairs.performedAt')}</dt>
                    <dd>{formatDate(r.performed_at)}</dd>
                  </div>
                  {r.contractor && (
                    <div>
                      <dt className="font-medium text-text">{t('repairs.contractor')}</dt>
                      <dd>{r.contractor}</dd>
                    </div>
                  )}
                  {r.cost != null && (
                    <div>
                      <dt className="font-medium text-text">{t('repairs.cost')}</dt>
                      <dd>{formatLei(r.cost)}</dd>
                    </div>
                  )}
                  {r.warranty_until && (
                    <div>
                      <dt className="font-medium text-text">{t('repairs.warranty')}</dt>
                      <dd>
                        <Badge tone={warrantyTone[w]}>
                          {formatDate(r.warranty_until)} · {t(`repairs.warranty_${w}`)}
                        </Badge>
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        title={t('repairs.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onSubmit} disabled={!valid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label={t('repairs.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select
            aria-label={t('repairs.system')}
            value={sys}
            onChange={(e) => setSys(e.target.value as RepairSystem)}
          >
            {SYSTEMS.map((s) => (
              <option key={s} value={s}>{t(`repairs.system_${s}`)}</option>
            ))}
          </Select>
          <Textarea label={t('repairs.descriptionLabel')} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Input label={t('repairs.contractorLabel')} value={contractor} onChange={(e) => setContractor(e.target.value)} />
          <Input label={t('repairs.costLabel')} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
          <Input label={t('repairs.performedAtLabel')} type="date" value={performedAt} onChange={(e) => setPerformedAt(e.target.value)} />
          <Input label={t('repairs.warrantyUntilLabel')} type="date" value={warrantyUntil} onChange={(e) => setWarrantyUntil(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
