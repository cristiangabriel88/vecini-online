import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Switch } from '@/shared/components/Switch';
import { Icon } from '@/shared/components/Icon';
import { Badge } from '@/shared/components/Badge';
import {
  FEATURE_CATEGORIES,
  featuresByCategory,
  type FeatureCategory,
} from '@/shared/features/registry';
import { useFeatureStore } from '@/shared/features/featureStore';

export default function FeaturesAdminPage() {
  const { t } = useTranslation();
  const flags = useFeatureStore((s) => s.flags);
  const setFlag = useFeatureStore((s) => s.setFlag);
  const categories = Object.keys(FEATURE_CATEGORIES) as FeatureCategory[];

  return (
    <div>
      <PageHeader title={t('features.title')} subtitle={t('features.subtitle')} />
      <div className="space-y-6">
        {categories.map((cat) => (
          <section key={cat}>
            <h2 className="mb-2 text-lg font-semibold">{FEATURE_CATEGORIES[cat]}</h2>
            <Card className="divide-y divide-border p-0">
              {featuresByCategory(cat).map((f) => (
                <div key={f.key} className="flex items-center gap-3 p-3">
                  <Icon name={f.icon} className="h-5 w-5 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{f.title}</span>
                      <span className="text-xs text-muted">{f.key}</span>
                      {!f.implemented && <Badge tone="neutral">previzualizare</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted">{f.description}</p>
                  </div>
                  <Switch
                    label={`${f.title}: ${flags[f.key] ? t('features.enabled') : t('features.disabled')}`}
                    checked={Boolean(flags[f.key])}
                    onChange={(v) => setFlag(f.key, v)}
                  />
                </div>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
