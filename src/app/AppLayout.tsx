import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Megaphone, Zap, Menu, User, Bell, Moon, Sun, Settings } from 'lucide-react';
import { FEATURES, FEATURE_CATEGORIES, type FeatureCategory } from '@/shared/features/registry';
import { useFeatureStore } from '@/shared/features/featureStore';
import { useThemeStore } from '@/shared/store/themeStore';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { Icon } from '@/shared/components/Icon';
import { cn } from '@/shared/lib/cn';

function useEnabledFeatures() {
  const flags = useFeatureStore((s) => s.flags);
  return FEATURES.filter((f) => flags[f.key]);
}

function Sidebar() {
  const enabled = useEnabledFeatures();
  const categories = Object.keys(FEATURE_CATEGORIES) as FeatureCategory[];
  return (
    <nav aria-label="Navigare principală" className="space-y-5 p-4">
      <NavLink
        to="/app"
        end
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 font-medium',
            isActive ? 'bg-primary/10 text-primary' : 'hover:bg-surface-2',
          )
        }
      >
        <Home className="h-5 w-5" /> Acasă
      </NavLink>

      {categories.map((cat) => {
        const items = enabled.filter((f) => f.category === cat && f.path);
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {FEATURE_CATEGORIES[cat]}
            </p>
            {items.map((f) => (
              <NavLink
                key={f.key}
                to={`/app/${f.path}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2',
                    isActive ? 'bg-primary/10 text-primary' : 'hover:bg-surface-2',
                  )
                }
              >
                <Icon name={f.icon} className="h-5 w-5" />
                <span className="truncate">{f.title}</span>
              </NavLink>
            ))}
          </div>
        );
      })}

      <div>
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Administrare
        </p>
        {[
          { to: '/app/admin/functionalitati', label: 'Funcționalități', icon: Settings },
          { to: '/app/admin/apartamente', label: 'Apartamente', icon: Home },
        ].map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2',
                isActive ? 'bg-primary/10 text-primary' : 'hover:bg-surface-2',
              )
            }
          >
            <l.icon className="h-5 w-5" /> {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function BottomNav() {
  const { t } = useTranslation();
  const flags = useFeatureStore((s) => s.flags);
  const items = [
    { to: '/app', end: true, label: t('nav.home'), icon: Home },
    ...(flags['F01']
      ? [{ to: '/app/anunturi', end: false, label: t('nav.announcements'), icon: Megaphone }]
      : []),
    { to: '/app/actiuni', end: false, label: t('nav.actions'), icon: Zap },
    { to: '/app/mai-mult', end: false, label: t('nav.more'), icon: Menu },
    { to: '/app/profil', end: false, label: t('nav.profile'), icon: User },
  ];
  return (
    <nav
      aria-label="Navigare mobil"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface lg:hidden"
    >
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs',
              isActive ? 'text-primary' : 'text-muted',
            )
          }
        >
          <it.icon className="h-6 w-6" />
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const demo = useAuthStore((s) => s.demo);
  const { pathname } = useLocation();
  void pathname;

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-lg font-semibold text-primary">IntreVecini</span>
          <span className="hidden truncate text-sm text-muted sm:inline">
            · {DEMO_ASOCIATIE.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {demo && (
            <span className="mr-2 hidden rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning sm:inline">
              {t('auth.demoMode')}
            </span>
          )}
          <button
            onClick={toggleTheme}
            aria-label="Schimbă tema"
            className="rounded-lg p-2 hover:bg-surface-2"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <NavLink
            to="/app/notificari"
            aria-label={t('nav.notifications')}
            className="rounded-lg p-2 hover:bg-surface-2"
          >
            <Bell className="h-5 w-5" />
          </NavLink>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-surface lg:block">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
