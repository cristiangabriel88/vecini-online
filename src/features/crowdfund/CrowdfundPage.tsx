import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HandCoins, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { DatePicker } from '@/shared/components/DatePicker';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatLei, formatDate } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useCrowdfundStore, useAsociatieCrowdfunds } from './crowdfundStore';
import { hydrateCrowdfunds, createCrowdfundLive, pledgeLive } from './crowdfundApi';
import {
  fundedRatio,
  isFunded,
  isOpen,
  isValidCrowdfund,
  isValidPledge,
  sortCrowdfunds,
} from './crowdfundLogic';

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function CrowdfundCreateModal({
  open,
  onClose,
  asociatieId,
}: {
  open: boolean;
  onClose: () => void;
  asociatieId: string;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline());

  const valid = isValidCrowdfund(title, Number(target));

  const submit = () => {
    if (!valid) return;
    const fund = {
      id: `cf-${Date.now()}`,
      asociatie_id: asociatieId,
      title: title.trim(),
      description: description.trim(),
      target_amount: Number(target),
      deadline,
      created_at: new Date().toISOString(),
      pledged: 0,
    };
    createCrowdfundLive(asociatieId, fund);
    toast.success(t('crowdfund.created'));
    setTitle('');
    setDescription('');
    setTarget('');
    setDeadline(defaultDeadline());
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('crowdfund.new')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!valid}>
            {t('common.publish')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('crowdfund.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label={t('crowdfund.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input label={t('crowdfund.target')} type="number" min={0} value={target} onChange={(e) => setTarget(e.target.value)} />
        <DatePicker label={t('crowdfund.deadline')} value={deadline} onChange={(v) => setDeadline(v)} />
      </div>
    </Modal>
  );
}

function CrowdfundPledgeModal({
  pledgeId,
  onClose,
  asociatieId,
  userId,
}: {
  pledgeId: string | null;
  onClose: () => void;
  asociatieId: string;
  userId: string;
}) {
  const { t } = useTranslation();
  const [pledgeAmount, setPledgeAmount] = useState('');

  const pledgeValid = isValidPledge(Number(pledgeAmount));

  const submit = () => {
    if (!pledgeId || !pledgeValid) return;
    pledgeLive(asociatieId, pledgeId, Number(pledgeAmount), userId);
    toast.success(t('crowdfund.pledged'));
    setPledgeAmount('');
    onClose();
  };

  return (
    <Modal
      open={pledgeId !== null}
      onClose={onClose}
      title={t('crowdfund.pledge')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!pledgeValid}>
            {t('crowdfund.pledge')}
          </Button>
        </>
      }
    >
      <Input
        label={t('crowdfund.amount')}
        type="number"
        min={0}
        value={pledgeAmount}
        onChange={(e) => setPledgeAmount(e.target.value)}
      />
    </Modal>
  );
}

export default function CrowdfundPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.session?.user?.id ?? '');
  const fetchError = useCrowdfundStore((s) => s.fetchError);
  const myPledged = useCrowdfundStore((s) => s.myPledged);
  const funds = useAsociatieCrowdfunds();

  const [open, setOpen] = useState(false);
  const [pledgeId, setPledgeId] = useState<string | null>(null);

  useEffect(() => {
    if (asociatieId) void hydrateCrowdfunds(asociatieId, userId || null);
  }, [asociatieId, userId]);

  const list = sortCrowdfunds(funds);

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateCrowdfunds(asociatieId, userId || null)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('crowdfund.title')}
        subtitle={t('crowdfund.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('crowdfund.new')}
          </Button>
        }
      />

      {list.length === 0 ? (
        <EmptyState body={t('crowdfund.empty')} icon={<HandCoins className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const openFund = isOpen(c);
            const hasPledged = myPledged.includes(c.id);
            return (
              <Card key={c.id} className={`space-y-2 p-4 ${openFund ? '' : 'opacity-70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{c.title}</p>
                  {isFunded(c) ? (
                    <Badge tone="success">{t('crowdfund.funded')}</Badge>
                  ) : openFund ? (
                    <Badge tone="primary">{t('crowdfund.until', { date: formatDate(c.deadline) })}</Badge>
                  ) : (
                    <Badge tone="neutral">{t('crowdfund.closed')}</Badge>
                  )}
                </div>
                {c.description && <p className="text-sm text-text">{c.description}</p>}
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-primary" style={{ width: `${Math.round(fundedRatio(c) * 100)}%` }} />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-sm text-muted">
                    {t('crowdfund.raised', { raised: formatLei(c.pledged), target: formatLei(c.target_amount) })}
                  </span>
                  {openFund && (
                    <Button
                      variant={hasPledged ? 'ghost' : 'primary'}
                      disabled={hasPledged}
                      onClick={() => setPledgeId(c.id)}
                    >
                      {hasPledged ? t('crowdfund.pledgedLabel') : t('crowdfund.pledge')}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CrowdfundCreateModal
        open={open}
        onClose={() => setOpen(false)}
        asociatieId={asociatieId ?? ''}
      />
      <CrowdfundPledgeModal
        pledgeId={pledgeId}
        onClose={() => setPledgeId(null)}
        asociatieId={asociatieId ?? ''}
        userId={userId}
      />
    </div>
  );
}
