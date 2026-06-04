import { useTranslation } from 'react-i18next';
import { Eye, LogOut, Shield } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { usePlatformAsociatiiStore } from './platformAsociatiiStore';
import { usePlatformImpersonationStore } from './platformImpersonationStore';

/**
 * Superadmin audited impersonation page (T98). Lists all associations and
 * lets the operator start a read-only diagnostic session. Every start and
 * end is written to the tamper-evident audit trail.
 */
export default function PlatformImpersonatePage() {
  const { t } = useTranslation();
  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);
  const session = usePlatformImpersonationStore((s) => s.session);
  const loading = usePlatformImpersonationStore((s) => s.loading);
  const error = usePlatformImpersonationStore((s) => s.error);
  const startSession = usePlatformImpersonationStore((s) => s.startSession);
  const endSession = usePlatformImpersonationStore((s) => s.endSession);
  const clearError = usePlatformImpersonationStore((s) => s.clearError);

  function handleStart(id: string, name: string) {
    clearError();
    void startSession({ asociatie_id: id, asociatie_name: name });
  }

  return (
    <div>
      <PageHeader
        title={t('platform.impersonation.title')}
        subtitle={t('platform.impersonation.subtitle')}
      />

      {/* Read-only notice */}
      <Card className="mb-4">
        <div className="flex items-start gap-3">
          <span style={{ color: 'var(--color-warning)', marginTop: 2 }} aria-hidden="true">
            <Shield size={16} />
          </span>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            {t('platform.impersonation.auditNotice')}
          </p>
        </div>
      </Card>

      {/* Active session */}
      {session && (
        <Card className="mb-4" style={{ borderColor: 'var(--color-warning)', borderWidth: 1, borderStyle: 'solid' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Eye size={15} style={{ color: 'var(--color-warning)' }} aria-hidden="true" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {t('platform.impersonation.activeSession')}
              </span>
              <Badge tone="warning">{session.asociatie_name}</Badge>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void endSession()}
              disabled={loading}
            >
              <LogOut size={14} />
              {t('platform.impersonation.exitBtn')}
            </Button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '8px 0 0' }}>
            {t('platform.impersonation.sessionStartedAt', { time: new Date(session.startedAt).toLocaleTimeString() })}
          </p>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="mb-4" style={{ borderColor: 'var(--color-danger)', borderWidth: 1, borderStyle: 'solid' }}>
          <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0 }}>
            {t(`platform.impersonation.err.${error}`, { defaultValue: t('platform.impersonation.err.failed') })}
          </p>
        </Card>
      )}

      {/* Association list */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          {t('platform.impersonation.selectTitle')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {asociatii.map((asoc) => {
            const isActive = session?.asociatie_id === asoc.id;
            return (
              <Card key={asoc.id}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 2px' }}>{asoc.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
                      {asoc.city}
                      {asoc.members != null && ` · ${asoc.members} ${t('platform.asociatii.members', { count: asoc.members })}`}
                    </p>
                  </div>
                  {isActive ? (
                    <Badge tone="warning">
                      <Eye size={12} />
                      {t('platform.impersonation.viewing')}
                    </Badge>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStart(asoc.id, asoc.name)}
                      disabled={loading || session !== null}
                      aria-label={`${t('platform.impersonation.startBtn')} ${asoc.name}`}
                    >
                      <Eye size={14} />
                      {t('platform.impersonation.startBtn')}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
