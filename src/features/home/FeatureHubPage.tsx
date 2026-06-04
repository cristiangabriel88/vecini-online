import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { Icon } from '@/shared/components/Icon';
import {
  FEATURE_CATEGORIES,
  FEATURES,
  categoryLabel,
  featureTitle,
  type FeatureCategory,
} from '@/shared/features/registry';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { roleMatchesAudience } from '@/shared/features/featureRouteLogic';
import { useAuthStore } from '@/shared/store/authStore';

const ACTION_CATEGORIES: FeatureCategory[] = ['maintenance', 'governance', 'spaces'];

/**
 * Generic hub listing enabled features, grouped by category.
 * - `categories` restricts to an explicit set (e.g. the Comunicare tab passes
 *   `['communication']`); its header defaults to the single category's label.
 * - else `actions` shows only action-style categories (legacy Acțiuni route).
 * - else everything (Mai mult tab).
 * `title` overrides the page header when supplied.
 */
export function FeatureHubPage({
  actions = false,
  categories,
  title,
}: {
  actions?: boolean;
  categories?: FeatureCategory[];
  title?: string;
}) {
  const { t } = useTranslation();
  const flags = useAsociatieFlags();
  const role = useAuthStore((s) => s.activeRole)();
  const allCategories = Object.keys(FEATURE_CATEGORIES) as FeatureCategory[];
  const shownCategories = allCategories.filter((c) =>
    categories ? categories.includes(c) : actions ? ACTION_CATEGORIES.includes(c) : true,
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const enabledTotal = FEATURES.filter(
    (f) =>
      shownCategories.includes(f.category) &&
      flags[f.key] &&
      f.path &&
      roleMatchesAudience(f.audience, role),
  ).length;

  const headerTitle =
    title ??
    (categories && categories.length === 1
      ? categoryLabel(t, categories[0])
      : actions
        ? t('nav.actions')
        : t('nav.more'));

  return (
    <div>
      <PageHeader title={headerTitle} />
      {enabledTotal === 0 ? (
        <EmptyState body={t('common.featureDisabled')} />
      ) : (
        <div className="hub-sections">
          {shownCategories.map((cat) => {
            const items = FEATURES.filter(
              (f) => f.category === cat && flags[f.key] && f.path && roleMatchesAudience(f.audience, role),
            );
            if (items.length === 0) return null;
            const isCollapsed = collapsed[cat] ?? false;
            return (
              <section key={cat} className="hub-section">
                <button
                  type="button"
                  className="hub-section__header"
                  aria-expanded={!isCollapsed}
                  onClick={() => setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                >
                  <span className="hub-section__label">{categoryLabel(t, cat)}</span>
                  <ChevronDown
                    className="hub-section__chevron"
                    data-collapsed={isCollapsed ? 'true' : 'false'}
                    size={15}
                  />
                </button>
                <div className="hub-section__collapse" data-collapsed={isCollapsed ? 'true' : 'false'}>
                  <div className="hub-section__collapse-inner">
                    <div className="hub-grid">
                      {items.map((f) => (
                        <Link key={f.key} to={`/app/${f.path}`} className="hub-card">
                          <span className="hub-card__icon">
                            <Icon name={f.icon} size={22} />
                          </span>
                          <span className="hub-card__title">{featureTitle(t, f)}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
