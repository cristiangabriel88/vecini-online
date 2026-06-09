import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useBroadcastStore, type ActiveBroadcast } from '@/shared/store/broadcastStore';
import { useAuthStore } from '@/shared/store/authStore';
import { isAdminRole } from '@/features/auth/hydrationLogic';

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertTriangle,
};

function SingleBanner({ broadcast, onDismiss }: { broadcast: ActiveBroadcast; onDismiss: () => void }) {
  const { t } = useTranslation();
  const Icon = SEVERITY_ICONS[broadcast.severity];
  return (
    <div
      className={`broadcast-banner broadcast-banner--${broadcast.severity}`}
      role="alert"
      aria-live="polite"
    >
      <span className="broadcast-banner__icon" aria-hidden="true">
        <Icon size={15} />
      </span>
      <div className="broadcast-banner__content">
        <strong className="broadcast-banner__title">{broadcast.title}</strong>
        <span className="broadcast-banner__body">{broadcast.body}</span>
      </div>
      <button
        type="button"
        className="broadcast-banner__dismiss"
        aria-label={t('platform.broadcasts.dismissAriaLabel')}
        onClick={onDismiss}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function BroadcastBanner() {
  const { t } = useTranslation();
  const hydrate = useBroadcastStore((s) => s.hydrate);
  const visible = useBroadcastStore((s) => s.visible());
  const dismiss = useBroadcastStore((s) => s.dismiss);
  const role = useAuthStore((s) => s.activeRole)();
  const isAdmin = isAdminRole(role);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = visible.filter(
    (b) => b.target === 'all' || (b.target === 'admin' && isAdmin),
  );

  if (filtered.length === 0) return null;

  return (
    <div className="broadcast-banner-stack" aria-label={t('platform.broadcasts.noticesAriaLabel')}>
      {filtered.map((b) => (
        <SingleBanner key={b.id} broadcast={b} onDismiss={() => dismiss(b.id)} />
      ))}
    </div>
  );
}
