import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { appRouteSegment, featureKeyForRoute, roleMatchesAudience } from '@/shared/features/featureRouteLogic';
import { getFeature } from '@/shared/features/registry';
import { LockedFeatureNotice } from './LockedFeatureNotice';

/**
 * Route-level guard for `/app/*` feature routes (T44/T64). Blocks a route when:
 * (a) the feature flag is OFF for the active asociație -- shows the locked
 * notice so the resident can ask the admin to enable it; or (b) the feature's
 * `audience` does not include the current role -- shows an "not available for
 * your role" notice. Non-feature routes and fully permitted features pass through.
 */
export function FeatureRouteGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const flags = useAsociatieFlags();
  const role = useAuthStore((s) => s.activeRole)();
  const key = featureKeyForRoute(appRouteSegment(pathname));

  if (key) {
    const feature = getFeature(key);
    if (!flags[key]) {
      return <LockedFeatureNotice feature={feature} featureKey={key} reason="disabled" />;
    }
    if (feature && !roleMatchesAudience(feature.audience, role)) {
      return <LockedFeatureNotice feature={feature} featureKey={key} reason="unauthorized" />;
    }
  }

  return <>{children}</>;
}
