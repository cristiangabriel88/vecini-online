import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Icon } from '@/shared/components/Icon';
import { PageHeader } from '@/shared/components/PageHeader';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { FEATURES, featureTitle } from '@/shared/features/registry';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { useAsociatieAnnouncements } from '@/features/announcements/announcementsStore';
import { polls } from '@/features/polls/pollsStore';
import { formatDateTime } from '@/shared/lib/format';

export default function HomePage() {
  const { t } = useTranslation();
  const flags = useAsociatieFlags();
  const announcements = useAsociatieAnnouncements();
  const shortcuts = FEATURES.filter((f) => flags[f.key] && f.path).slice(0, 6);

  return (
    <div>
      <PageHeader title={t('nav.home')} subtitle={DEMO_ASOCIATIE.name} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shortcuts.map((f) => (
          <Link key={f.key} to={`/app/${f.path}`}>
            <Card className="flex h-full flex-col items-center justify-center gap-2 py-5 text-center transition-colors hover:bg-surface-2">
              <Icon name={f.icon} className="h-7 w-7 text-primary" />
              <span className="text-sm font-medium">{featureTitle(t, f)}</span>
            </Card>
          </Link>
        ))}
      </div>

      {flags['F09'] && polls.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">{t('polls.active')}</h2>
          <Card>
            <Link to="/app/voturi" className="font-medium text-primary hover:underline">
              {polls[0].title}
            </Link>
            <p className="text-sm text-muted">{polls[0].description}</p>
          </Card>
        </section>
      )}

      {flags['F01'] && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t('announcements.title')}</h2>
          <div className="space-y-3">
            {announcements.slice(0, 3).map((a) => (
              <Card key={a.id}>
                <div className="flex items-center justify-between gap-2">
                  <Link to="/app/anunturi" className="font-medium hover:underline">
                    {a.title}
                  </Link>
                  <Badge tone="primary">{t(`announcements.category_${a.category}`)}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {a.published_at ? formatDateTime(a.published_at) : ''}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
