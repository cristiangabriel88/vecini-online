import { useState } from 'react';
import { Outlet, useLocation, useNavigate, NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Megaphone, Zap, Menu, User, Bell, Moon, Sun, Settings, Search, ChevronDown, Info, Phone, Siren, ArrowUpRight, Globe, KeyRound, ShieldCheck, ClipboardList, ScrollText, Building2, LayoutDashboard, Activity, TriangleAlert, UserCog, MessagesSquare } from 'lucide-react';
import { FEATURES, FEATURE_CATEGORIES, categoryLabel, featureTitle, type FeatureCategory } from '@/shared/features/registry';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { useThemeStore } from '@/shared/store/themeStore';
import { useAuthStore } from '@/shared/store/authStore';
import { isAdminRole } from '@/features/auth/hydrationLogic';
import { DEMO_EMERGENCY } from '@/shared/demo/demoData';
import { useCurrentAsociatie } from '@/features/admin/asociatieStore';
import { scariList } from '@/features/admin/buildingLogic';
import { useProfileStore, useMyIdentity } from '@/features/profile/profileStore';
import { useNotificationStore } from '@/shared/store/notificationStore';
import { Icon } from '@/shared/components/Icon';
import { Atmosphere } from '@/shared/components/Atmosphere';
import { UserMenu } from '@/shared/components/UserMenu';
import { AssistantWidget } from '@/features/assistant/AssistantWidget';
import { FeatureRouteGuard } from './FeatureRouteGuard';
import { useMfaEnforcement } from './useMfaEnforcement';
import { useIdleTimeout } from './useIdleTimeout';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { cn } from '@/shared/lib/cn';
import { DevRoleSwitcher } from '@/shared/components/DevRoleSwitcher';
import { StageBanner } from '@/shared/components/StageBanner';
import { useRealtimeSync } from './useRealtimeSync';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function Avatar({ name, accent, lg }: { name: string; accent?: boolean; lg?: boolean }) {
  return (
    <span className={cn('avatar', accent && 'avatar--accent', lg && 'avatar--lg')} title={name}>
      {initials(name) || '?'}
    </span>
  );
}

function useEnabledFeatures() {
  const flags = useAsociatieFlags();
  return FEATURES.filter((f) => flags[f.key]);
}

function useActive() {
  const { pathname } = useLocation();
  return (path?: string) => {
    const full = path ? `/app/${path}` : '/app';
    if (full === '/app') return pathname === '/app' || pathname === '/app/';
    return pathname === full || pathname.startsWith(full + '/');
  };
}

const SIDEBAR_COLLAPSED_KEY = 'iv.sidebar.collapsed';

function loadCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveCollapsed(state: Record<string, boolean>) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** The platform console sections still to be built (T95-T99), shown to the
 *  superadmin persona as upcoming entries so the nav anticipates them. */
const PLATFORM_PLANNED = [
  { key: 'audit', icon: ScrollText },
  { key: 'errors', icon: TriangleAlert },
  { key: 'usage', icon: Activity },
  { key: 'impersonation', icon: UserCog },
  { key: 'messenger', icon: MessagesSquare },
] as const;

function Sidebar() {
  const { t } = useTranslation();
  const enabled = useEnabledFeatures();
  const navigate = useNavigate();
  const isActive = useActive();
  const { pathname } = useLocation();
  // The administration group is only meaningful to management roles; a plain
  // locatar (proprietar / chirias) never sees it, so each demo persona renders
  // the chrome they would actually get.
  const role = useAuthStore((s) => s.activeRole)();
  const isPlatformSuperAdmin = useAuthStore((s) => s.isPlatformSuperAdmin);
  const showAdmin = isAdminRole(role);
  const categories = Object.keys(FEATURE_CATEGORIES) as FeatureCategory[];
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(loadCollapsed);
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsed(next);
      return next;
    });

  const GroupHeader = ({ id, label }: { id: string; label: string }) => (
    <button
      type="button"
      className="sidebar__label sidebar__toggle"
      aria-expanded={!collapsed[id]}
      onClick={() => toggleGroup(id)}
    >
      <span>{label}</span>
      <ChevronDown
        className="sidebar__chevron"
        data-collapsed={collapsed[id] ? 'true' : 'false'}
        size={13}
      />
    </button>
  );

  const NavItem = ({
    label,
    active,
    onClick,
    icon,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
  }) => (
    <button className="navitem" data-active={active} onClick={onClick}>
      <span className="navitem__icon">{icon}</span>
      <span className="navitem__label">{label}</span>
    </button>
  );

  // A platform superadmin sees the console nav (overview + asociații, plus the
  // upcoming sections) instead of the resident/admin nav, so the operator renders
  // its own experience inside the shared app chrome.
  if (isPlatformSuperAdmin) {
    return (
      <aside className="sidebar" aria-label={t('chrome.primaryNav')}>
        <div className="sidebar__group">
          <NavItem
            label={t('platform.sections.overview.title')}
            active={pathname === '/app/platforma'}
            onClick={() => navigate('/app/platforma')}
            icon={<LayoutDashboard size={16} />}
          />
        </div>
        <div className="sidebar__group">
          <GroupHeader id="platform" label={t('platform.appName')} />
          <div className="sidebar__collapse" data-collapsed={collapsed['platform'] ? 'true' : 'false'}>
            <div className="sidebar__collapse-inner">
              <NavItem
                label={t('platform.sections.asociatii.title')}
                active={isActive('platforma/asociatii')}
                onClick={() => navigate('/app/platforma/asociatii')}
                icon={<Building2 size={16} />}
              />
              {PLATFORM_PLANNED.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className="navitem"
                  disabled
                  style={{ opacity: 0.5, cursor: 'default' }}
                >
                  <span className="navitem__icon">
                    <s.icon size={16} />
                  </span>
                  <span className="navitem__label">{t(`platform.sections.${s.key}.title`)}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--text-faint)',
                    }}
                  >
                    {t('platform.sections.planned')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label={t('chrome.primaryNav')}>
      <div className="sidebar__group">
        <NavItem
          label={t('chrome.home')}
          active={isActive()}
          onClick={() => navigate('/app')}
          icon={<Home size={16} />}
        />
      </div>

      {categories.map((cat) => {
        // F56 (emergency numbers) now lives in the footer, not the sidebar.
        const items = enabled.filter((f) => f.category === cat && f.path && f.key !== 'F56');
        if (items.length === 0) return null;
        return (
          <div key={cat} className="sidebar__group">
            <GroupHeader id={cat} label={categoryLabel(t, cat)} />
            <div className="sidebar__collapse" data-collapsed={collapsed[cat] ? 'true' : 'false'}>
              <div className="sidebar__collapse-inner">
                {items.map((f) => (
                  <NavItem
                    key={f.key}
                    label={featureTitle(t, f)}
                    active={isActive(f.path)}
                    onClick={() => navigate(`/app/${f.path}`)}
                    icon={<Icon name={f.icon} size={16} />}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {showAdmin && (
      <div className="sidebar__group">
        <GroupHeader id="admin" label={t('chrome.admin')} />
        <div className="sidebar__collapse" data-collapsed={collapsed['admin'] ? 'true' : 'false'}>
          <div className="sidebar__collapse-inner">
            <NavItem
              label={t('chrome.features')}
              active={isActive('admin/functionalitati')}
              onClick={() => navigate('/app/admin/functionalitati')}
              icon={<Settings size={16} />}
            />
            <NavItem
              label={t('chrome.building')}
              active={isActive('admin/cladire')}
              onClick={() => navigate('/app/admin/cladire')}
              icon={<Building2 size={16} />}
            />
            <NavItem
              label={t('chrome.apartments')}
              active={isActive('admin/apartamente')}
              onClick={() => navigate('/app/admin/apartamente')}
              icon={<Home size={16} />}
            />
            <NavItem
              label={t('chrome.invites')}
              active={isActive('admin/invitatii')}
              onClick={() => navigate('/app/admin/invitatii')}
              icon={<KeyRound size={16} />}
            />
            <NavItem
              label={t('chrome.dataRequests')}
              active={isActive('admin/cereri-date')}
              onClick={() => navigate('/app/admin/cereri-date')}
              icon={<ShieldCheck size={16} />}
            />
            <NavItem
              label={t('chrome.processing')}
              active={isActive('admin/prelucrare-date')}
              onClick={() => navigate('/app/admin/prelucrare-date')}
              icon={<ClipboardList size={16} />}
            />
            <NavItem
              label={t('chrome.breaches')}
              active={isActive('admin/incidente-date')}
              onClick={() => navigate('/app/admin/incidente-date')}
              icon={<Siren size={16} />}
            />
            <NavItem
              label={t('chrome.auditLog')}
              active={isActive('admin/jurnal')}
              onClick={() => navigate('/app/admin/jurnal')}
              icon={<ScrollText size={16} />}
            />
          </div>
        </div>
      </div>
      )}

      <div style={{ flex: 1 }} />
      <div
        style={{
          margin: 'var(--space-4) var(--space-2) var(--space-2)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-sunken)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'var(--primary-soft)',
              color: 'var(--primary-soft-text)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Info size={14} />
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{t('chrome.helpTitle')}</div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
          {t('chrome.helpBody')}
        </div>
      </div>
    </aside>
  );
}

function BottomNav() {
  const { t } = useTranslation();
  const flags = useAsociatieFlags();
  const isActive = useActive();
  const { pathname } = useLocation();
  const isPlatformSuperAdmin = useAuthStore((s) => s.isPlatformSuperAdmin);
  // The superadmin's mobile nav mirrors its console (overview, asociații,
  // profile) rather than the resident shortcuts.
  const items =
    isPlatformSuperAdmin
      ? [
          { to: '/app/platforma', label: t('platform.sections.overview.title'), icon: LayoutDashboard, active: pathname === '/app/platforma' },
          { to: '/app/platforma/asociatii', label: t('platform.sections.asociatii.title'), icon: Building2, active: isActive('platforma/asociatii') },
          { to: '/app/profil', label: t('nav.profile'), icon: User, active: isActive('profil') },
        ]
      : [
    { to: '/app', label: t('nav.home'), icon: Home, active: isActive() },
    ...(flags['F01']
      ? [{ to: '/app/anunturi', label: t('nav.announcements'), icon: Megaphone, active: isActive('anunturi') }]
      : []),
    { to: '/app/actiuni', label: t('nav.actions'), icon: Zap, active: isActive('actiuni') },
    { to: '/app/mai-mult', label: t('nav.more'), icon: Menu, active: isActive('mai-mult') },
    { to: '/app/profil', label: t('nav.profile'), icon: User, active: isActive('profil') },
  ];
  return (
    <nav className="bottomnav" aria-label={t('chrome.bottomNav')}>
      <div className="bottomnav__inner">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} className="bottomnav__item" data-active={it.active}>
            <span className="bottomnav__icon">
              <it.icon size={22} strokeWidth={it.active ? 1.9 : 1.6} />
            </span>
            <span>{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Topbar() {
  const { t, i18n } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const demo = useAuthStore((s) => s.demo);
  const navigate = useNavigate();
  const lang = i18n.language.startsWith('en') ? 'en' : 'ro';
  const toggleLang = () => void i18n.changeLanguage(lang === 'en' ? 'ro' : 'en');

  // Show the active asociație's real identity, not a hardcoded demo string: its
  // name on the primary line, and the scara below. A resident sees their own
  // apartment's entrance (from their profile); failing that we fall back to the
  // building's configured entrances (the admin/whole-building view), then to the
  // generic "owners' association" label so the line is never empty.
  const asociatie = useCurrentAsociatie();
  const asociatieName = asociatie?.name?.trim() || t('chrome.ownersAssociation');
  const { userId } = useMyIdentity();
  const myScara = useProfileStore((s) => s.byUser[userId]?.scara ?? '').trim();
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId) ?? '';
  const notifUnread = useNotificationStore((s) => s.unreadCount(userId, currentAsociatieId));
  const scari = scariList(asociatie?.settings);
  const scaraLabel = myScara
    ? t('chrome.scaraOne', { scara: myScara })
    : scari.length === 0
      ? t('chrome.ownersAssociation')
      : scari.length === 1
        ? t('chrome.scaraOne', { scara: scari[0] })
        : t('chrome.scaraMany', { list: scari.join(', ') });

  return (
    <header className="topbar">
      <Link to="/app" className="topbar__brand">
        <div className="topbar__logo" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 13V6l5-3.5L13 6v7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M6.5 13V9.5h3V13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="topbar__wordmark">
          vecini<em>.online</em>
        </div>
      </Link>

      <div className="topbar__sep" />

      <button className="topbar__workspace" aria-haspopup="menu" aria-label={t('chrome.switchWorkspace')}>
        <Avatar name={asociatieName} accent />
        <span className="topbar__workspace-label">
          <span style={{ display: 'block', fontWeight: 500, color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.2 }}>
            {asociatieName}
          </span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.2, marginTop: 1 }}>
            {scaraLabel}
          </span>
        </span>
      </button>

      <div className="topbar__search">
        <div className="topsearch">
          <Search size={15} />
          <input placeholder={t('chrome.searchPlaceholder')} aria-label={t('chrome.searchLabel')} />
        </div>
      </div>

      <div className="topbar__actions">
        {demo && (
          <span className="topbar__demobanner" title={t('chrome.demoData')}>
            <span>{t('auth.demoMode')}</span>
          </span>
        )}
        <button
          className="iconbtn"
          onClick={toggleLang}
          aria-label={t('chrome.language')}
          title={t('chrome.language')}
        >
          <Globe size={18} />
          <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 3, textTransform: 'uppercase' }}>{lang}</span>
        </button>
        <button
          className="iconbtn"
          onClick={toggleTheme}
          aria-label={t('chrome.toggleTheme')}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="iconbtn"
          onClick={() => navigate('/app/notificari')}
          aria-label={t('nav.notifications')}
        >
          <Bell size={18} />
          {notifUnread > 0 && (
            <span className="iconbtn__badge" aria-label={t('notifications.unreadCount', { count: notifUnread })}>
              {notifUnread > 9 ? '9+' : notifUnread}
            </span>
          )}
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

const APP_VERSION = '0.1.0';

function Footer() {
  const { t } = useTranslation();
  const contacts = [...DEMO_EMERGENCY].sort((a, b) => a.sort_order - b.sort_order);
  const tel = (phone: string) => `tel:${phone.replace(/\s/g, '')}`;

  return (
    <footer className="appfooter">
      <div className="appfooter__inner">
        <section>
          <div className="appfooter__emhead">
            <Siren size={14} />
            <span className="iv-caps">{t('chrome.emergencyNumbers')}</span>
          </div>
          <div className="appfooter__emgrid">
            {contacts.map((c) => (
              <a key={c.id} className="emcall" href={tel(c.phone)}>
                <span className="emcall__info">
                  <span className="emcall__label">{c.label}</span>
                  <span className="emcall__num">{c.phone}</span>
                </span>
                <Phone className="emcall__icon" size={14} />
              </a>
            ))}
          </div>
        </section>

        <section className="appfooter__brand">
          <div className="appfooter__word">
            vecini<em>.online</em>
          </div>
          <p className="appfooter__tag">{t('chrome.footerTagline')}</p>
        </section>
      </div>

      <div className="appfooter__bar">
        <span>© 2026 vecini.online</span>
        <span className="appfooter__dot" />
        <span className="iv-mono">v{APP_VERSION}</span>
        <span className="appfooter__dot" />
        <NavLink className="appfooter__legal" to="/app/confidentialitate">
          {t('consent.privacyLink')}
        </NavLink>
        <a className="appfooter__legal" href="/termeni">
          {t('consent.termsLink')}
        </a>
        <a className="appfooter__legal" href="/cookies">
          {t('consent.cookieLink')}
        </a>
        <a className="appfooter__legal" href="/protectia-consumatorului">
          {t('consent.consumerLink')}
        </a>
        <a className="appfooter__credit" href="https://cristiangabriel.dev" target="_blank" rel="noreferrer">
          {t('chrome.createdBy')} <ArrowUpRight size={12} />
        </a>
      </div>
    </footer>
  );
}

export function AppLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);
  useMfaEnforcement();
  useIdleTimeout();
  useRealtimeSync(currentAsociatieId);
  return (
    <div className="shell">
      <a href="#main-content" className="skip-link">{t('chrome.skipToContent')}</a>
      <Atmosphere />
      <Topbar />
      <Sidebar />
      <main id="main-content" className="main">
        <div className="main__inner" key={pathname}>
          <ErrorBoundary source="route" resetKeys={[pathname]}>
            <FeatureRouteGuard>
              <Outlet />
            </FeatureRouteGuard>
          </ErrorBoundary>
        </div>
        <Footer />
      </main>
      <BottomNav />
      <AssistantWidget />
      <DevRoleSwitcher />
      <StageBanner />
    </div>
  );
}
