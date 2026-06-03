import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookA } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { useAuthStore } from '@/shared/store/authStore';
import { useGlossaryStore, useAsociatieGlossary } from './glossaryStore';
import { hydrateGlossary } from './glossaryApi';
import { searchGlossary } from './glossaryLogic';

export default function GlossaryPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useGlossaryStore((s) => s.fetchError);
  const entries = useAsociatieGlossary();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateGlossary(asociatieId);
  }, [asociatieId]);

  const results = searchGlossary(entries, query);

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateGlossary(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title={t('glossary.title')} subtitle={t('glossary.subtitle')} />

      <div className="mb-4">
        <Input
          aria-label={t('common.search')}
          placeholder={t('glossary.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('glossary.empty')} icon={<BookA className="h-10 w-10" />} />
      ) : (
        <dl className="space-y-3">
          {results.map((e) => (
            <Card key={e.id} className="p-4">
              <dt className="text-lg font-semibold">{e.term}</dt>
              <dd className="mt-1 text-text">{e.definition}</dd>
            </Card>
          ))}
        </dl>
      )}
    </div>
  );
}
