import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The Suspense fallback shown while a lazily-loaded route module downloads.
 *
 * It deliberately stays invisible for the first beat (see `.route-fallback` in
 * primitives.css) so fast chunk loads, cached pages and the tiny legal pages
 * swap in with no flash at all, which is what makes navigation feel instant.
 * Only a genuinely slow load reveals the calm, centered spinner; there are no
 * full-width skeleton bars to jump at the top of the page, and the container
 * always fills its area so layout stays stable through the transition.
 */
export function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div className="route-fallback" role="status" aria-label={t('common.loading')}>
      <Loader2 className="route-fallback__spinner" size={22} aria-hidden="true" />
    </div>
  );
}
