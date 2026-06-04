import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { ADMIN_NAV_ITEMS } from '@/shared/nav/adminNav';

/**
 * Mobile administration hub. The admin tools live only in the desktop sidebar,
 * which is hidden on mobile, so this grid is how phone admins reach them (it is
 * the destination of the role-adaptive "Administrare" tab in the bottom nav).
 * The route sits under `RequireAdmin`, so non-admins never reach it. A trailing
 * card links back to the full feature catalogue, since admins trade the
 * "Mai mult" bottom-nav slot for this one.
 */
export function AdminHubPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t('chrome.admin')} />
      <div className="hub-sections">
        <section className="hub-section">
          <div className="hub-grid">
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link key={item.path} to={`/app/${item.path}`} className="hub-card">
                <span className="hub-card__icon">
                  <item.icon size={22} />
                </span>
                <span className="hub-card__title">{t(item.labelKey)}</span>
              </Link>
            ))}
            <Link to="/app/mai-mult" className="hub-card">
              <span className="hub-card__icon">
                <LayoutGrid size={22} />
              </span>
              <span className="hub-card__title">{t('chrome.allFeatures')}</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
