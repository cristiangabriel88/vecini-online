import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Role } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import { isDemo } from '@/shared/lib/env';

const ROLES: Role[] = [
  'admin',
  'presedinte',
  'comitet',
  'cenzor',
  'proprietar',
  'locatar',
  'super_admin',
];

const ROLE_KEY: Record<Role, string> = {
  admin: 'auth.demoRole.admin',
  presedinte: 'auth.demoRole.presedinte',
  comitet: 'auth.demoRole.comitet',
  cenzor: 'auth.demoRole.cenzor',
  proprietar: 'auth.demoRole.proprietar',
  locatar: 'auth.demoRole.locatar',
  super_admin: 'auth.demoRole.superAdmin',
};

interface Props {
  /** `floating` (default): fixed overlay in the app shell. `inline`: unstyled chip row for LoginPage. */
  variant?: 'floating' | 'inline';
  /** Override the click handler (LoginPage passes its MFA-aware enterDemoAs). */
  onSelect?: (role: Role) => void;
}

export function DevRoleSwitcher({ variant = 'floating', onSelect }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enterDemo = useAuthStore((s) => s.enterDemo);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isPlatformSuperAdmin = useAuthStore((s) => s.isPlatformSuperAdmin);

  // Demo-only persona switcher. DEV is a true replica of PROD (real login,
  // no switcher); only the offline DEMO build exposes one-tap persona preview.
  if (!isDemo()) return null;

  const currentRole: Role | null = isPlatformSuperAdmin
    ? 'super_admin'
    : activeRole();

  const handleSelect = (role: Role) => {
    if (onSelect) {
      onSelect(role);
      return;
    }
    enterDemo(role);
    navigate('/app');
  };

  const chips = (
    <div
      className="dev-role-switcher__chips"
      role="group"
      aria-label={t('auth.roleSwitcher')}
    >
      {ROLES.map((role) => (
        <button
          key={role}
          type="button"
          className="dev-role-switcher__chip"
          data-active={currentRole === role ? 'true' : undefined}
          onClick={() => handleSelect(role)}
          aria-pressed={currentRole === role}
        >
          {t(ROLE_KEY[role])}
        </button>
      ))}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className="dev-role-switcher dev-role-switcher--inline">
        <p className="dev-role-switcher__label">{t('auth.demoPreviewAs')}</p>
        {chips}
      </div>
    );
  }

  return (
    <div className="dev-role-switcher dev-role-switcher--floating" aria-label={t('auth.roleSwitcher')}>
      {chips}
    </div>
  );
}
