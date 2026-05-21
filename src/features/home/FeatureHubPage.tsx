import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { EmptyState } from '@/shared/components/EmptyState';
import { Icon } from '@/shared/components/Icon';
import {
  FEATURE_CATEGORIES,
  FEATURES,
  type FeatureCategory,
} from '@/shared/features/registry';
import { useFeatureStore } from '@/shared/features/featureStore';

const ACTION_CATEGORIES: FeatureCategory[] = ['maintenance', 'governance', 'spaces'];

/** Generic hub listing enabled features. `actions` shows only action-style
 *  categories (Acțiuni tab); otherwise everything (Mai mult tab). */
export function FeatureHubPage({ actions = false }: { actions?: boolean }) {
  const { t } = useTranslation();
  const flags = useFeatureStore((s) => s.flags);
  const categories = (Object.keys(FEATURE_CATEGORIES) as FeatureCategory[]).filter((c) =>
    actions ? ACTION_CATEGORIES.includes(c) : true,
  );

  const enabledTotal = FEATURES.filter((f) => flags[f.key] && f.path).length;

  return (
    <div>
      <PageHeader title={actions ? t('nav.actions') : t('nav.more')} />
      {enabledTotal === 0 ? (
        <EmptyState body={t('common.featureDisabled')} />
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const items = FEATURES.filter((f) => f.category === cat && flags[f.key] && f.path);
            if (items.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="mb-2 text-lg font-semibold">{FEATURE_CATEGORIES[cat]}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {items.map((f) => (
                    <Link key={f.key} to={`/app/${f.path}`}>
                      <Card className="flex items-center gap-3 transition-colors hover:bg-surface-2">
                        <Icon name={f.icon} className="h-6 w-6 text-primary" />
                        <div className="min-w-0">
                          <p className="font-medium">{f.title}</p>
                          <p className="truncate text-sm text-muted">{f.description}</p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
