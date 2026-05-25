import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, Check } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { useAuthStore } from '@/shared/store/authStore';
import { useAsociatieStore, useCurrentAsociatie } from './asociatieStore';
import {
  type EntranceMode,
  detectEntranceConfig,
  entranceInterval,
  entranceOptions,
  scariList,
} from './buildingLogic';

export default function BuildingSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const asociatie = useCurrentAsociatie();
  const update = useAsociatieStore((s) => s.update);

  const initialEntrances = useMemo(
    () => detectEntranceConfig(scariList(asociatie?.settings)),
    [asociatie?.settings],
  );

  const [form, setForm] = useState(() => ({
    name: asociatie?.name ?? '',
    address: asociatie?.address ?? '',
    cui: asociatie?.cui ?? '',
    registration_number: asociatie?.registration_number ?? '',
  }));
  const [mode, setMode] = useState<EntranceMode>(initialEntrances.mode);
  const [first, setFirst] = useState(initialEntrances.first);
  const [last, setLast] = useState(initialEntrances.last);

  const options = entranceOptions(mode);
  const preview = entranceInterval(mode, first, last);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const changeMode = (next: EntranceMode) => {
    setMode(next);
    // Reset the bounds to the first option of the new mode so they stay valid.
    const opts = entranceOptions(next);
    setFirst(opts[0]);
    setLast(opts[0]);
  };

  const save = () => {
    if (!asociatieId || !asociatie) return;
    if (form.name.trim() === '') {
      toast.error(t('common.required'));
      return;
    }
    update(asociatieId, {
      name: form.name.trim(),
      address: form.address.trim(),
      cui: form.cui.trim() || null,
      registration_number: form.registration_number.trim() || null,
      settings: { ...asociatie.settings, scari: preview },
    });
    toast.success(t('building.saved'));
    navigate('/app/admin/apartamente');
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
            />
            <Input
              label={t('building.regNumber')}
              value={form.registration_number}
              onChange={(e) => set('registration_number', e.target.value)}
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
      <div className="mt-5 flex justify-between">
        <Button variant="ghost" onClick={() => navigate('/app/admin/apartamente')}>
          <ArrowLeft className="h-4 w-4" /> {t('common.back')}
        </Button>
        <Button onClick={save}>
          <Check className="h-4 w-4" /> {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
