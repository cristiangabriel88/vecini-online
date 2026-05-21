import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Vote as VoteIcon } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDateTime } from '@/shared/lib/format';
import { polls, pollOptions, usePollsStore } from './pollsStore';
import { tallyYesNo } from './pollLogic';

export default function PollsPage() {
  const { t } = useTranslation();
  const { counts, myVotes, vote } = usePollsStore();
  const [pending, setPending] = useState<{ pollId: string; optionId: string; label: string } | null>(
    null,
  );

  if (polls.length === 0) {
    return (
      <div>
        <PageHeader title={t('polls.title')} />
        <EmptyState body={t('polls.empty')} icon={<VoteIcon className="h-10 w-10" />} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('polls.active')} />
      <div className="space-y-4">
        {polls.map((p) => {
          const options = pollOptions.filter((o) => o.poll_id === p.id);
          const result = tallyYesNo({
            counts: Object.fromEntries(options.map((o) => [o.id, counts[o.id] ?? 0])),
            yesOptionId: options[0]?.id ?? '',
            noOptionId: options[1]?.id,
            totalApartments: 24,
            quorumPercent: p.quorum_percent,
            majorityRule: p.majority_rule,
          });
          const myVote = myVotes[p.id];
          return (
            <Card key={p.id}>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{p.title}</h2>
                <Badge tone="primary">{t('polls.quorum', { percent: p.quorum_percent })}</Badge>
              </div>
              {p.description && <p className="mb-2 text-muted">{p.description}</p>}
              {p.closes_at && (
                <p className="mb-3 text-sm text-muted">
                  {t('polls.deadline', { date: formatDateTime(p.closes_at) })}
                </p>
              )}

              <div className="space-y-2">
                {options.map((o) => {
                  const pct = result.percentages[o.id] ?? 0;
                  const chosen = myVote === o.id;
                  return (
                    <div key={o.id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className={chosen ? 'font-semibold text-primary' : ''}>{o.label}</span>
                        <span className="text-muted">
                          {counts[o.id] ?? 0} ({pct}%)
                        </span>
                      </div>
                      {myVote ? (
                        <div
                          className="h-2 overflow-hidden rounded-full bg-surface-2"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={() => setPending({ pollId: p.id, optionId: o.id, label: o.label })}
                        >
                          {o.label}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {myVote && (
                <p className="mt-3 text-sm text-muted">
                  {t('polls.results')}: {result.total} voturi ·{' '}
                  {result.quorumMet ? 'cvorum întrunit' : 'cvorum neîntrunit'}
                </p>
              )}
            </Card>
          );
        })}
      </div>

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title={t('polls.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (pending) {
                  vote(pending.pollId, pending.optionId);
                  toast.success(t('polls.voted'));
                }
                setPending(null);
              }}
            >
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <p>{pending && t('polls.confirmVote', { choice: pending.label })}</p>
      </Modal>
    </div>
  );
}
