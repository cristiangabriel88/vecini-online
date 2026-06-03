import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { formatDateTime } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { CODE_TTL_MINUTES, expiryFrom, generateCode, isActive, minutesLeft, sortedCodes } from './accessLogic';
import { useAccessStore, useAsociatieAccessCodes } from './accessStore';
import { hydrateAccessCodes, persistAccessCode } from './accessApi';

export default function AccessPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.session?.user?.id ?? 'u-res');
  const fetchError = useAccessStore((s) => s.fetchError);
  const codes = useAsociatieAccessCodes();
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    if (asociatieId) void hydrateAccessCodes(asociatieId);
  }, [asociatieId]);

  const rows = sortedCodes(codes);

  const onGenerate = () => {
    if (!asociatieId) return;
    const now = new Date().toISOString();
    const code = {
      id: `ac-${Date.now()}`,
      asociatie_id: asociatieId,
      generated_by: userId,
      code: generateCode(),
      expires_at: expiryFrom(now),
      used_at: null,
      created_at: now,
    };
    persistAccessCode(asociatieId, code);
    setLatest(code.id);
    toast.success(t('access.generated'));
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateAccessCodes(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

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
