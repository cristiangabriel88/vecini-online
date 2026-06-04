import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Umbrella, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { DatePicker } from '@/shared/components/DatePicker';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useInsuranceStore, useAsociatieInsurance } from './insuranceStore';
import { hydrateInsurance, addInsurancePolicyLive } from './insuranceApi';
import { countExpiring, isValidPolicy, policyStatus, sortByExpiry, type PolicyStatus } from './insuranceLogic';

function defaultExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

const TONE: Record<PolicyStatus, 'danger' | 'warning' | 'success'> = {
  expired: 'danger',
  expiring: 'warning',
  active: 'success',
};

export default function InsurancePage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId ?? 'demo-asoc');
  const fetchError = useInsuranceStore((s) => s.fetchError);
  const policies = useAsociatieInsurance();

  const [open, setOpen] = useState(false);
  const [insurer, setInsurer] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [expiresAt, setExpiresAt] = useState(defaultExpiry());

  useEffect(() => {
    void hydrateInsurance(asociatieId);
  }, [asociatieId]);

  const sorted = sortByExpiry(policies);
  const expiring = countExpiring(policies);
  const valid = isValidPolicy(insurer, policyNumber, expiresAt);

  const submit = () => {
    if (!valid) return;
    addInsurancePolicyLive(asociatieId, {
      id: `ins-${Date.now()}`,
      asociatie_id: asociatieId,
      insurer: insurer.trim(),
      policy_number: policyNumber.trim(),
      expires_at: expiresAt,
      document_path: null,
    });
    toast.success(t('insurance.added'));
    setOpen(false);
    setInsurer('');
    setPolicyNumber('');
    setExpiresAt(defaultExpiry());
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => void hydrateInsurance(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('insurance.title')}
        subtitle={t('insurance.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('insurance.new')}
          </Button>
        }
      />

      {expiring > 0 && (
        <Card className="mb-4 border-warning/40 bg-warning/10 p-3 text-sm text-text">
          {t('insurance.renewBanner', { n: expiring })}
        </Card>
      )}

      {sorted.length === 0 ? (
        <EmptyState body={t('insurance.empty')} icon={<Umbrella className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => {
            const status = policyStatus(p.expires_at);
            return (
              <Card key={p.id} className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{p.insurer}</p>
                  <p className="text-sm text-muted">{t('insurance.policyNo', { n: p.policy_number })}</p>
                  <p className="text-sm text-muted">{t('insurance.expiresOn', { date: formatDate(p.expires_at) })}</p>
                </div>
                <Badge tone={TONE[status]}>{t(`insurance.status_${status}`)}</Badge>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('insurance.new')}
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
          <Input label={t('insurance.insurer')} value={insurer} onChange={(e) => setInsurer(e.target.value)} />
          <Input label={t('insurance.policyNumber')} value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          <DatePicker label={t('insurance.expiresAt')} value={expiresAt} onChange={(v) => setExpiresAt(v)} />
        </div>
      </Modal>
    </div>
  );
}
