import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { appRouteSegment, featureKeyForRoute } from '@/shared/features/featureRouteLogic';
import { getFeature } from '@/shared/features/registry';
import { LockedFeatureNotice } from './LockedFeatureNotice';

/**
 * Route-level guard for `/app/*` feature routes (T44). A module disabled for the
 * active asociație is hidden from the nav, but its page stays mounted in the
 * router; without this guard a resident could still reach it by typing the URL.
 * When the current route maps to a feature whose flag is OFF, render the locked
 * notice (which lets the resident ask the admin to enable it, T150) instead of
 * the page. Non-feature routes (home, actiuni, profil, admin, …) and enabled
 * features pass straight through.
 */
export function FeatureRouteGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const flags = useAsociatieFlags();
  const key = featureKeyForRoute(appRouteSegment(pathname));

  if (key && !flags[key]) {
    return <LockedFeatureNotice feature={getFeature(key)} featureKey={key} />;
  }

  return <>{children}</>;
}
