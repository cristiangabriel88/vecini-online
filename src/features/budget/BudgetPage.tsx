import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { PiggyBank, Plus, Check } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatLei } from '@/shared/lib/format';
import { recordAudit } from '@/shared/store/auditStore';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useAsociatieApartments } from '@/features/admin/apartmentsStore';
import { findVoterApartmentId } from '@/features/polls/pollLogic';
import { useBudgetStore, useActiveBudgetCycle } from './budgetStore';
import { hydrateBudget, proposeItem, castBudgetVote } from './budgetApi';
import { isFunded, isValidProposal, remainingBudget, sortByVotes } from './budgetLogic';

export default function BudgetPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const voterUserId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const authorName = useAuthStore((s) => s.profile?.full_name) ?? 'Locatar';
  const fetchError = useBudgetStore((s) => s.fetchError);
  const cycle = useActiveBudgetCycle();
  const apartments = useAsociatieApartments();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateBudget(asociatieId);
  }, [asociatieId]);

  if (fetchError) {
    return (
      <div>
        <PageHeader title={t('budget.title')} />
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                if (asociatieId) void hydrateBudget(asociatieId);
              }}
            >
              {t('common.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div>
        <PageHeader title={t('budget.title')} subtitle={t('budget.subtitle')} />
        <EmptyState body={t('budget.empty')} icon={<PiggyBank className="h-10 w-10" />} />
      </div>
    );
  }

  const remaining = remainingBudget(cycle);
  const ordered = sortByVotes(cycle.proposals);
  const costNum = Number(cost);
  const valid = isValidProposal(title, costNum);

  const submit = () => {
    if (!valid) return;
    const proposal = {
      id: `bp-${Date.now()}`,
      cycle_id: cycle.id,
      title: title.trim(),
      cost: costNum,
      author_name: authorName,
      votes: 0,
      voted: false,
    };
    proposeItem(asociatieId ?? '', cycle.id, proposal, voterUserId);
    recordAudit({ action: 'budget.proposed', entity: 'budget', entity_label: title.trim() });
    toast.success(t('budget.added'));
    setOpen(false);
    setTitle('');
    setCost('');
  };

  const vote = (proposalId: string) => {
    const apartmentId = findVoterApartmentId(apartments, voterUserId);
    castBudgetVote(asociatieId ?? '', cycle.id, proposalId, apartmentId);
  };

  return (
    <div>
      <PageHeader
        title={t('budget.title')}
        subtitle={t('budget.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('budget.propose')}
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <p className="text-sm text-muted">{cycle.title}</p>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-lg font-semibold">{formatLei(cycle.pool)}</span>
          <span className="text-sm text-success">{t('budget.remaining', { amount: formatLei(remaining) })}</span>
        </div>
      </Card>

      {ordered.length === 0 ? (
        <EmptyState body={t('budget.empty')} icon={<PiggyBank className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((p) => (
            <Card key={p.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-muted">
                    {formatLei(p.cost)} · {p.author_name}
                  </p>
                </div>
                {isFunded(p, cycle) && <Badge tone="success">{t('budget.funded')}</Badge>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{t('budget.voteCount', { count: p.votes })}</span>
                <Button
                  size="sm"
                  variant={p.voted ? 'primary' : 'secondary'}
                  onClick={() => vote(p.id)}
                >
                  {p.voted ? (
                    <>
                      <Check className="h-4 w-4" /> {t('budget.voted')}
                    </>
                  ) : (
                    t('budget.vote')
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('budget.propose')}
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
        <div className="space-y-3">
          <Input label={t('budget.proposalTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label={t('budget.cost')}
            type="number"
            min={0}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
