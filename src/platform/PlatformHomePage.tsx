import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  CreditCard,
  Home as HomeIcon,
  Megaphone,
  MessagesSquare,
  ScrollText,
  Shield,
  TicketCheck,
  TriangleAlert,
  UserCog,
  Users,
  Vote,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { usePlatformAuthStore } from './platformAuthStore';
import { DEMO_PLATFORM_ADMIN } from './demoPlatform';
import { usePlatformUsageStore } from './platformUsageStore';
import { usePlatformAsociatiiStore } from './platformAsociatiiStore';
import { usePlatformSubscriptionsStore } from './platformSubscriptionsStore';
import { usePlatformMessengerStore } from './platformMessengerStore';
import { usePlatformErrorStore } from './platformErrorStore';
import { computeOverview } from './platformOverviewLogic';

const SECTION_CARDS = [
  { key: 'asociatii', icon: Building2, path: '/consola/asociatii' },
  { key: 'audit', icon: ScrollText, path: '/consola/audit' },
  { key: 'errors', icon: TriangleAlert, path: '/consola/erori' },
  { key: 'usage', icon: Activity, path: '/consola/utilizare' },
  { key: 'impersonation', icon: UserCog, path: '/consola/impersonare' },
  { key: 'messenger', icon: MessagesSquare, path: '/consola/mesaje' },
  { key: 'subscriptions', icon: CreditCard, path: '/consola/abonamente' },
  { key: 'team', icon: Shield, path: '/consola/echipa' },
  { key: 'broadcasts', icon: Megaphone, path: '/consola/anunturi-platforma' },
] as const;

export default function PlatformHomePage() {
  const { t } = useTranslation();
  const demo = usePlatformAuthStore((s) => s.demo);
  const metrics = usePlatformUsageStore((s) => s.metrics);
  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);
  const subRows = usePlatformSubscriptionsStore((s) => s.rows);
  const allThreads = usePlatformMessengerStore((s) => s.allThreads());
  const errorReports = usePlatformErrorStore((s) => s.reports);

  const ov = computeOverview(metrics, asociatii, subRows, allThreads, errorReports);

  return (
    <div className="platform-overview">
      <header className="platform-overview__head">
        <p className="iv-caps">{t('platform.appName')}</p>
        <h1 className="platform-overview__title">
          {t('platform.home.welcome', { name: demo ? DEMO_PLATFORM_ADMIN.name : t('platform.home.operator') })}
        </h1>
        <p className="platform-overview__subtitle">{t('platform.home.subtitle')}</p>
      </header>

      {/* Associations + Members + Apartments */}
      <section aria-labelledby="platform-assoc-kpi-title">
        <h2 id="platform-assoc-kpi-title" className="platform-overview__sectionhead">
          {t('platform.home.overview.associationsTitle')}
        </h2>
        <div className="platform-stats">
          <Link to="/consola/asociatii" className="platform-stat platform-stat--link">
            <span className="platform-stat__icon" aria-hidden="true"><Building2 size={18} /></span>
            <span className="platform-stat__value">{ov.totalAsociatii}</span>
            <span className="platform-stat__label">{t('platform.home.stats.asociatii')}</span>
            <ul className="platform-stat__sub">
              <li className="platform-stat__sub-item platform-stat__sub-item--active">
                {t('platform.home.overview.activeCount', { count: ov.activeHealth })}
              </li>
              {ov.moderateHealth > 0 && (
                <li className="platform-stat__sub-item platform-stat__sub-item--moderate">
                  {t('platform.home.overview.moderateCount', { count: ov.moderateHealth })}
                </li>
              )}
              {ov.dormantHealth > 0 && (
                <li className="platform-stat__sub-item platform-stat__sub-item--dormant">
                  {t('platform.home.overview.dormantCount', { count: ov.dormantHealth })}
                </li>
              )}
              {ov.suspendedLifecycle > 0 && (
                <li className="platform-stat__sub-item platform-stat__sub-item--suspended">
                  {t('platform.home.overview.suspendedCount', { count: ov.suspendedLifecycle })}
                </li>
              )}
            </ul>
          </Link>
          <Link to="/consola/utilizare" className="platform-stat platform-stat--link">
            <span className="platform-stat__icon" aria-hidden="true"><Users size={18} /></span>
            <span className="platform-stat__value">{ov.totalMembers}</span>
            <span className="platform-stat__label">{t('platform.home.stats.members')}</span>
          </Link>
          <Link to="/consola/utilizare" className="platform-stat platform-stat--link">
            <span className="platform-stat__icon" aria-hidden="true"><HomeIcon size={18} /></span>
            <span className="platform-stat__value">{ov.totalApartments}</span>
            <span className="platform-stat__label">{t('platform.home.stats.apartments')}</span>
          </Link>
        </div>
      </section>

      {/* 30-day activity rollup */}
      <section aria-labelledby="platform-activity-kpi-title">
        <h2 id="platform-activity-kpi-title" className="platform-overview__sectionhead">
          {t('platform.home.overview.activityTitle')}
        </h2>
        <div className="platform-stats">
          <Link to="/consola/utilizare" className="platform-stat platform-stat--link">
            <span className="platform-stat__icon" aria-hidden="true"><Megaphone size={18} /></span>
            <span className="platform-stat__value">{ov.recentAnnouncements}</span>
            <span className="platform-stat__label">{t('platform.home.overview.announcements')}</span>
          </Link>
          <Link to="/consola/utilizare" className="platform-stat platform-stat--link">
            <span className="platform-stat__icon" aria-hidden="true"><TicketCheck size={18} /></span>
            <span className="platform-stat__value">{ov.recentTickets}</span>
            <span className="platform-stat__label">{t('platform.home.overview.tickets')}</span>
          </Link>
          <Link to="/consola/utilizare" className="platform-stat platform-stat--link">
            <span className="platform-stat__icon" aria-hidden="true"><Vote size={18} /></span>
            <span className="platform-stat__value">{ov.recentVotes}</span>
            <span className="platform-stat__label">{t('platform.home.overview.votes')}</span>
          </Link>
        </div>
      </section>

      {/* Operations: subscriptions, support, errors */}
      <section aria-labelledby="platform-ops-kpi-title">
        <h2 id="platform-ops-kpi-title" className="platform-overview__sectionhead">
          {t('platform.home.overview.operationsTitle')}
        </h2>
        <div className="platform-stats">
          <Link to="/consola/abonamente" className="platform-stat platform-stat--link">
            <span className="platform-stat__icon" aria-hidden="true"><CreditCard size={18} /></span>
            <span className="platform-stat__value">{ov.mrr} lei</span>
            <span className="platform-stat__label">{t('platform.home.overview.mrrLabel')}</span>
            {ov.overdueCount > 0 && (
              <ul className="platform-stat__sub">
                <li className="platform-stat__sub-item platform-stat__sub-item--warn">
                  {t('platform.home.overview.overdueSubLabel', { count: ov.overdueCount })}
                </li>
              </ul>
            )}
          </Link>
          <Link to="/consola/mesaje" className="platform-stat platform-stat--link">
            <span className="platform-stat__icon" aria-hidden="true"><MessagesSquare size={18} /></span>
            <span className="platform-stat__value">{ov.openThreads}</span>
            <span className="platform-stat__label">{t('platform.home.overview.openThreadsLabel')}</span>
            {ov.unansweredThreads > 0 && (
              <ul className="platform-stat__sub">
                <li className="platform-stat__sub-item platform-stat__sub-item--warn">
                  {t('platform.home.overview.unansweredSubLabel', { count: ov.unansweredThreads })}
                </li>
              </ul>
            )}
          </Link>
          <Link to="/consola/erori" className="platform-stat platform-stat--link">
            <span className="platform-stat__icon" aria-hidden="true"><TriangleAlert size={18} /></span>
            <span className="platform-stat__value">{ov.recentErrorGroups}</span>
            <span className="platform-stat__label">{t('platform.home.overview.errorGroupsLabel')}</span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="platform-sections-title">
        <h2 id="platform-sections-title" className="platform-overview__sectionhead">
          {t('platform.home.sectionsTitle')}
        </h2>
        <div className="platform-sectiongrid">
          {SECTION_CARDS.map((c) => (
            <Link key={c.key} to={c.path} className="platform-sectioncard platform-sectioncard--link">
              <span className="platform-sectioncard__icon" aria-hidden="true">
                <c.icon size={18} />
              </span>
              <div className="platform-sectioncard__body">
                <h3 className="platform-sectioncard__title">{t(`platform.sections.${c.key}.title`)}</h3>
                <p className="platform-sectioncard__desc">{t(`platform.sections.${c.key}.desc`)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {!isSupabaseConfigured && (
        <p className="platform-overview__demohint">{t('platform.home.demoBanner')}</p>
      )}
    </div>
  );
}
