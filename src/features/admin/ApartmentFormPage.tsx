import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertCircle, ArrowLeft, Check, Link2, Mail, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useFormState } from '@/shared/lib/useFormState';
import { isFormDirty, useUnsavedGuard } from '@/shared/lib/useUnsavedGuard';
import { UnsavedChangesModal } from '@/shared/components/UnsavedChangesModal';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Switch } from '@/shared/components/Switch';
import { Modal } from '@/shared/components/Modal';
import { EmptyState } from '@/shared/components/EmptyState';
import { InfoTip } from '@/shared/components/InfoTip';
import { useAuthStore } from '@/shared/store/authStore';
import { useInviteStore } from '@/shared/store/inviteStore';
import { recordAudit } from '@/shared/store/auditStore';
import { isValidEmail } from '@/features/auth/authLogic';
import { isApartmentRegistered, onboardingExpiry } from '@/features/invites/inviteLogic';
import { inviteEmailErrorKey, sendInviteEmail } from '@/features/invites/inviteEmailApi';
import { writeInviteToLive } from '@/features/invites/inviteWriteApi';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import type { Apartment, ApartmentPerson } from '@/shared/types/domain';
import { apartmentShortLabel } from '@/features/apartment/apartmentLogic';
import { useApartment } from './apartmentsStore';
import {
  type ApartmentInput,
  PERSON_ROLES,
  apartmentToInput,
  applyApartmentEdit,
  blankApartmentInput,
  isPersonClaimed,
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const asociatieName = useAuthStore(
    (s) => s.localAsociatii.find((a) => a.id === s.currentAsociatieId)?.name ?? '',
  );
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const apartment = useApartment(id);
  const invites = useInviteStore((s) => s.invites);
  const issue = useInviteStore((s) => s.issue);
  const markEmailSent = useInviteStore((s) => s.markEmailSent);

  const [input, setInput] = useState<ApartmentInput>(() =>
    // Drop the stored count so the occupant total always derives from the person
    // list below (see inputToFields); a fresh apartment starts blank.
    apartment ? { ...apartmentToInput(apartment), numar_persoane: '' } : blankApartmentInput(),
  );
  const [persons, setPersons] = useState<ApartmentPerson[]>(() => apartment?.persons ?? []);
  const active = apartment?.is_active ?? true;
  const [saving, setSaving] = useState(false);
  // Invite-by-email modal state.
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  // Delete-person confirmation: holds the id of the person pending removal.
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Hooks must run before any early return.
  const errors = validateApartment(input);
  const { fieldError, handleSubmit } = useFormState(errors);
  const initialInputRef = useRef<ApartmentInput>(
    apartment ? { ...apartmentToInput(apartment), numar_persoane: '' } : blankApartmentInput(),
  );
  const initialPersonsRef = useRef<ApartmentPerson[]>(apartment?.persons ?? []);
  const isDirty =
    isFormDirty(input, initialInputRef.current) ||
    isFormDirty(persons, initialPersonsRef.current);
  const { guardModal, clearDirty } = useUnsavedGuard(isDirty);

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

  /** Show a bilingual error toast for a live write failure. */
  const handleWriteError = (err: 'conflict' | 'write-failed') => {
    toast.error(t(err === 'conflict' ? 'apartments.conflictError' : 'apartments.saveFailed'));
  };

  /** Persist the current form (create or update) and return the saved apartment,
   *  or null when the asociație is missing or a field is invalid. */
  const persist = async (): Promise<Apartment | null> => {
    if (!asociatieId) return null;
    if (!handleSubmit()) {
      toast.error(t('apartments.fixErrors'));
      return null;
    }
    if (isEdit && apartment) {
      const updated = { ...applyApartmentEdit(apartment, input, persons), is_active: active };
      return (await updateApartment(asociatieId, apartment, updated, handleWriteError)) ? updated : null;
    }
    const created = { ...newApartment(input, asociatieId, persons), is_active: active };
    return (await createApartments(asociatieId, [created], handleWriteError)) ? created : null;
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await persist();
      if (!saved) return;
      toast.success(
        isEdit ? t('apartments.saved', { label: apartmentShortLabel(saved) }) : t('apartments.created', { count: 1 }),
      );
      clearDirty();
      navigate('/app/admin/apartamente');
    } finally {
      setSaving(false);
    }
  };

  // Persons with a valid email -- used to populate the invite modal's selection list.
  const emailPersons = persons.filter(
    (p): p is ApartmentPerson & { email: string } =>
      Boolean(p.email?.trim()) && isValidEmail(p.email!),
  );

  // Open the invite modal, resetting selection to the primary occupant's email.
  const openInviteModal = () => {
    setSelectedEmail(contactEmail);
    setCustomEmail('');
    setInviteModalOpen(true);
  };

  // Mint the invite and deliver it via email. The custom-email field takes
  // precedence over the radio selection so the admin can always override.
  const onConfirmInvite = async () => {
    if (!apartment || !asociatieId) return;
    const effectiveEmail = customEmail.trim() || selectedEmail;
    if (!isValidEmail(effectiveEmail)) {
      toast.error(t('apartments.emailInvalid'));
      return;
    }
    if (!(await persist())) return;
    const invite = issue({
      asociatieId,
      asociatieName,
      role: 'proprietar',
      apartmentId: apartment.id,
      expiresAt: onboardingExpiry(),
      singleUse: true,
      createdBy: userId,
      inviteeName: primaryName,
      inviteeEmail: effectiveEmail,
    });
    recordAudit({
      action: 'invite.issued',
      entity: 'invite',
      entity_label: invite.code,
      before: null,
      after: invite.role,
    });
    // Persist the invite to the live backend so the redemption RPC and the
    // invite-email function can find the row. A failed write would make the
    // email function return 404, so surface it instead of a doomed send.
    if (isSupabaseConfigured) {
      const writeResult = await writeInviteToLive(invite);
      if (!writeResult.ok) {
        console.warn('[invite-email] write failed:', writeResult.error);
        toast.error(t(inviteEmailErrorKey('invite-not-found')));
        return;
      }
    }
    const result = await sendInviteEmail({
      invite,
      locale: i18n.language,
    });
    if (!result.ok) {
      console.warn('[invite-email] send failed:', result.error);
      toast.error(t(inviteEmailErrorKey(result.error)));
      return;
    }
    markEmailSent(invite.id);
    recordAudit({
      action: 'invite.email_sent',
      entity: 'invite',
      entity_label: invite.code,
      before: null,
      after: null,
    });
    toast.success(t('apartments.emailSent', { email: effectiveEmail }));
    setInviteModalOpen(false);
  };

  const statusBlock =
    isEdit && apartment ? (
      registered ? (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 'var(--radius)',
            background: 'color-mix(in oklch, var(--color-success) 12%, transparent)',
            border: '1.5px solid color-mix(in oklch, var(--color-success) 30%, transparent)',
            color: 'var(--color-success)',
            fontWeight: 600,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          <ShieldCheck size={17} strokeWidth={2.2} />
          {t('apartments.statusRegistered')}
        </div>
      ) : (
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 'var(--radius)',
              background: 'color-mix(in oklch, var(--color-warning) 12%, transparent)',
              border: '1.5px solid color-mix(in oklch, var(--color-warning) 30%, transparent)',
              color: 'var(--color-warning)',
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            <AlertCircle size={17} strokeWidth={2.2} />
            {t('apartments.statusNotRegistered')}
          </div>
          <Button onClick={openInviteModal}>
            <Mail className="h-4 w-4" /> {t('apartments.sendInvite')}
          </Button>
        </div>
      )
    ) : undefined;

  return (
    <div className="apt-form">
      <PageHeader
        title={isEdit ? t('apartments.edit', { label: apartmentShortLabel(apartment!) }) : t('apartments.addOneTitle')}
        subtitle={isEdit ? t('apartments.editSubtitle') : t('apartments.addOneSubtitle')}
        action={statusBlock}
      />

      <Card>
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          <EntranceField
            label={t('apartments.scara')}
            value={input.scara}
            onChange={(value) => setField('scara', value)}
          />
          <Input
            type="number"
            label={
              <span className="inline-flex items-center gap-1">
                {t('apartments.etaj')}
                <InfoTip hint={t('apartments.etajHint')} />
              </span>
            }
            value={input.etaj}
            error={fieldError('etaj') ? t('apartments.invalidField') : undefined}
            onChange={(e) => setField('etaj', e.target.value)}
          />
          <Input
            label={
              <span className="inline-flex items-center gap-1">
                {t('apartments.number')}
                <span className="text-danger" aria-hidden="true">
                  *
                </span>
              </span>
            }
            value={input.numar_apartament}
            error={fieldError('numar_apartament') ? t('common.required') : undefined}
            onChange={(e) => setField('numar_apartament', e.target.value)}
          />
          <Input
            type="number"
            label={t('apartments.area')}
            value={input.suprafata_utila}
            error={fieldError('suprafata_utila') ? t('apartments.invalidField') : undefined}
            onChange={(e) => setField('suprafata_utila', e.target.value)}
          />
          <Input
            type="number"
            label={
              <span className="inline-flex items-center gap-1">
                {t('apartments.sharePercent')}
                <InfoTip hint={t('apartments.shareFieldHint')} />
              </span>
            }
            value={input.cota_parte_indiviza}
            error={fieldError('cota_parte_indiviza') ? t('apartments.invalidField') : undefined}
            onChange={(e) => setField('cota_parte_indiviza', e.target.value)}
          />
        </div>
        <div className="mt-3 grid gap-x-3 gap-y-3 sm:grid-cols-2">
          <Input
            label={t('apartments.owner')}
            value={input.proprietar_principal_name}
            onChange={(e) => setField('proprietar_principal_name', e.target.value)}
          />
          <Input
            type="email"
            label={t('apartments.ownerEmail')}
            value={input.proprietar_principal_email}
            onChange={(e) => setField('proprietar_principal_email', e.target.value)}
          />
        </div>
        <div className="mt-3">
          <Input
            label={t('apartments.notes')}
            value={input.notes}
            onChange={(e) => setField('notes', e.target.value)}
          />
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-semibold">{t('apartments.personsSection')}</h2>
            <span className="text-sm text-muted">
              {t('apartments.personsTotal', {
                count: persons.filter((p) => p.name.trim() !== '').length,
              })}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const ownerName = input.proprietar_principal_name.trim();
              const ownerEmail = input.proprietar_principal_email.trim();
              const hasData = Boolean(ownerName || ownerEmail);
              const alreadyInList = hasData && persons.some(
                (p) =>
                  (ownerName && p.name.trim().toLowerCase() === ownerName.toLowerCase()) ||
                  (ownerEmail && p.email?.trim().toLowerCase() === ownerEmail.toLowerCase()),
              );
              const prefill = hasData && !alreadyInList;
              setPersons((prev) => [
                ...prev,
                {
                  ...newPerson(prefill ? 'proprietar' : 'locatar'),
                  name: prefill ? ownerName : '',
                  email: prefill ? (ownerEmail || null) : null,
                  is_primary: prev.length === 0,
                },
              ]);
            }}
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
                    label={
                      isPersonClaimed(p) ? (
                        <span className="inline-flex items-center gap-1">
                          {t('apartments.personName')}
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ background: 'var(--success-soft)', color: 'var(--success)' }}
                            title={t('apartments.personLinked')}
                          >
                            <Link2 size={10} />
                            {t('apartments.personLinked')}
                          </span>
                        </span>
                      ) : t('apartments.personName')
                    }
                    value={p.name}
                    onChange={(e) => setPerson(p.id, { name: e.target.value })}
                    disabled={isPersonClaimed(p)}
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
                <Button
                  variant="danger"
                  size="sm"
                  aria-label={t('apartments.removePerson')}
                  onClick={() => setDeleteConfirmId(p.id)}
                  style={{ marginBottom: 6, flexShrink: 0 }}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => navigate('/app/admin/apartamente')}>
          <ArrowLeft className="h-4 w-4" /> {t('common.back')}
        </Button>
        <Button onClick={onSave} loading={saving}>
          <Check className="h-4 w-4" /> {t('common.save')}
        </Button>
      </div>

      {/* ── Delete-person confirmation ───────────────────────── */}
      <Modal
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title={t('apartments.removePersonConfirmTitle')}
        footer={
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteConfirmId) {
                  setPersons((prev) => prev.filter((x) => x.id !== deleteConfirmId));
                }
                setDeleteConfirmId(null);
              }}
            >
              <Trash2 className="h-4 w-4" /> {t('apartments.removePerson')}
            </Button>
          </div>
        }
      >
        <p className="text-sm">{t('apartments.removePersonConfirmBody')}</p>
      </Modal>

      {isEdit && apartment && !registered && (
        <Modal
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          title={t('apartments.sendInvite')}
          footer={
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={() => setInviteModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={onConfirmInvite}>
                <Mail className="h-4 w-4" /> {t('apartments.sendByEmail')}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm">
              {t('apartments.inviteModalBody', { label: apartmentShortLabel(apartment) })}
            </p>

            {emailPersons.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  {t('apartments.inviteModalSelectEmail')}
                </p>
                <div className="space-y-1">
                  {emailPersons.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--surface-raised)]"
                    >
                      <input
                        type="radio"
                        name="invite-email"
                        value={p.email}
                        checked={selectedEmail === p.email && !customEmail.trim()}
                        onChange={() => {
                          setSelectedEmail(p.email);
                          setCustomEmail('');
                        }}
                        className="accent-[var(--accent)]"
                      />
                      <span className="flex-1 text-sm">
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-1 text-muted">
                          ({t(`apartments.role_${p.role}`)})
                        </span>
                      </span>
                      <span className="font-mono text-sm text-muted">{p.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                <span className="text-xs uppercase tracking-wide text-muted">
                  {t('apartments.inviteModalOrNew')}
                </span>
                <div className="h-px flex-1 bg-[var(--border-subtle)]" />
              </div>
              <Input
                type="email"
                label={t('apartments.inviteModalNewEmailLabel')}
                placeholder={t('apartments.emailPlaceholder')}
                hint={t('apartments.inviteModalNewEmailHint')}
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      <UnsavedChangesModal {...guardModal} />
    </div>
  );
}
