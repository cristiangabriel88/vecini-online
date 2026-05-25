import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  Home as HomeIcon,
  MessagesSquare,
  ScrollText,
  TriangleAlert,
  UserCog,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { usePlatformAsociatiiStore } from '@/platform/platformAsociatiiStore';
import { platformTotals } from '@/platform/demoPlatform';

/**
 * In-app superadmin overview (the home a `super_admin` demo persona lands on).
 * Welcomes the operator, shows the headline platform totals derived from the
 * platform asociații store, and links to the console areas — the asociații +
 * provisioning page is live, the rest are queued (T95-T99). Reuses the shared
 * `platform.*` i18n strings and the platform stores so it stays in step with the
 * separate-origin console without duplicating data.
 */
const SECTIONS: { key: string; icon: typeof Building2; to?: string }[] = [
  { key: 'asociatii', icon: Building2, to: '/app/platforma/asociatii' },
  { key: 'audit', icon: ScrollText },
  { key: 'errors', icon: TriangleAlert },
  { key: 'usage', icon: Activity },
  { key: 'impersonation', icon: UserCog },
  { key: 'messenger', icon: MessagesSquare },
];

export default function SuperAdminHomePage() {
  const { t } = useTranslation();
  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);
  const totals = platformTotals(asociatii);

  const stats = [
    { key: 'asociatii', icon: Building2, value: totals.asociatii },
    { key: 'members', icon: Users, value: totals.members },
    { key: 'apartments', icon: HomeIcon, value: totals.apartments },
  ];

  return (
    <div>
      <PageHeader title={t('platform.appName')} subtitle={t('platform.home.subtitle')} />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.key} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-primary">
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-2xl font-semibold leading-tight">{s.value}</div>
              <div className="text-sm text-muted">{t(`platform.home.stats.${s.key}`)}</div>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold">{t('platform.home.sectionsTitle')}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTIONS.map((sec) => {
          const inner = (
            <>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                <sec.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{t(`platform.sections.${sec.key}.title`)}</h3>
                  {!sec.to && <Badge tone="neutral">{t('platform.sections.planned')}</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted">{t(`platform.sections.${sec.key}.desc`)}</p>
              </div>
            </>
          );
          return sec.to ? (
            <Link key={sec.key} to={sec.to} className="block">
              <Card className="flex gap-3 transition-colors hover:bg-surface-2">{inner}</Card>
            </Link>
          ) : (
            <Card key={sec.key} className="flex gap-3 opacity-80">
              {inner}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
