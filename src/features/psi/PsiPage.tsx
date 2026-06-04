import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Flame, Plus, CheckCircle2 } from 'lucide-react';
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
import { usePsiStore, useAsociatiePsiAssets } from './psiStore';
import { hydratePsiAssets, addPsiAssetLive, markPsiCheckedLive } from './psiApi';
import { countDue, isValidAsset, psiStatus, sortByNextCheck, type PsiStatus } from './psiLogic';

function defaultNextCheck(): string {
  const d = new Date();
  d.setDate(d.getDate() + 365);
  return d.toISOString().slice(0, 10);
}

const TONE: Record<PsiStatus, 'danger' | 'warning' | 'success'> = {
  overdue: 'danger',
  due_soon: 'warning',
  ok: 'success',
};

export default function PsiPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId ?? 'demo-asoc');
  const fetchError = usePsiStore((s) => s.fetchError);
  const assets = useAsociatiePsiAssets();

  const [open, setOpen] = useState(false);
  const [asset, setAsset] = useState('');
  const [kind, setKind] = useState('');
  const [location, setLocation] = useState('');
  const [nextCheck, setNextCheck] = useState(defaultNextCheck());

  useEffect(() => {
    void hydratePsiAssets(asociatieId);
  }, [asociatieId]);

  const sorted = sortByNextCheck(assets);
  const due = countDue(assets);
  const valid = isValidAsset(asset, nextCheck);

  const submit = () => {
    if (!valid) return;
    const newAsset = {
      id: `psi-${Date.now()}`,
      asociatie_id: asociatieId,
      asset: asset.trim(),
      kind: kind.trim() || 'Altele',
      location: location.trim() || null,
      next_check: nextCheck,
    };
    addPsiAssetLive(asociatieId, newAsset);
    toast.success(t('psi.added'));
    setOpen(false);
    setAsset('');
    setKind('');
    setLocation('');
    setNextCheck(defaultNextCheck());
  };

  const onChecked = (id: string) => {
    const newDate = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
    markPsiCheckedLive(asociatieId, id, newDate);
    toast.success(t('psi.markedChecked'));
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => void hydratePsiAssets(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('psi.title')}
        subtitle={t('psi.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('psi.new')}
          </Button>
        }
      />

      {due > 0 && (
        <Card className="mb-4 border-warning/40 bg-warning/10 p-3 text-sm text-text">
          {t('psi.dueBanner', { n: due })}
        </Card>
      )}

      {sorted.length === 0 ? (
        <EmptyState body={t('psi.empty')} icon={<Flame className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => {
            const status = psiStatus(a.next_check);
            return (
              <Card key={a.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{a.asset}</p>
                    <p className="text-sm text-muted">{a.kind}{a.location && ` · ${a.location}`}</p>
                  </div>
                  <Badge tone={TONE[status]}>{t(`psi.status_${status}`)}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-sm text-muted">
                    {t('psi.nextCheck', { date: formatDate(a.next_check) })}
                  </span>
                  <Button variant="ghost" onClick={() => onChecked(a.id)}>
                    <CheckCircle2 className="h-4 w-4" /> {t('psi.markChecked')}
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
        title={t('psi.new')}
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
          <Input label={t('psi.asset')} value={asset} onChange={(e) => setAsset(e.target.value)} />
          <Input label={t('psi.kind')} value={kind} onChange={(e) => setKind(e.target.value)} />
          <Input label={t('psi.location')} value={location} onChange={(e) => setLocation(e.target.value)} />
          <DatePicker label={t('psi.nextCheck2')} value={nextCheck} onChange={(v) => setNextCheck(v)} />
        </div>
      </Modal>
    </div>
  );
}
