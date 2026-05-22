import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { appRouteSegment, featureKeyForRoute } from '@/shared/features/featureRouteLogic';
import { getFeature, featureTitle } from '@/shared/features/registry';

/**
 * Route-level guard for `/app/*` feature routes (T44). A module disabled for the
 * active asociație is hidden from the nav, but its page stays mounted in the
 * router; without this guard a resident could still reach it by typing the URL.
 * When the current route maps to a feature whose flag is OFF, render a clear
 * bilingual "module not enabled" notice instead of the page. Non-feature routes
 * (home, actiuni, profil, admin, …) and enabled features pass straight through.
 */
export function FeatureRouteGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const flags = useAsociatieFlags();
  const key = featureKeyForRoute(appRouteSegment(pathname));

  if (key && !flags[key]) {
    const feature = getFeature(key);
    return (
      <div>
        <PageHeader title={feature ? featureTitle(t, feature) : t('chrome.features')} />
        <EmptyState
          icon={<Lock className="h-10 w-10" />}
          title={feature ? `${feature.key} · ${featureTitle(t, feature)}` : undefined}
          body={t('common.featureDisabled')}
          action={
            <Link className="btn btn--primary" to="/app">
              {t('chrome.home')}
            </Link>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
