import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { useFaqStore } from './faqStore';
import { searchFaq } from './faqLogic';

export default function FaqPage() {
  const { t } = useTranslation();
  const { items, myVotes, vote } = useFaqStore();
  const [query, setQuery] = useState('');
  const results = searchFaq(items, query).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <PageHeader title={t('faq.title')} subtitle={t('faq.subtitle')} />

      <div className="mb-4">
        <Input
          aria-label={t('common.search')}
          placeholder={t('faq.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('faq.empty')} icon={<HelpCircle className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((e) => {
            const voted = myVotes[e.id];
            return (
              <Card key={e.id}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{e.question}</h2>
                  <Badge tone="primary">{e.category}</Badge>
                </div>
                <p className="mb-3 whitespace-pre-line text-text">{e.answer}</p>
                <div className="flex items-center gap-3 text-sm text-muted">
                  <span>{t('faq.wasHelpful')}</span>
                  <Button
                    variant={voted === true ? 'primary' : 'secondary'}
                    size="sm"
                    disabled={voted !== undefined}
                    onClick={() => vote(e.id, true)}
                    aria-label={t('faq.helpful')}
                  >
                    <ThumbsUp className="h-4 w-4" /> {e.helpful_count}
                  </Button>
                  <Button
                    variant={voted === false ? 'danger' : 'secondary'}
                    size="sm"
                    disabled={voted !== undefined}
                    onClick={() => vote(e.id, false)}
                    aria-label={t('faq.notHelpful')}
                  >
                    <ThumbsDown className="h-4 w-4" /> {e.not_helpful_count}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
