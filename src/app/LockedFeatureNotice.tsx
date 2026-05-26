import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Lock, Send, Check, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { useAuthStore } from '@/shared/store/authStore';
import { useFeatureRequestStore } from '@/shared/store/featureRequestStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { featureTitle, type FeatureDef } from '@/shared/features/registry';

/**
 * The face a resident meets when they reach a module their asociație has not
 * enabled (T44 gating, T150 request). A disabled module is not a dead end: only
 * the admin controls the flags, so the resident cannot toggle it, but they can
 * ask. This panel states plainly what is going on and offers one action: notify
 * the admin that the module is wanted. Once asked, the CTA settles into a calm
 * confirmed state (deduped per resident) so a single tap can't pile duplicates
 * onto the admin queue.
 */
export function LockedFeatureNotice({
  feature,
  featureKey,
}: {
  feature: FeatureDef | undefined;
  featureKey: string;
}) {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const role = useAuthStore((s) => s.activeRole());
  const userId = session?.user?.id ?? profile?.id ?? DEMO_CURRENT_USER_ID;
  // An admin / president controls the flags themselves, so they get a direct
  // route to turn the module on rather than the resident's "ask the admin" CTA.
  const canEnable = role === 'admin' || role === 'presedinte';

  const fileRequest = useFeatureRequestStore((s) => s.request);
  const alreadyRequested = useFeatureRequestStore((s) =>
    asociatieId ? s.has(asociatieId, featureKey, userId) : false,
  );
  const [justSent, setJustSent] = useState(false);
  const requested = alreadyRequested || justSent;

  const title = feature ? featureTitle(t, feature) : t('chrome.features');

  const onRequest = () => {
    if (!asociatieId) return;
    const isNew = fileRequest(asociatieId, featureKey, userId, profile?.full_name ?? null);
    setJustSent(true);
    toast.success(
      t(isNew ? 'common.requestFeatureToast' : 'common.requestFeatureAlreadyToast'),
    );
  };

  return (
    <div className="locked-feature" role="region" aria-label={title}>
      <span className="locked-feature__medallion" aria-hidden>
        <span className="locked-feature__halo" />
        <Lock size={26} strokeWidth={1.75} />
      </span>

      {feature && <span className="locked-feature__key">{feature.key}</span>}
      <h1 className="locked-feature__title">{title}</h1>
      <p className="locked-feature__body">{t('common.featureDisabled')}</p>
      {!canEnable && <p className="locked-feature__hint">{t('common.featureDisabledHint')}</p>}

      <div className="locked-feature__actions">
        {canEnable ? (
          <Link className="btn btn--primary" to="/app/admin/functionalitati">
            <SlidersHorizontal size={16} aria-hidden /> {t('common.enableFeature')}
          </Link>
        ) : (
          asociatieId &&
          (requested ? (
            <span className="locked-feature__sent" role="status">
              <Check size={16} strokeWidth={2.25} aria-hidden />
              {t('common.requestFeatureConfirm')}
            </span>
          ) : (
            <button type="button" className="btn btn--primary" onClick={onRequest}>
              <Send size={16} aria-hidden /> {t('common.requestFeature')}
            </button>
          ))
        )}
        <Link className="btn btn--ghost" to="/app">
          <ArrowLeft size={16} aria-hidden /> {t('chrome.home')}
        </Link>
      </div>
    </div>
  );
}
