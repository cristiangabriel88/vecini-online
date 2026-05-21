import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDateTime } from '@/shared/lib/format';
import { useAccessStore } from './accessStore';
import { CODE_TTL_MINUTES, isActive, minutesLeft, sortedCodes } from './accessLogic';

export default function AccessPage() {
  const { t } = useTranslation();
  const { codes, generate } = useAccessStore();
  const [latest, setLatest] = useState<string | null>(null);

  const rows = sortedCodes(codes);

  const onGenerate = () => {
    const code = generate();
    setLatest(code.id);
    toast.success(t('access.generated'));
  };

  return (
    <div>
      <PageHeader
        title={t('access.title')}
        subtitle={t('access.subtitle', { minutes: CODE_TTL_MINUTES })}
        action={<Button onClick={onGenerate}>{t('access.generate')}</Button>}
      />

      {rows.length === 0 ? (
        <EmptyState body={t('access.empty')} icon={<KeyRound className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {rows.map((c) => {
            const active = isActive(c);
            return (
              <Card
                key={c.id}
                className={`flex items-center justify-between gap-3 p-4 ${
                  c.id === latest && active ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div>
                  <p className="font-mono text-2xl font-semibold tracking-widest">{c.code}</p>
                  <p className="text-sm text-muted">{formatDateTime(c.created_at)}</p>
                </div>
                <Badge tone={active ? 'success' : 'neutral'}>
                  {active ? t('access.activeLeft', { minutes: minutesLeft(c) }) : t('access.expired')}
                </Badge>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
