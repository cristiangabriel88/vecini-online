import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { BadgeCheck, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useWarrantiesStore, useAsociatieWarranties } from './warrantiesStore';
import { hydrateWarranties, addWarrantyLive } from './warrantiesApi';
import {
  computeExpiry,
  isValidWarranty,
  sortByExpiry,
  warrantyStatus,
  type WarrantyStatus,
} from './warrantyLogic';

const TONE: Record<WarrantyStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
  none: 'neutral',
};

export default function WarrantiesPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useWarrantiesStore((s) => s.fetchError);
  const warranties = useAsociatieWarranties();

  const [open, setOpen] = useState(false);
  const [asset, setAsset] = useState('');
  const [purchasedAt, setPurchasedAt] = useState('');
  const [months, setMonths] = useState('24');

  useEffect(() => {
    if (asociatieId) void hydrateWarranties(asociatieId);
  }, [asociatieId]);

  const monthsNum = Number(months);
  const valid = isValidWarranty(asset, purchasedAt, monthsNum);
  const ordered = sortByExpiry(warranties);

  const submit = () => {
    if (!valid || !asociatieId) return;
    const warranty = {
      id: `wr-${Date.now()}`,
      asociatie_id: asociatieId,
      asset: asset.trim(),
      purchased_at: purchasedAt,
      warranty_months: monthsNum,
      expires_at: computeExpiry(purchasedAt, monthsNum),
      document_path: null,
    };
    addWarrantyLive(asociatieId, warranty);
    toast.success(t('warranties.added'));
    setOpen(false);
    setAsset('');
    setPurchasedAt('');
    setMonths('24');
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateWarranties(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('warranties.title')}
        subtitle={t('warranties.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('warranties.new')}
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('warranties.empty')} icon={<BadgeCheck className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((w) => {
            const status = warrantyStatus(w.expires_at);
            return (
              <Card key={w.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{w.asset}</p>
                  <p className="text-sm text-muted">
                    {t('warranties.expiresOn', { date: formatDate(w.expires_at) })} ·{' '}
                    {t('warranties.months', { count: w.warranty_months })}
                  </p>
                </div>
                <Badge tone={TONE[status]}>{t(`warranties.status_${status}`)}</Badge>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('warranties.new')}
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
          <Input label={t('warranties.asset')} value={asset} onChange={(e) => setAsset(e.target.value)} />
          <Input
            label={t('warranties.purchasedAt')}
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
          />
          <Input
            label={t('warranties.warrantyMonths')}
            type="number"
            inputMode="numeric"
            min={1}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
