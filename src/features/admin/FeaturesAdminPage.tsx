import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Inbox, Sparkles, Users, X } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Switch } from '@/shared/components/Switch';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { Icon } from '@/shared/components/Icon';
import { Badge } from '@/shared/components/Badge';
import {
  FEATURE_CATEGORIES,
  featuresByCategory,
  categoryLabel,
  featureTitle,
  featureDescription,
  getFeature,
  type FeatureCategory,
} from '@/shared/features/registry';
import { summarizeRequests } from '@/shared/features/featureRequestLogic';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { hydrateFeatureFlags, setFeatureFlagLive } from '@/shared/features/featureApi';
import { useFeatureRequestStore } from '@/shared/store/featureRequestStore';
import { useAuthStore } from '@/shared/store/authStore';
import { recordAudit } from '@/shared/store/auditStore';

export default function FeaturesAdminPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const flags = useAsociatieFlags();
  const categories = Object.keys(FEATURE_CATEGORIES) as FeatureCategory[];

  const requests = useFeatureRequestStore((s) => s.requests);
  const clearRequests = useFeatureRequestStore((s) => s.clearFor);
  const hydrateRequests = useFeatureRequestStore((s) => s.hydrateFor);

  // The module key whose dismissal is awaiting confirmation, or null.
  const [pendingDismiss, setPendingDismiss] = useState<string | null>(null);

  // Live: hydrate feature flags and feature requests from the backend when
  // Supabase is configured. Both are no-ops offline; the persisted stores hold
  // the source of truth in demo/local mode.
  useEffect(() => {
    if (asociatieId) void hydrateFeatureFlags(asociatieId);
  }, [asociatieId]);
  useEffect(() => {
    if (asociatieId) void hydrateRequests(asociatieId);
  }, [asociatieId, hydrateRequests]);

  // Demand is only worth surfacing for modules still disabled; once a flag is on,
  // the satisfied requests are cleared, so this also self-heals after enabling.
  const triage = (asociatieId ? summarizeRequests(requests, asociatieId) : []).filter(
    (s) => !flags[s.featureKey],
  );

  const enableRequested = (featureKey: string) => {
    if (!asociatieId) return;
    setFeatureFlagLive(asociatieId, featureKey, true);
    clearRequests(asociatieId, featureKey);
    recordAudit({
      action: 'feature.enabled',
      entity: 'feature',
      entity_label: featureKey,
      before: 'off',
      after: 'on',
    });
    const f = getFeature(featureKey);
    toast.success(
      t('features.requestEnabledToast', { feature: f ? featureTitle(t, f) : featureKey }),
    );
  };

  // Clear the demand for a module without enabling it: the admin has decided not
  // to turn it on. Reuses the same `clearFor` path (and live delete policy) as the
  // enable action, but leaves the flag off and records a distinct audit event so
  // the decision stays traceable.
  const dismissRequested = (featureKey: string) => {
    if (!asociatieId) return;
    clearRequests(asociatieId, featureKey);
    recordAudit({
      action: 'feature.request_dismissed',
      entity: 'feature',
      entity_label: featureKey,
      before: 'requested',
      after: 'dismissed',
    });
    const f = getFeature(featureKey);
    toast.success(
      t('features.requestDismissedToast', { feature: f ? featureTitle(t, f) : featureKey }),
    );
    setPendingDismiss(null);
  };

  const pendingFeature = pendingDismiss ? getFeature(pendingDismiss) : null;
  const pendingLabel = pendingDismiss
    ? pendingFeature
      ? featureTitle(t, pendingFeature)
      : pendingDismiss
    : '';

  return (
    <div>
      <PageHeader title={t('features.title')} subtitle={t('features.subtitle')} />
      <div className="space-y-6">
        {triage.length > 0 && (
          <section aria-label={t('features.requestsTitle')}>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Inbox className="h-5 w-5 text-primary" aria-hidden />
              {t('features.requestsTitle')}
              <Badge tone="primary">{triage.length}</Badge>
            </h2>
            <p className="mb-2 text-sm text-muted">{t('features.requestsSubtitle')}</p>
            <Card className="divide-y divide-border p-0">
              {triage.map((s) => {
                const f = getFeature(s.featureKey);
                const names = s.requesterNames.slice(0, 3).join(', ');
                return (
                  <div
                    key={s.featureKey}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {f && <Icon name={f.icon} className="h-5 w-5 shrink-0 text-muted" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {f ? featureTitle(t, f) : s.featureKey}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <Users className="h-3.5 w-3.5" aria-hidden />
                            {t('features.requestCount', { count: s.count })}
                          </span>
                        </div>
                        {names && <p className="truncate text-sm text-muted">{names}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingDismiss(s.featureKey)}
                      >
                        <X size={15} aria-hidden /> {t('features.requestDismiss')}
                      </Button>
                      <Button size="sm" onClick={() => enableRequested(s.featureKey)}>
                        <Sparkles size={15} aria-hidden /> {t('features.requestEnable')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>
        )}
        {categories.map((cat) => (
          <section key={cat}>
            <h2 className="mb-2 text-lg font-semibold">{categoryLabel(t, cat)}</h2>
            <Card className="divide-y divide-border p-0">
              {featuresByCategory(cat).map((f) => (
                <div key={f.key} className="flex items-center gap-3 p-3">
                  <Icon name={f.icon} className="h-5 w-5 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{featureTitle(t, f)}</span>
                      {!f.implemented && <Badge tone="neutral">{t('features.preview')}</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted">{featureDescription(t, f)}</p>
                  </div>
                  <Switch
                    label={`${featureTitle(t, f)}: ${flags[f.key] ? t('features.enabled') : t('features.disabled')}`}
                    checked={Boolean(flags[f.key])}
                    disabled={!asociatieId}
                    onChange={(v) => {
                      if (!asociatieId) return;
                      setFeatureFlagLive(asociatieId, f.key, v);
                      // Enabling a module here satisfies any pending resident
                      // requests for it, exactly as the triage "enable" action
                      // does, so the demand is cleared regardless of which
                      // control turned the module on (see enableRequested).
                      if (v) clearRequests(asociatieId, f.key);
                      recordAudit({
                        action: v ? 'feature.enabled' : 'feature.disabled',
                        entity: 'feature',
                        entity_label: f.key,
                        before: v ? 'off' : 'on',
                        after: v ? 'on' : 'off',
                      });
                    }}
                  />
                </div>
              ))}
            </Card>
          </section>
        ))}
      </div>

      <Modal
        open={pendingDismiss !== null}
        onClose={() => setPendingDismiss(null)}
        title={t('features.requestDismissTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDismiss(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => pendingDismiss && dismissRequested(pendingDismiss)}
            >
              <X size={15} aria-hidden /> {t('features.requestDismiss')}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {pendingDismiss ? t('features.requestDismissBody', { feature: pendingLabel }) : ''}
        </p>
      </Modal>
    </div>
  );
}
