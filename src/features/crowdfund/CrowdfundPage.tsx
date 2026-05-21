import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HandCoins, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatLei, formatDate } from '@/shared/lib/format';
import { useCrowdfundStore } from './crowdfundStore';
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

export default function CrowdfundPage() {
  const { t } = useTranslation();
  const { funds, pledged, create, pledge } = useCrowdfundStore();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline());

  const [pledgeId, setPledgeId] = useState<string | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState('');

  const list = sortCrowdfunds(funds);
  const valid = isValidCrowdfund(title, Number(target));
  const pledgeValid = isValidPledge(Number(pledgeAmount));

  const submit = () => {
    if (!valid) return;
    create({ title, description, target: Number(target), deadline });
    toast.success(t('crowdfund.created'));
    setOpen(false);
    setTitle('');
    setDescription('');
    setTarget('');
    setDeadline(defaultDeadline());
  };

  const submitPledge = () => {
    if (!pledgeId || !pledgeValid) return;
    pledge(pledgeId, Number(pledgeAmount));
    toast.success(t('crowdfund.pledged'));
    setPledgeId(null);
    setPledgeAmount('');
  };

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
            const open2 = isOpen(c);
            const hasPledged = pledged.includes(c.id);
            return (
              <Card key={c.id} className={`space-y-2 p-4 ${open2 ? '' : 'opacity-70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{c.title}</p>
                  {isFunded(c) ? (
                    <Badge tone="success">{t('crowdfund.funded')}</Badge>
                  ) : open2 ? (
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
                  {open2 && (
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('crowdfund.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
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
          <Input label={t('crowdfund.deadline')} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </Modal>

      <Modal
        open={pledgeId !== null}
        onClose={() => setPledgeId(null)}
        title={t('crowdfund.pledge')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPledgeId(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitPledge} disabled={!pledgeValid}>
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
    </div>
  );
}
