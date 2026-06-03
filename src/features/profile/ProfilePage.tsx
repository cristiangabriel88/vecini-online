import { useMemo, useRef, useState } from 'react';
import { genId } from '@/shared/lib/id';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  GripVertical,
  LogOut,
  Plus,
  Sparkles,
  ShieldCheck,
  Shield,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Switch } from '@/shared/components/Switch';
import { Modal } from '@/shared/components/Modal';
import { EmptyState } from '@/shared/components/EmptyState';
import i18n from '@/shared/lib/i18n';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_APARTMENTS } from '@/shared/demo/demoData';
import { useCurrentAsociatie } from '@/features/admin/asociatieStore';
import type { Locale } from '@/shared/types/domain';
import { useMyIdentity, useProfileStore } from './profileStore';
import { fileToAvatar } from './avatarImage';
import {
  AVATAR_MAX_BYTES,
  CUSTOM_FIELD_TYPES,
  type CustomField,
  type CustomFieldType,
  type FieldVisibility,
  type ProfileData,
  addCustomField,
  completeness,
  initials,
  isAcceptedImageType,
  moveCustomField,
  newCustomField,
  reorderCustomField,
  removeCustomField,
  sortedCustomFields,
  updateCustomField,
  validateCustomFieldValue,
  validateStandard,
} from './profileLogic';

const VISIBILITIES: FieldVisibility[] = ['private', 'neighbours'];

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);
  const { userId, email } = useMyIdentity();
  const isSuperAdmin = useAuthStore((s) => s.isPlatformSuperAdmin);
  const asociatie = useCurrentAsociatie();
  const get = useProfileStore((s) => s.get);
  const save = useProfileStore((s) => s.save);

  const [profile, setProfile] = useState<ProfileData>(() => get(userId, email));
  const [justSaved, setJustSaved] = useState(false);
  const [fieldModal, setFieldModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const initialRects = useRef(new Map<string, DOMRect>());

  const errors = validateStandard(profile);
  const pct = completeness(profile);
  const fields = sortedCustomFields(profile.customFields);

  const displayFields = useMemo(() => {
    if (!dragId || dropIdx === null) return fields;
    const fromIdx = fields.findIndex((f) => f.id === dragId);
    if (fromIdx < 0 || fromIdx === dropIdx) return fields;
    const arr = [...fields];
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(dropIdx, 0, item);
    return arr;
  }, [fields, dragId, dropIdx]);

  /** Autosave: persist every change (even partially-valid drafts) and flash "saved". */
  function update(patch: Partial<ProfileData>) {
    const next = { ...profile, ...patch };
    setProfile(next);
    save(next);
    setJustSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), 1800);
  }

  function updateFields(customFields: CustomField[]) {
    update({ customFields });
  }

  function dragStart(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    initialRects.current = new Map(
      [...rowRefs.current.entries()].map(([rid, el]) => [rid, el.getBoundingClientRect()]),
    );
    setDragId(id);
    setDropIdx(fields.findIndex((f) => f.id === id));
  }

  function dragMove(e: React.PointerEvent, id: string) {
    if (!dragId || dragId !== id) return;
    const entries = [...initialRects.current.entries()]
      .filter(([rid]) => rid !== id)
      .map(([rid, rect]) => ({ id: rid, rect }))
      .sort((a, b) => a.rect.top - b.rect.top);
    let next = entries.length;
    for (let i = 0; i < entries.length; i++) {
      if (e.clientY < entries[i].rect.top + entries[i].rect.height / 2) {
        next = i;
        break;
      }
    }
    if (next !== dropIdx) setDropIdx(next);
  }

  function dragEnd(id: string) {
    if (dragId === id && dropIdx !== null) {
      const fromIdx = fields.findIndex((f) => f.id === id);
      if (fromIdx !== dropIdx) {
        updateFields(reorderCustomField(profile.customFields, id, dropIdx));
      }
    }
    setDragId(null);
    setDropIdx(null);
    initialRects.current.clear();
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isAcceptedImageType(file.type)) {
      window.alert(t('profile.photoBadType'));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      window.alert(t('profile.photoTooLarge'));
      return;
    }
    try {
      update({ avatarDataUrl: await fileToAvatar(file) });
    } catch {
      window.alert(t('profile.photoBadType'));
    }
  }

  function selectApartment(apartmentId: string) {
    const apt = DEMO_APARTMENTS.find((a) => a.id === apartmentId);
    update({
      apartmentId: apartmentId || null,
      ...(apt ? { scara: apt.scara ?? '', etaj: apt.etaj != null ? String(apt.etaj) : '' } : {}),
    });
  }

  function changeLanguage(locale: Locale) {
    update({ locale });
    void i18n.changeLanguage(locale);
  }

  return (
    <div>
      <PageHeader title={t('nav.profile')} subtitle={t('profile.subtitle')} />

      <div className="space-y-4">
        {/* Photo + completeness */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {profile.avatarDataUrl ? (
                <img
                  src={profile.avatarDataUrl}
                  alt={profile.fullName || t('nav.profile')}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div
                  aria-hidden
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary"
                >
                  {initials(profile.fullName || profile.displayName)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {t('profile.completeness', { percent: pct })}
                </span>
                {justSaved && (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <Check className="h-3.5 w-3.5" /> {t('profile.saved')}
                  </span>
                )}
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('profile.completeness', { percent: pct })}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickPhoto}
                />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  <Camera className="h-4 w-4" /> {t('profile.changePhoto')}
                </Button>
                {profile.avatarDataUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => update({ avatarDataUrl: null })}
                  >
                    <Trash2 className="h-4 w-4" /> {t('profile.removePhoto')}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">{t('profile.autosaveHint')}</p>
        </Card>

        {/* Standard fields */}
        <Card title={t('profile.personal')}>
          <div className="space-y-3">
            <Input
              label={t('profile.fullName')}
              value={profile.fullName}
              onChange={(e) => update({ fullName: e.target.value })}
            />
            <Input
              label={t('profile.displayName')}
              hint={t('profile.displayNameHint')}
              value={profile.displayName}
              onChange={(e) => update({ displayName: e.target.value })}
            />
            <Input
              label={t('profile.phone')}
              type="tel"
              value={profile.phone}
              error={errors.phone ? t(`profile.err.${errors.phone}`) : undefined}
              onChange={(e) => update({ phone: e.target.value })}
            />
            <Input
              label={t('profile.email')}
              type="email"
              hint={t('profile.emailHint')}
              value={profile.email}
              error={errors.email ? t(`profile.err.${errors.email}`) : undefined}
              onChange={(e) => update({ email: e.target.value })}
            />
            {!isSuperAdmin && (
              <>
                <Select
                  label={t('profile.apartment')}
                  value={profile.apartmentId ?? ''}
                  onChange={(e) => selectApartment(e.target.value)}
                >
                  <option value="">{t('profile.apartmentNone')}</option>
                  {DEMO_APARTMENTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {t('profile.apartmentOption', {
                        numar: a.numar_apartament,
                        scara: a.scara ?? '-',
                        etaj: a.etaj ?? '-',
                      })}
                    </option>
                  ))}
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={t('profile.scara')}
                    value={profile.scara}
                    onChange={(e) => update({ scara: e.target.value })}
                  />
                  <Input
                    label={t('profile.etaj')}
                    value={profile.etaj}
                    onChange={(e) => update({ etaj: e.target.value })}
                  />
                </div>
              </>
            )}
            <Input
              label={t('profile.carPlate')}
              hint={t('profile.carPlateHint')}
              value={profile.carPlate}
              error={errors.carPlate ? t(`profile.err.${errors.carPlate}`) : undefined}
              onChange={(e) => update({ carPlate: e.target.value })}
            />
            <Textarea
              label={t('profile.address')}
              rows={2}
              value={profile.address}
              onChange={(e) => update({ address: e.target.value })}
            />
            {!isSuperAdmin && (
              <Input
                label={t('profile.dateOfBirth')}
                type="date"
                hint={t('profile.dobHint')}
                value={profile.dateOfBirth}
                error={errors.dateOfBirth ? t(`profile.err.${errors.dateOfBirth}`) : undefined}
                onChange={(e) => update({ dateOfBirth: e.target.value })}
              />
            )}
            <Select
              label={t('profile.language')}
              value={profile.locale}
              onChange={(e) => changeLanguage(e.target.value as Locale)}
            >
              <option value="ro">Română</option>
              <option value="en">English</option>
            </Select>
          </div>
        </Card>

        {/* Emergency contact */}
        <Card title={t('profile.emergency')}>
          <div className="space-y-3">
            <Input
              label={t('profile.ecName')}
              value={profile.emergencyContact.name}
              onChange={(e) =>
                update({ emergencyContact: { ...profile.emergencyContact, name: e.target.value } })
              }
            />
            <Input
              label={t('profile.ecPhone')}
              type="tel"
              value={profile.emergencyContact.phone}
              error={errors.emergencyPhone ? t(`profile.err.${errors.emergencyPhone}`) : undefined}
              onChange={(e) =>
                update({ emergencyContact: { ...profile.emergencyContact, phone: e.target.value } })
              }
            />
            <Input
              label={t('profile.ecRelationship')}
              value={profile.emergencyContact.relationship}
              onChange={(e) =>
                update({
                  emergencyContact: { ...profile.emergencyContact, relationship: e.target.value },
                })
              }
            />
          </div>
        </Card>

        {/* Custom fields */}
        <Card
          title={t('profile.custom')}
          footer={
            <Button variant="secondary" size="sm" onClick={() => setFieldModal(true)}>
              <Plus className="h-4 w-4" /> {t('profile.addField')}
            </Button>
          }
        >
          <p className="mb-3 text-sm text-muted">{t('profile.customHint')}</p>
          {fields.length === 0 ? (
            <EmptyState body={t('profile.emptyCustom')} />
          ) : (
            <div className={`space-y-4 ${dragId ? 'select-none' : ''}`}>
              {displayFields.map((f, idx) => (
                <CustomFieldRow
                  key={f.id}
                  field={f}
                  isFirst={idx === 0}
                  isLast={idx === displayFields.length - 1}
                  isDragging={dragId === f.id}
                  onRowRef={(el) => {
                    if (el) rowRefs.current.set(f.id, el);
                    else rowRefs.current.delete(f.id);
                  }}
                  onChange={(patch) =>
                    updateFields(updateCustomField(profile.customFields, f.id, patch))
                  }
                  onMove={(dir) => updateFields(moveCustomField(profile.customFields, f.id, dir))}
                  onRemove={() => updateFields(removeCustomField(profile.customFields, f.id))}
                  onDragStart={(e) => dragStart(e, f.id)}
                  onDragMove={(e) => dragMove(e, f.id)}
                  onDragEnd={() => dragEnd(f.id)}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Account + chrome */}
        <Card title={t('profile.account')}>
          {!isSuperAdmin && asociatie && (
            <>
              {asociatie.name && <p className="font-medium">{asociatie.name}</p>}
              {asociatie.address && <p className="text-sm text-muted">{asociatie.address}</p>}
            </>
          )}
          <div className={isSuperAdmin ? 'space-y-2' : 'mt-4 space-y-2'}>
            <button className="profile-link" onClick={() => navigate('/app/notificari')}>
              <Bell className="h-4 w-4" /> {t('profile.notifications')}
            </button>
            <button className="profile-link" onClick={() => navigate('/app/securitate')}>
              <ShieldCheck className="h-4 w-4" /> {t('profile.security')}
            </button>
            <button className="profile-link" onClick={() => navigate('/app/datele-mele')}>
              <Shield className="h-4 w-4" /> {t('profile.myData')}
            </button>
            <button className="profile-link" onClick={() => navigate('/app/confidentialitate')}>
              <Globe className="h-4 w-4" /> {t('profile.privacy')}
            </button>
            <button className="profile-link" onClick={() => navigate('/bun-venit')}>
              <Sparkles className="h-4 w-4" /> {t('profile.replayTour')}
            </button>
          </div>
          <div className="mt-4">
            <Button
              variant="danger"
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
            >
              <LogOut className="h-4 w-4" /> {t('auth.logout')}
            </Button>
          </div>
        </Card>
      </div>

      {fieldModal && (
        <AddFieldModal
          existing={profile.customFields}
          onClose={() => setFieldModal(false)}
          onAdd={(field) => {
            updateFields(addCustomField(profile.customFields, field));
            setFieldModal(false);
          }}
        />
      )}
    </div>
  );
}

// ── Custom-field row (renders the right control for the field's type) ────────

function CustomFieldRow({
  field,
  isFirst,
  isLast,
  isDragging,
  onRowRef,
  onChange,
  onMove,
  onRemove,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  field: CustomField;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  onRowRef: (el: HTMLDivElement | null) => void;
  onChange: (patch: Partial<Omit<CustomField, 'id'>>) => void;
  onMove: (dir: 'up' | 'down') => void;
  onRemove: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  onDragMove: (e: React.PointerEvent) => void;
  onDragEnd: () => void;
}) {
  const { t } = useTranslation();
  const error = validateCustomFieldValue(field.type, field.value);

  return (
    <div
      ref={onRowRef}
      className={`rounded-lg border border-border p-3 transition-[opacity,box-shadow] duration-150 ease-out ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          className="iconbtn shrink-0 cursor-grab active:cursor-grabbing"
          style={{ width: 32, height: 32, touchAction: 'none' }}
          aria-label={t('profile.dragReorder')}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{field.label}</p>
          <p className="text-xs text-muted">
            {t(`profile.type.${field.type}`)} ·{' '}
            {t(`profile.${field.visibility === 'neighbours' ? 'visNeighbours' : 'visPrivate'}`)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="iconbtn"
            style={{ width: 32, height: 32 }}
            disabled={isFirst}
            aria-label={t('profile.moveUp')}
            onClick={() => onMove('up')}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            className="iconbtn"
            style={{ width: 32, height: 32 }}
            disabled={isLast}
            aria-label={t('profile.moveDown')}
            onClick={() => onMove('down')}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            className="iconbtn"
            style={{ width: 32, height: 32 }}
            aria-label={t('profile.removeField')}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <FieldControl field={field} error={error ? t(`profile.err.${error}`) : undefined} onChange={onChange} />

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm">{t('profile.visNeighbours')}</span>
        <Switch
          checked={field.visibility === 'neighbours'}
          onChange={(on) => onChange({ visibility: on ? 'neighbours' : 'private' })}
          label={t('profile.visNeighbours')}
        />
      </div>
    </div>
  );
}

function FieldControl({
  field,
  error,
  onChange,
}: {
  field: CustomField;
  error?: string;
  onChange: (patch: Partial<Omit<CustomField, 'id'>>) => void;
}) {
  const { t } = useTranslation();
  const set = (value: string) => onChange({ value });

  switch (field.type) {
    case 'longtext':
    case 'address':
      return <Textarea rows={2} value={field.value} onChange={(e) => set(e.target.value)} />;
    case 'bool':
      return (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">{field.value === 'true' ? t('common.yes') : t('common.no')}</span>
          <Switch
            checked={field.value === 'true'}
            onChange={(on) => set(on ? 'true' : 'false')}
            label={field.label}
          />
        </div>
      );
    case 'select':
      return (
        <Select value={field.value} onChange={(e) => set(e.target.value)}>
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    case 'number':
      return <Input type="number" value={field.value} error={error} onChange={(e) => set(e.target.value)} />;
    case 'phone':
      return <Input type="tel" value={field.value} error={error} onChange={(e) => set(e.target.value)} />;
    case 'email':
      return <Input type="email" value={field.value} error={error} onChange={(e) => set(e.target.value)} />;
    case 'date':
      return <Input type="date" value={field.value} error={error} onChange={(e) => set(e.target.value)} />;
    case 'link':
      return <Input type="url" value={field.value} error={error} placeholder="https://" onChange={(e) => set(e.target.value)} />;
    case 'text':
    default:
      return <Input value={field.value} onChange={(e) => set(e.target.value)} />;
  }
}

// ── Add-field modal ──────────────────────────────────────────────────────────

function AddFieldModal({
  existing,
  onClose,
  onAdd,
}: {
  existing: CustomField[];
  onClose: () => void;
  onAdd: (field: CustomField) => void;
}) {
  const { t } = useTranslation();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [visibility, setVisibility] = useState<FieldVisibility>('private');
  const [optionsText, setOptionsText] = useState('');

  const canAdd = label.trim().length > 0 && (type !== 'select' || optionsText.trim().length > 0);

  function confirm() {
    if (!canAdd) return;
    const options =
      type === 'select' ? optionsText.split('\n').map((o) => o.trim()).filter(Boolean) : [];
    onAdd(
      newCustomField(label, type, visibility, existing, genId(), options),
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('profile.addField')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={confirm} disabled={!canAdd}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label={t('profile.fieldLabel')}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
        />
        <Select
          label={t('profile.fieldType')}
          value={type}
          onChange={(e) => setType(e.target.value as CustomFieldType)}
        >
          {CUSTOM_FIELD_TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {t(`profile.type.${ty}`)}
            </option>
          ))}
        </Select>
        {type === 'select' && (
          <Textarea
            label={t('profile.selectOptions')}
            hint={t('profile.optionsHint')}
            rows={3}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
          />
        )}
        <Select
          label={t('profile.fieldVisibility')}
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as FieldVisibility)}
        >
          {VISIBILITIES.map((v) => (
            <option key={v} value={v}>
              {t(`profile.${v === 'neighbours' ? 'visNeighbours' : 'visPrivate'}`)}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted">{t('profile.visHint')}</p>
      </div>
    </Modal>
  );
}
