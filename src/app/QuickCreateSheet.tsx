import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CalendarDays, Megaphone, MessagesSquare, Vote, X, type LucideIcon } from 'lucide-react';
import { FEATURES } from '@/shared/features/registry';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { roleMatchesAudience } from '@/shared/features/featureRouteLogic';
import { useAuthStore } from '@/shared/store/authStore';

interface QuickAction {
  /** Registry key gating availability (flag enabled + role audience). */
  featureKey: string;
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

/**
 * The quick-create actions offered by the bottom-nav FAB, ordered by everyday
 * frequency. Each is shown only when its feature is enabled for the asociație
 * and permitted for the current role, so the sheet never offers a dead end.
 */
const QUICK_ACTIONS: QuickAction[] = [
  { featureKey: 'F17', to: '/app/sesizari', labelKey: 'quickCreate.report', icon: AlertCircle },
  { featureKey: 'F02', to: '/app/discutii', labelKey: 'quickCreate.discussion', icon: MessagesSquare },
  { featureKey: 'F08', to: '/app/evenimente', labelKey: 'quickCreate.event', icon: CalendarDays },
  { featureKey: 'F01', to: '/app/anunturi', labelKey: 'quickCreate.announcement', icon: Megaphone },
  { featureKey: 'F09', to: '/app/voturi', labelKey: 'quickCreate.vote', icon: Vote },
];

export function QuickCreateSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const flags = useAsociatieFlags();
  const role = useAuthStore((s) => s.activeRole)();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock the page while the sheet is open so the content behind it can't be
  // scrolled or rubber-banded. The mobile scroll container is `.main`; the body
  // is locked too as a belt-and-braces guard against overscroll wiggle.
  useEffect(() => {
    const main = document.querySelector('.main') as HTMLElement | null;
    const prevMain = main?.style.overflow ?? '';
    const prevBody = document.body.style.overflow;
    if (main) main.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      if (main) main.style.overflow = prevMain;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const actions = QUICK_ACTIONS.filter((a) => {
    const f = FEATURES.find((x) => x.key === a.featureKey);
    return !!f && flags[f.key] && roleMatchesAudience(f.audience, role);
  });

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={t('quickCreate.title')} onClick={onClose}>
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" aria-hidden="true" />
        <div className="sheet__head">
          <span className="sheet__title">{t('quickCreate.title')}</span>
          <button type="button" className="sheet__close" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>
        {actions.length === 0 ? (
          <div className="sheet__empty">{t('quickCreate.empty')}</div>
        ) : (
          <div className="sheet__actions">
            {actions.map((a) => (
              <button key={a.featureKey} type="button" className="sheet__action" onClick={() => go(a.to)}>
                <span className="sheet__action-icon">
                  <a.icon size={20} />
                </span>
                <span className="sheet__action-label">{t(a.labelKey)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
