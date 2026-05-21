import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { useSurveysStore } from './surveysStore';
import { isSurveyClosed, optionPercent, totalResponses } from './surveyLogic';

export default function SurveysPage() {
  const { t } = useTranslation();
  const { surveys, tallies, answered, respond } = useSurveysStore();

  const onVote = (surveyId: string, option: string) => {
    respond(surveyId, option);
    toast.success(t('surveys.voted'));
  };

  return (
    <div>
      <PageHeader title={t('surveys.title')} subtitle={t('surveys.subtitle')} />

      {surveys.length === 0 ? (
        <EmptyState body={t('surveys.empty')} icon={<BarChart3 className="h-10 w-10" />} />
      ) : (
        <div className="space-y-4">
          {surveys.map((sv) => {
            const tally = tallies[sv.id] ?? {};
            const closed = isSurveyClosed(sv.closes_at);
            const showResults = closed || answered.includes(sv.id);
            return (
              <Card key={sv.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{sv.title}</h2>
                  {closed ? (
                    <Badge tone="neutral">{t('surveys.closed')}</Badge>
                  ) : (
                    <Badge tone="primary">{t('surveys.anonymous')}</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {sv.options.map((opt) => {
                    const pct = optionPercent(tally, opt);
                    return showResults ? (
                      <div key={opt}>
                        <div className="mb-0.5 flex justify-between text-sm">
                          <span>{opt}</span>
                          <span className="text-muted">{pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ) : (
                      <Button
                        key={opt}
                        variant="secondary"
                        className="w-full justify-start"
                        onClick={() => onVote(sv.id, opt)}
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </div>

                <p className="mt-3 text-sm text-muted">
                  {t('surveys.responses', { count: totalResponses(tally) })}
                  {sv.closes_at && ` · ${t('surveys.closesAt', { date: formatDate(sv.closes_at) })}`}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
