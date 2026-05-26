import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Input, Textarea } from '@/shared/components/Input';
import { Switch } from '@/shared/components/Switch';
import { Badge } from '@/shared/components/Badge';
import {
  FEATURE_CATEGORIES,
  FEATURES,
  RECOMMENDED_FEATURES,
  categoryLabel,
  featureTitle,
  type FeatureCategory,
} from '@/shared/features/registry';
import { useFeatureStore } from '@/shared/features/featureStore';
import { useAuthStore } from '@/shared/store/authStore';

/**
 * Three-step wizard that an admin lands on after accepting their setup link
 * (T154). Steps: Profile -> Features -> Branding. On finish the asociatie is
 * created locally and the admin is sent directly to the Apartments page so they
 * can import their apartment list (T155/T156). The CSV-import step that used to
 * live here has moved to ApartmentsPage; the bulk-invite step has moved to
 * InvitesAdminPage.
 */
const STEPS = ['profile', 'features', 'branding'] as const;

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAll = useFeatureStore((s) => s.setAll);
  const createLocalAsociatie = useAuthStore((s) => s.createLocalAsociatie);

  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ name: '', address: '', cui: '', regNumber: '' });
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(RECOMMENDED_FEATURES.map((k) => [k, true])),
  );
  const [branding, setBranding] = useState({ color: '#2563eb', welcome: '' });

  const finish = () => {
    // Create the asociatie locally (founder becomes its admin and it is selected
    // as active), so the user clears the RequireAsociatie gate and lands in a
    // real tenant context. Live persistence is a separate activation step (T55).
    const asociatieId = createLocalAsociatie(profile.name);
    // Scope the chosen feature set to the new asociatie so its flags are its own.
    setAll(asociatieId, selected);
    toast.success(t('onboarding.finishHint'));
    // Land the admin directly on the Apartments page so they can import their
    // apartment list and send invite emails without extra navigation.
    navigate('/app/admin/apartamente');
  };

  const canNext =
    step === 0 ? profile.name.trim().length > 0 && profile.address.trim().length > 0 : true;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t('onboarding.title')}</h1>
        <p className="text-muted">{t('onboarding.step', { current: step + 1, total: STEPS.length })}</p>
        <div className="mt-3 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-surface-2'}`}
            />
          ))}
        </div>
      </div>

      <Card>
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('onboarding.profile')}</h2>
            <Input
              label={t('onboarding.name')}
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <Input
              label={t('onboarding.address')}
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('onboarding.cui')}
                value={profile.cui}
                onChange={(e) => setProfile({ ...profile, cui: e.target.value })}
              />
              <Input
                label={t('onboarding.regNumber')}
                value={profile.regNumber}
                onChange={(e) => setProfile({ ...profile, regNumber: e.target.value })}
              />
            </div>
            <p className="border-t border-border pt-4 text-sm text-muted">
              {t('onboarding.haveCode')}{' '}
              <Link to="/configurare-cont" className="auth-link">
                {t('onboarding.joinLink')}
              </Link>
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">{t('onboarding.features')}</h2>
            <p className="text-sm text-muted">{t('onboarding.selectFeatures')}</p>
            {(Object.keys(FEATURE_CATEGORIES) as FeatureCategory[]).map((cat) => (
              <div key={cat}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {categoryLabel(t, cat)}
                </p>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {FEATURES.filter((f) => f.category === cat).map((f) => (
                    <label key={f.key} className="flex cursor-pointer items-center gap-3 p-2.5">
                      <Switch
                        label={featureTitle(t, f)}
                        checked={Boolean(selected[f.key])}
                        onChange={(v) => setSelected((s) => ({ ...s, [f.key]: v }))}
                      />
                      <span className="flex-1 text-sm">{featureTitle(t, f)}</span>
                      {RECOMMENDED_FEATURES.includes(f.key) && (
                        <Badge tone="success">{t('onboarding.recommended')}</Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('onboarding.branding')}</h2>
            <div>
              <label htmlFor="brand-color" className="block text-sm font-medium">
                {t('onboarding.primaryColor')}
              </label>
              <input
                id="brand-color"
                type="color"
                value={branding.color}
                onChange={(e) => setBranding({ ...branding, color: e.target.value })}
                className="mt-1 h-11 w-20 rounded border border-border"
              />
            </div>
            <Textarea
              label={t('onboarding.welcomeMessage')}
              value={branding.welcome}
              onChange={(e) => setBranding({ ...branding, welcome: e.target.value })}
            />
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            {t('common.back')}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              {t('common.next')}
            </Button>
          ) : (
            <Button onClick={finish}>
              <Check className="h-4 w-4" /> {t('common.finish')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
