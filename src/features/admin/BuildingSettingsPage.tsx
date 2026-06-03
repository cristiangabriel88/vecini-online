import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { useAuthStore } from '@/shared/store/authStore';
import { useCurrentAsociatie } from './asociatieStore';
import {
  type BuildingIdentityForm,
  type EntranceMode,
  detectEntranceConfig,
  entranceInterval,
  entranceOptions,
  scariList,
  validateBuildingIdentity,
} from './buildingLogic';
import { hydrateAsociatie, saveAsociatie } from './asociatieApi';

export default function BuildingSettingsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const asociatie = useCurrentAsociatie();

  const initialEntrances = useMemo(
    () => detectEntranceConfig(scariList(asociatie?.settings)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [form, setFormState] = useState(() => ({
    name: asociatie?.name ?? '',
    address: asociatie?.address ?? '',
    cui: asociatie?.cui ?? '',
    registration_number: asociatie?.registration_number ?? '',
    iban: asociatie?.iban ?? '',
    contact_phone: asociatie?.contact_phone ?? '',
    contact_email: asociatie?.contact_email ?? '',
  }));
  const [mode, setMode] = useState<EntranceMode>(initialEntrances.mode);
  const [first, setFirst] = useState(initialEntrances.first);
  const [last, setLast] = useState(initialEntrances.last);
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate from DB on mount
  useEffect(() => {
    void hydrateAsociatie(asociatieId ?? '');
  }, [asociatieId]);

  // Sync form from store after hydration, unless the user has made edits
  useEffect(() => {
    if (dirty || !asociatie) return;
    setFormState({
      name: asociatie.name ?? '',
      address: asociatie.address ?? '',
      cui: asociatie.cui ?? '',
      registration_number: asociatie.registration_number ?? '',
      iban: asociatie.iban ?? '',
      contact_phone: asociatie.contact_phone ?? '',
      contact_email: asociatie.contact_email ?? '',
    });
    const cfg = detectEntranceConfig(scariList(asociatie.settings));
    setMode(cfg.mode);
    setFirst(cfg.first);
    setLast(cfg.last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asociatie]);

  const options = entranceOptions(mode);
  const preview = entranceInterval(mode, first, last);

  const { errors, value: validated } = useMemo(
    () => validateBuildingIdentity(form),
    [form],
  );

  const set = (key: keyof typeof form, value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const fieldError = (key: keyof BuildingIdentityForm) =>
    touched && errors[key] ? t(`building.err.${errors[key]}`) : undefined;

  const changeMode = (next: EntranceMode) => {
    setMode(next);
    const opts = entranceOptions(next);
    setFirst(opts[0]);
    setLast(opts[0]);
    setDirty(true);
  };

  const save = async () => {
    if (!asociatieId || !asociatie) return;
    setTouched(true);
    if (!validated) {
      toast.error(t('building.fixErrors'));
      return;
    }
    setSaving(true);
    const result = await saveAsociatie(asociatieId, {
      name: validated.name,
      address: validated.address,
      cui: validated.cui || null,
      registration_number: validated.registration_number || null,
      iban: validated.iban || null,
      contact_phone: validated.contact_phone || null,
      contact_email: validated.contact_email || null,
      settings: { ...asociatie.settings, scari: preview },
    });
    setSaving(false);
    if (result === 'conflict') {
      toast.error(t('building.err.cuiConflict'));
      return;
    }
    toast.success(t('building.saved'));
    setDirty(false);
  };

  return (
    <div>
      <PageHeader title={t('building.title')} subtitle={t('building.subtitle')} />
      <Card>
        <div className="space-y-4">
          <Input
            label={t('building.name')}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            error={fieldError('name')}
          />
          <Input
            label={t('building.address')}
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('building.cui')}
              value={form.cui}
              onChange={(e) => set('cui', e.target.value)}
              error={fieldError('cui')}
            />
            <Input
              label={t('building.regNumber')}
              value={form.registration_number}
              onChange={(e) => set('registration_number', e.target.value)}
            />
          </div>
          <Input
            label={t('building.iban')}
            value={form.iban}
            onChange={(e) => set('iban', e.target.value)}
            error={fieldError('iban')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('building.contactPhone')}
              type="tel"
              value={form.contact_phone}
              onChange={(e) => set('contact_phone', e.target.value)}
              error={fieldError('contact_phone')}
            />
            <Input
              label={t('building.contactEmail')}
              type="email"
              value={form.contact_email}
              onChange={(e) => set('contact_email', e.target.value)}
              error={fieldError('contact_email')}
            />
          </div>

          <div className="border-t border-border pt-4">
            <p className="field__label">{t('building.scari')}</p>
            <p className="mb-3 text-sm text-muted">{t('building.scariHint')}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                label={t('building.entrancesMode')}
                value={mode}
                onChange={(e) => changeMode(e.target.value as EntranceMode)}
              >
                <option value="letters">{t('building.modeLetters')}</option>
                <option value="numbers">{t('building.modeNumbers')}</option>
              </Select>
              <Select
                label={t('building.firstEntrance')}
                value={first}
                onChange={(e) => setFirst(e.target.value)}
              >
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
              <Select
                label={t('building.lastEntrance')}
                value={last}
                onChange={(e) => setLast(e.target.value)}
              >
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </div>
            <p className="mt-2 text-sm text-muted">
              {t('building.entrancesPreview', { list: preview.join(', ') })}
            </p>
          </div>
        </div>
      </Card>
      <div className="mt-5 flex justify-end">
        <Button onClick={save} loading={saving}>
          <Check className="h-4 w-4" /> {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
