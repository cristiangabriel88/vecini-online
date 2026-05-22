import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Megaphone, Zap, Menu, User, Bell, Moon, Sun, Settings, Search, ChevronDown, Info } from 'lucide-react';
import { FEATURES, FEATURE_CATEGORIES, type FeatureCategory } from '@/shared/features/registry';
import { useFeatureStore } from '@/shared/features/featureStore';
import { useThemeStore } from '@/shared/store/themeStore';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { Icon } from '@/shared/components/Icon';
import { cn } from '@/shared/lib/cn';

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
  const flags = useFeatureStore((s) => s.flags);
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

function Sidebar() {
  const enabled = useEnabledFeatures();
  const navigate = useNavigate();
  const isActive = useActive();
  const categories = Object.keys(FEATURE_CATEGORIES) as FeatureCategory[];

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

  return (
    <aside className="sidebar" aria-label="Navigație principală">
      <div className="sidebar__group">
        <NavItem
          label="Acasă"
          active={isActive()}
          onClick={() => navigate('/app')}
          icon={<Home size={16} />}
        />
      </div>

      {categories.map((cat) => {
        const items = enabled.filter((f) => f.category === cat && f.path);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="sidebar__group">
            <div className="sidebar__label">{FEATURE_CATEGORIES[cat]}</div>
            {items.map((f) => (
              <NavItem
                key={f.key}
                label={f.title}
                active={isActive(f.path)}
                onClick={() => navigate(`/app/${f.path}`)}
                icon={<Icon name={f.icon} size={16} />}
              />
            ))}
          </div>
        );
      })}

      <div className="sidebar__group">
        <div className="sidebar__label">Administrare</div>
        <NavItem
          label="Funcționalități"
          active={isActive('admin/functionalitati')}
          onClick={() => navigate('/app/admin/functionalitati')}
          icon={<Settings size={16} />}
        />
        <NavItem
          label="Apartamente"
          active={isActive('admin/apartamente')}
          onClick={() => navigate('/app/admin/apartamente')}
          icon={<Home size={16} />}
        />
      </div>

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
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>Ajutor și suport</div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
          Contactează administratorul sau citește ghidul rapid pentru primii pași.
        </div>
      </div>
    </aside>
  );
}

function BottomNav() {
  const { t } = useTranslation();
  const flags = useFeatureStore((s) => s.flags);
  const isActive = useActive();
  const items = [
    { to: '/app', label: t('nav.home'), icon: Home, active: isActive() },
    ...(flags['F01']
      ? [{ to: '/app/anunturi', label: t('nav.announcements'), icon: Megaphone, active: isActive('anunturi') }]
      : []),
    { to: '/app/actiuni', label: t('nav.actions'), icon: Zap, active: isActive('actiuni') },
    { to: '/app/mai-mult', label: t('nav.more'), icon: Menu, active: isActive('mai-mult') },
    { to: '/app/profil', label: t('nav.profile'), icon: User, active: isActive('profil') },
  ];
  return (
    <nav className="bottomnav" aria-label="Navigație">
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
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const demo = useAuthStore((s) => s.demo);
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar__brand">
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
      </div>

      <div className="topbar__sep" />

      <button className="topbar__workspace" aria-haspopup="menu">
        <Avatar name={DEMO_ASOCIATIE.name} accent />
        <span className="topbar__workspace-label">
          <span style={{ display: 'block', fontWeight: 500, color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.2 }}>
            {DEMO_ASOCIATIE.name}
          </span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.2, marginTop: 1 }}>
            Asociație de proprietari
          </span>
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
      </button>

      <div className="topbar__search">
        <div className="topsearch">
          <Search size={15} />
          <input placeholder="Caută anunțuri, sesizări, vecini…" />
          <span style={{ display: 'inline-flex', gap: 3 }}>
            <kbd className="kbd">⌘</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </div>
      </div>

      <div className="topbar__actions">
        {demo && (
          <span className="topbar__demobanner" title="Date de demonstrație">
            <span>{t('auth.demoMode')}</span>
          </span>
        )}
        <button
          className="iconbtn"
          onClick={toggleTheme}
          aria-label="Comută temă"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="iconbtn"
          onClick={() => navigate('/app/notificari')}
          aria-label={t('nav.notifications')}
        >
          <Bell size={18} />
          <span className="iconbtn__dot" />
        </button>
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px 4px 4px',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            marginLeft: 4,
          }}
          onClick={() => navigate('/app/profil')}
          aria-label="Cont"
        >
          <Avatar name="Andrei Popescu" />
          <ChevronDown size={13} style={{ color: 'var(--text-faint)' }} />
        </button>
      </div>
    </header>
  );
}

export function AppLayout() {
  return (
    <div className="shell">
      <Topbar />
      <Sidebar />
      <main className="main">
        <div className="main__inner">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
