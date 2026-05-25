import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Switch } from '@/shared/components/Switch';
import { EmptyState } from '@/shared/components/EmptyState';
import { useAuthStore } from '@/shared/store/authStore';
import type { ApartmentPerson } from '@/shared/types/domain';
import { apartmentShortLabel } from '@/features/apartment/apartmentLogic';
import { useApartment } from './apartmentsStore';
import {
  type ApartmentInput,
  PERSON_ROLES,
  apartmentToInput,
  applyApartmentEdit,
  newPerson,
  validateApartment,
} from './apartmentsLogic';
import { updateApartment } from './apartmentsApi';
import { EntranceField } from './EntranceField';

export default function ApartmentEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const apartment = useApartment(id);

  const [input, setInput] = useState<ApartmentInput | null>(() =>
    apartment ? apartmentToInput(apartment) : null,
  );
  const [persons, setPersons] = useState<ApartmentPerson[]>(() => apartment?.persons ?? []);
  const [active, setActive] = useState<boolean>(() => apartment?.is_active ?? true);

  if (!apartment || !input) {
    return (
      <div>
        <PageHeader title={t('apartments.edit', { label: '' })} />
        <EmptyState
          title={t('apartments.notFoundTitle')}
          body={t('apartments.notFoundBody')}
          action={
            <Button onClick={() => navigate('/app/admin/apartamente')}>
              <ArrowLeft className="h-4 w-4" /> {t('common.back')}
            </Button>
          }
        />
      </div>
    );
  }

  const errors = validateApartment(input);
  const setField = (key: keyof ApartmentInput, value: string) =>
    setInput((prev) => (prev ? { ...prev, [key]: value } : prev));

  const setPerson = (personId: string, patch: Partial<ApartmentPerson>) =>
    setPersons((prev) =>
      prev.map((p) => {
        if (p.id === personId) return { ...p, ...patch };
        // Only one occupant can be primary at a time: clear it on the others.
        return patch.is_primary ? { ...p, is_primary: false } : p;
      }),
    );

  const save = () => {
    if (!asociatieId) return;
    if (Object.keys(errors).length > 0) {
      toast.error(t('apartments.fixErrors'));
      return;
    }
    const updated = { ...applyApartmentEdit(apartment, input, persons), is_active: active };
    updateApartment(asociatieId, apartment, updated);
    toast.success(t('apartments.saved', { label: apartmentShortLabel(updated) }));
    navigate('/app/admin/apartamente');
  };

  return (
    <div>
      <PageHeader
        title={t('apartments.edit', { label: apartmentShortLabel(apartment) })}
        subtitle={t('apartments.editSubtitle')}
      />

      <Card className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <EntranceField
            label={t('apartments.scara')}
            value={input.scara}
            onChange={(value) => setField('scara', value)}
          />
          <Input
            type="number"
            label={t('apartments.etaj')}
            value={input.etaj}
            error={errors.etaj ? t('apartments.invalidField') : undefined}
            hint={t('apartments.etajHint')}
            onChange={(e) => setField('etaj', e.target.value)}
          />
          <Input
            label={t('apartments.number')}
            value={input.numar_apartament}
            error={errors.numar_apartament ? t('common.required') : undefined}
            onChange={(e) => setField('numar_apartament', e.target.value)}
          />
          <Input
            label={t('apartments.owner')}
            value={input.proprietar_principal_name}
            onChange={(e) => setField('proprietar_principal_name', e.target.value)}
          />
          <Input
            type="number"
            label={t('apartments.area')}
            value={input.suprafata_utila}
            error={errors.suprafata_utila ? t('apartments.invalidField') : undefined}
            onChange={(e) => setField('suprafata_utila', e.target.value)}
          />
          <Input
            type="number"
            label={t('apartments.sharePercent')}
            value={input.cota_parte_indiviza}
            error={errors.cota_parte_indiviza ? t('apartments.invalidField') : undefined}
            hint={t('apartments.shareFieldHint')}
            onChange={(e) => setField('cota_parte_indiviza', e.target.value)}
          />
          <Input
            type="number"
            label={t('apartments.personsCount')}
            value={input.numar_persoane}
            error={errors.numar_persoane ? t('apartments.invalidField') : undefined}
            hint={t('apartments.personsCountHint')}
            onChange={(e) => setField('numar_persoane', e.target.value)}
          />
        </div>
        <div className="mt-4">
          <Textarea
            label={t('apartments.notes')}
            value={input.notes}
            onChange={(e) => setField('notes', e.target.value)}
          />
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('apartments.persons')}</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPersons((prev) => [...prev, newPerson()])}
          >
            <Plus className="h-4 w-4" /> {t('apartments.addPerson')}
          </Button>
        </div>
        {persons.length === 0 ? (
          <p className="text-sm text-muted">{t('apartments.noPersons')}</p>
        ) : (
          <div className="space-y-2">
            {persons.map((p) => (
              <div key={p.id} className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
                <div className="min-w-40 flex-1">
                  <Input
                    label={t('apartments.personName')}
                    value={p.name}
                    onChange={(e) => setPerson(p.id, { name: e.target.value })}
                  />
                </div>
                <div className="w-40">
                  <Select
                    label={t('apartments.personRole')}
                    value={p.role}
                    onChange={(e) =>
                      setPerson(p.id, { role: e.target.value as ApartmentPerson['role'] })
                    }
                  >
                    {PERSON_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t(`apartments.role_${r}`)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    label={t('apartments.primary')}
                    checked={p.is_primary}
                    onChange={(v) => setPerson(p.id, { is_primary: v })}
                  />
                  <span className="text-sm text-muted">{t('apartments.primary')}</span>
                </div>
                <button
                  className="iconbtn mb-1.5"
                  style={{ width: 32, height: 32 }}
                  aria-label={t('apartments.removePerson')}
                  onClick={() => setPersons((prev) => prev.filter((x) => x.id !== p.id))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <label className="flex items-center gap-3">
          <Switch label={t('apartments.active')} checked={active} onChange={setActive} />
          <span className="text-sm">{t('apartments.active')}</span>
        </label>
      </Card>

      <div className="flex justify-between">
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
