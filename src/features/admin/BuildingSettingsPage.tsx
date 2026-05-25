import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, Check } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { useAuthStore } from '@/shared/store/authStore';
import { useAsociatieStore, useCurrentAsociatie } from './asociatieStore';

/** Read the building's stairwells from the flexible settings bag (string list). */
function readScari(settings: Record<string, unknown>): string {
  const value = settings.scari;
  return Array.isArray(value) ? value.join(', ') : '';
}

export default function BuildingSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const asociatie = useCurrentAsociatie();
  const update = useAsociatieStore((s) => s.update);

  const [form, setForm] = useState(() => ({
    name: asociatie?.name ?? '',
    address: asociatie?.address ?? '',
    cui: asociatie?.cui ?? '',
    registration_number: asociatie?.registration_number ?? '',
    scari: asociatie ? readScari(asociatie.settings) : '',
  }));

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    if (!asociatieId || !asociatie) return;
    if (form.name.trim() === '') {
      toast.error(t('common.required'));
      return;
    }
    const scari = form.scari
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');
    update(asociatieId, {
      name: form.name.trim(),
      address: form.address.trim(),
      cui: form.cui.trim() || null,
      registration_number: form.registration_number.trim() || null,
      settings: { ...asociatie.settings, scari },
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
          <Textarea
            label={t('building.scari')}
            value={form.scari}
            hint={t('building.scariHint')}
            onChange={(e) => set('scari', e.target.value)}
          />
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
