import { useTranslation } from 'react-i18next';
import {
  Activity,
  Building2,
  MessagesSquare,
  ScrollText,
  TriangleAlert,
  UserCog,
  Users,
  Home as HomeIcon,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { usePlatformAuthStore } from './platformAuthStore';
import { DEMO_PLATFORM_ADMIN, DEMO_PLATFORM_ASOCIATII, platformTotals } from './demoPlatform';

const SECTION_CARDS = [
  { key: 'asociatii', icon: Building2 },
  { key: 'audit', icon: ScrollText },
  { key: 'errors', icon: TriangleAlert },
  { key: 'usage', icon: Activity },
  { key: 'impersonation', icon: UserCog },
  { key: 'messenger', icon: MessagesSquare },
] as const;

/**
 * Platform console overview (T93) — the landing the shell mounts. It welcomes the
 * signed-in operator, shows the headline platform totals (from the demo dataset
 * offline; live cross-tenant metrics arrive with the console pages T94/T97), and
 * describes the console areas this shell will host (T94-T99).
 */
export default function PlatformHomePage() {
  const { t } = useTranslation();
  const demo = usePlatformAuthStore((s) => s.demo);
  const totals = platformTotals(DEMO_PLATFORM_ASOCIATII);

  const stats = [
    { key: 'asociatii', icon: Building2, value: totals.asociatii },
    { key: 'members', icon: Users, value: totals.members },
    { key: 'apartments', icon: HomeIcon, value: totals.apartments },
  ];

  return (
    <div className="platform-overview">
      <header className="platform-overview__head">
        <p className="iv-caps">{t('platform.appName')}</p>
        <h1 className="platform-overview__title">
          {t('platform.home.welcome', { name: demo ? DEMO_PLATFORM_ADMIN.name : t('platform.home.operator') })}
        </h1>
        <p className="platform-overview__subtitle">{t('platform.home.subtitle')}</p>
      </header>

      {demo ? (
        <section className="platform-stats" aria-label={t('platform.home.statsTitle')}>
          {stats.map((s) => (
            <div key={s.key} className="platform-stat">
              <span className="platform-stat__icon" aria-hidden="true">
                <s.icon size={18} />
              </span>
              <span className="platform-stat__value">{s.value}</span>
              <span className="platform-stat__label">{t(`platform.home.stats.${s.key}`)}</span>
            </div>
          ))}
        </section>
      ) : (
        <p className="platform-overview__note">{t('platform.home.liveMetricsNote')}</p>
      )}

      <section aria-labelledby="platform-sections-title">
        <h2 id="platform-sections-title" className="platform-overview__sectionhead">
          {t('platform.home.sectionsTitle')}
        </h2>
        <div className="platform-sectiongrid">
          {SECTION_CARDS.map((c) => (
            <article key={c.key} className="platform-sectioncard">
              <span className="platform-sectioncard__icon" aria-hidden="true">
                <c.icon size={18} />
              </span>
              <div className="platform-sectioncard__body">
                <div className="platform-sectioncard__head">
                  <h3 className="platform-sectioncard__title">{t(`platform.sections.${c.key}.title`)}</h3>
                  <span className="platform-sectioncard__badge">{t('platform.sections.planned')}</span>
                </div>
                <p className="platform-sectioncard__desc">{t(`platform.sections.${c.key}.desc`)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {!isSupabaseConfigured && (
        <p className="platform-overview__demohint">{t('platform.home.demoBanner')}</p>
      )}
    </div>
  );
}
