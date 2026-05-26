import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, Mail, Plus, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Switch } from '@/shared/components/Switch';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { useAuthStore } from '@/shared/store/authStore';
import { useInviteStore } from '@/shared/store/inviteStore';
import { recordAudit } from '@/shared/store/auditStore';
import { isValidEmail } from '@/features/auth/authLogic';
import { isApartmentRegistered } from '@/features/invites/inviteLogic';
import type { Apartment, ApartmentPerson } from '@/shared/types/domain';
import { apartmentShortLabel } from '@/features/apartment/apartmentLogic';
import { useApartment } from './apartmentsStore';
import {
  type ApartmentInput,
  PERSON_ROLES,
  apartmentToInput,
  applyApartmentEdit,
  blankApartmentInput,
  newApartment,
  newPerson,
  validateApartment,
} from './apartmentsLogic';
import { createApartments, updateApartment } from './apartmentsApi';
import { EntranceField } from './EntranceField';

/**
 * One apartment at a time: the same form serves both adding a brand-new unit
 * (no `:id`) and editing an existing one. In edit mode the header also carries
 * the occupant's onboarding status and, when they have no account yet, the
 * actions to invite them (jump to the codes page, or capture an email).
 */
export default function ApartmentFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const apartment = useApartment(id);
  const invites = useInviteStore((s) => s.invites);
  const issue = useInviteStore((s) => s.issue);

  const [input, setInput] = useState<ApartmentInput>(() =>
    // Drop the stored count so the occupant total always derives from the person
    // list below (see inputToFields); a fresh apartment starts blank.
    apartment ? { ...apartmentToInput(apartment), numar_persoane: '' } : blankApartmentInput(),
  );
  const [persons, setPersons] = useState<ApartmentPerson[]>(() => apartment?.persons ?? []);
  const [active, setActive] = useState<boolean>(() => apartment?.is_active ?? true);

  if (isEdit && !apartment) {
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
    setInput((prev) => ({ ...prev, [key]: value }));

  const setPerson = (personId: string, patch: Partial<ApartmentPerson>) =>
    setPersons((prev) =>
      prev.map((p) => {
        if (p.id === personId) return { ...p, ...patch };
        // Only one occupant can be primary at a time: clear it on the others.
        return patch.is_primary ? { ...p, is_primary: false } : p;
      }),
    );

  // The occupant the onboarding status + invite actions target.
  const primary = persons.find((p) => p.is_primary) ?? persons[0];
  const primaryName = primary?.name.trim() || input.proprietar_principal_name.trim() || '';
  const contactEmail = primary?.email ?? '';
  const registered = isEdit && apartment ? isApartmentRegistered(apartment.id, invites) : false;

  /** Persist the current form (create or update) and return the saved apartment,
   *  or null when the asociație is missing or a field is invalid. */
  const persist = (): Apartment | null => {
    if (!asociatieId) return null;
    if (Object.keys(errors).length > 0) {
      toast.error(t('apartments.fixErrors'));
      return null;
    }
    if (isEdit && apartment) {
      const updated = { ...applyApartmentEdit(apartment, input, persons), is_active: active };
      updateApartment(asociatieId, apartment, updated);
      return updated;
    }
    const created = { ...newApartment(input, asociatieId, persons), is_active: active };
    createApartments(asociatieId, [created]);
    return created;
  };

  const onSave = () => {
    const saved = persist();
    if (!saved) return;
    toast.success(
      isEdit ? t('apartments.saved', { label: apartmentShortLabel(saved) }) : t('apartments.created', { count: 1 }),
    );
    navigate('/app/admin/apartamente');
  };

  // Save the form first (so edits are not lost), then open the codes page with the
  // apartment/role/recipient prefilled and the code auto-issued.
  const onSendInvite = () => {
    if (!apartment) return;
    if (!persist()) return;
    navigate('/app/admin/invitatii', {
      state: {
        prefill: {
          apartmentId: apartment.id,
          role: 'proprietar',
          inviteeName: primaryName,
          inviteeEmail: contactEmail.trim(),
          autoIssue: true,
        },
      },
    });
  };

  // Capture the email on the occupant, mint the invite now; real delivery is T147.
  const onSendByEmail = () => {
    if (!apartment || !asociatieId) return;
    if (!isValidEmail(contactEmail)) {
      toast.error(t('apartments.emailInvalid'));
      return;
    }
    if (!persist()) return;
    const invite = issue({
      asociatieId,
      role: 'proprietar',
      apartmentId: apartment.id,
      expiresAt: null,
      singleUse: true,
      createdBy: userId,
      inviteeName: primaryName,
      inviteeEmail: contactEmail.trim(),
    });
    recordAudit({
      action: 'invite.issued',
      entity: 'invite',
      entity_label: invite.code,
      before: null,
      after: invite.role,
    });
    toast.success(t('apartments.emailQueued'));
  };

  const statusBlock =
    isEdit && apartment ? (
      registered ? (
        <Badge tone="success">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> {t('apartments.statusRegistered')}
        </Badge>
      ) : (
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{t('apartments.statusNotRegistered')}</Badge>
            <Button variant="secondary" size="sm" onClick={onSendInvite}>
              <Send className="h-4 w-4" /> {t('apartments.sendInvite')}
            </Button>
          </div>
          {primary && (
            <div className="flex items-end gap-2">
              <Input
                type="email"
                className="w-52"
                aria-label={t('apartments.personEmail')}
                placeholder={t('apartments.personEmail')}
                value={contactEmail}
                onChange={(e) => setPerson(primary.id, { email: e.target.value })}
              />
              <Button size="sm" onClick={onSendByEmail}>
                <Mail className="h-4 w-4" /> {t('apartments.sendByEmail')}
              </Button>
            </div>
          )}
        </div>
      )
    ) : undefined;

  return (
    <div>
      <PageHeader
        title={isEdit ? t('apartments.edit', { label: apartmentShortLabel(apartment!) }) : t('apartments.addOneTitle')}
        subtitle={isEdit ? t('apartments.editSubtitle') : t('apartments.addOneSubtitle')}
        action={statusBlock}
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
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-semibold">{t('apartments.persons')}</h2>
            <span className="text-sm text-muted">
              {t('apartments.personsTotal', {
                count: persons.filter((p) => p.name.trim() !== '').length,
              })}
            </span>
          </div>
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
                <div className="min-w-48 flex-1">
                  <Input
                    type="email"
                    label={t('apartments.personEmail')}
                    value={p.email ?? ''}
                    onChange={(e) => setPerson(p.id, { email: e.target.value })}
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
        <Button onClick={onSave}>
          <Check className="h-4 w-4" /> {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
