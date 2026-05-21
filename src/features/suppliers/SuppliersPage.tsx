import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Building2, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useSuppliersStore } from './suppliersStore';
import {
  contractStatus,
  countContractAlerts,
  isValidSupplier,
  sortByContractEnd,
  type ContractStatus,
} from './supplierLogic';

const STATUS_TONE: Record<ContractStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
  none: 'neutral',
};

export default function SuppliersPage() {
  const { t } = useTranslation();
  const { suppliers, add } = useSuppliersStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('');
  const [contact, setContact] = useState('');
  const [contractEnd, setContractEnd] = useState('');

  const ordered = sortByContractEnd(suppliers);
  const alerts = countContractAlerts(suppliers);
  const valid = isValidSupplier(name, kind);

  const submit = () => {
    if (!valid) return;
    add({ name, kind, contact, contract_end: contractEnd });
    toast.success(t('suppliers.added'));
    setOpen(false);
    setName('');
    setKind('');
    setContact('');
    setContractEnd('');
  };

  return (
    <div>
      <PageHeader
        title={t('suppliers.title')}
        subtitle={t('suppliers.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('suppliers.new')}
          </Button>
        }
      />

      {alerts > 0 && (
        <Card className="mb-4 border-warning/40 bg-warning/5 p-3 text-sm text-text">
          {t('suppliers.alertSummary', { count: alerts })}
        </Card>
      )}

      {ordered.length === 0 ? (
        <EmptyState body={t('suppliers.empty')} icon={<Building2 className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((s) => {
            const status = contractStatus(s.contract_end);
            return (
              <Card key={s.id} className="space-y-1 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted">{s.kind}</p>
                  </div>
                  {status !== 'none' && (
                    <Badge tone={STATUS_TONE[status]}>{t(`suppliers.status_${status}`)}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted">
                  {s.contact && `${s.contact} · `}
                  {s.contract_end
                    ? t('suppliers.contractUntil', { date: formatDate(s.contract_end) })
                    : t('suppliers.noContractDate')}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('suppliers.new')}
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
          <Input label={t('suppliers.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label={t('suppliers.kind')}
            placeholder={t('suppliers.kindHint')}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          />
          <Input label={t('suppliers.contact')} value={contact} onChange={(e) => setContact(e.target.value)} />
          <Input
            label={t('suppliers.contractEnd')}
            type="date"
            value={contractEnd}
            onChange={(e) => setContractEnd(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
