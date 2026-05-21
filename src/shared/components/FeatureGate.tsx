import type { ReactNode } from 'react';
import { useFeature } from '@/shared/features/featureStore';

/** Renders children only when the named feature is enabled for the asociație. */
export function FeatureGate({ feature, children }: { feature: string; children: ReactNode }) {
  const enabled = useFeature(feature);
  if (!enabled) return null;
  return <>{children}</>;
}
