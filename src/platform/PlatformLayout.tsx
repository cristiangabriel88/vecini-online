import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Globe,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Moon,
  ScrollText,
  Sun,
  TriangleAlert,
  UserCog,
  Activity,
} from 'lucide-react';
import { Atmosphere } from '@/shared/components/Atmosphere';
import { useThemeStore } from '@/shared/store/themeStore';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { usePlatformAuthStore } from './platformAuthStore';

/**
 * The console sections this shell hosts. Only the overview ships in T93; the rest
 * are the console pages queued as T94-T99 and shown here as upcoming entries so
 * the shell visibly anticipates them without offering dead links.
 */
const SECTIONS = [
  { key: 'overview', path: '/consola', icon: LayoutDashboard, ready: true },
  { key: 'asociatii', path: '/consola/asociatii', icon: Building2, ready: true },
  { key: 'audit', path: '/consola/audit', icon: ScrollText, ready: true },
  { key: 'errors', path: '/consola/erori', icon: TriangleAlert, ready: true },
  { key: 'usage', path: '/consola/utilizare', icon: Activity, ready: false },
  { key: 'impersonation', path: '/consola/impersonare', icon: UserCog, ready: false },
  { key: 'messenger', path: '/consola/mesaje', icon: MessagesSquare, ready: false },
] as const;

function Header() {
  const { t, i18n } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const demo = usePlatformAuthStore((s) => s.demo);
  const signOut = usePlatformAuthStore((s) => s.signOut);
  const lang = i18n.language.startsWith('en') ? 'en' : 'ro';
  const toggleLang = () => void i18n.changeLanguage(lang === 'en' ? 'ro' : 'en');

  return (
    <header className="platform-topbar">
      <div className="platform-brand">
        <span className="platform-brand__mark" aria-hidden="true">
          <ShieldMark />
        </span>
        <span className="platform-brand__text">
          vecini<em>.online</em>
          <span className="platform-brand__tag">{t('platform.appName')}</span>
        </span>
      </div>

      <div className="platform-topbar__actions">
        {demo && <span className="platform-demobadge">{t('platform.demoMode')}</span>}
        <button
          className="iconbtn"
          onClick={toggleLang}
          aria-label={t('chrome.language')}
          title={t('chrome.language')}
        >
          <Globe size={18} />
          <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 3, textTransform: 'uppercase' }}>
            {lang}
          </span>
        </button>
        <button className="iconbtn" onClick={toggleTheme} aria-label={t('chrome.toggleTheme')}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="platform-signout" onClick={() => void signOut()}>
          <LogOut size={15} />
          <span>{t('platform.nav.signOut')}</span>
        </button>
      </div>
    </header>
  );
}

function ShieldMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5l5 1.8v4c0 3.2-2.1 5.6-5 6.7-2.9-1.1-5-3.5-5-6.7v-4L8 1.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M5.6 8l1.7 1.7L10.6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="platform-sidebar" aria-label={t('platform.nav.sections')}>
      {SECTIONS.map((s) => {
        const active = pathname === s.path;
        return (
          <button
            key={s.key}
            className="platform-navitem"
            data-active={active}
            disabled={!s.ready}
            aria-current={active ? 'page' : undefined}
            onClick={() => s.ready && navigate(s.path)}
          >
            <span className="platform-navitem__icon">
              <s.icon size={16} />
            </span>
            <span className="platform-navitem__label">{t(`platform.sections.${s.key}.title`)}</span>
            {!s.ready && <span className="platform-navitem__soon">{t('platform.sections.planned')}</span>}
          </button>
        );
      })}
    </aside>
  );
}

export function PlatformLayout() {
  const { pathname } = useLocation();
  return (
    <div className="platform-shell">
      <Atmosphere />
      <Header />
      <Sidebar />
      <main className="platform-main">
        <div className="platform-main__inner" key={pathname}>
          <ErrorBoundary source="platform-route" resetKeys={[pathname]}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
