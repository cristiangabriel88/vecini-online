import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Contact, Phone, Mail, DoorOpen, Car, User, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Switch } from '@/shared/components/Switch';
import { Modal } from '@/shared/components/Modal';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { useAuthStore } from '@/shared/store/authStore';
import { useProfileStore } from '@/features/profile/profileStore';
import { canViewAnyProfile, neighbourVisibleFields, sortedCustomFields } from '@/features/profile/profileLogic';
import { useDirectoryStore, useAsociatieDirectory } from './directoryStore';
import { hydrateDirectory, syncDirectoryConsent } from './directoryApi';
import { searchDirectory, type DirectoryCustomField } from './directoryLogic';

const FIELDS = ['show_name', 'show_apartment', 'show_phone', 'show_email'] as const;
type ConsentField = typeof FIELDS[number];

export default function DirectoryPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const currentUserId = useAuthStore((s) => s.session?.user?.id ?? null);
  const { myUserId, toggle, fetchError } = useDirectoryStore();
  const entries = useAsociatieDirectory();
  const profileGet = useProfileStore((s) => s.get);
  const role = useAuthStore((s) => s.activeRole)();
  const isAdmin = canViewAnyProfile(role);

  const [query, setQuery] = useState('');
  const [adminViewEntry, setAdminViewEntry] = useState<string | null>(null);

  useEffect(() => {
    if (asociatieId) void hydrateDirectory(asociatieId);
  }, [asociatieId]);

  const effectiveMyUserId = currentUserId ?? myUserId;
  const me = entries.find((e) => e.user_id === effectiveMyUserId);
  const otherEntries = entries.filter((e) => e.user_id !== effectiveMyUserId);

  const others = useMemo(() => {
    const map: Record<string, DirectoryCustomField[]> = {};
    for (const e of otherEntries) {
      const profile = profileGet(e.user_id, e.email);
      map[e.id] = neighbourVisibleFields(profile.customFields).map((f) => ({
        label: f.label,
        value: f.value,
      }));
    }
    return searchDirectory(otherEntries, query, map);
  }, [otherEntries, query, profileGet]);

  const adminEntry = adminViewEntry
    ? entries.find((e) => e.id === adminViewEntry) ?? null
    : null;
  const adminProfile = adminEntry ? profileGet(adminEntry.user_id, adminEntry.email) : null;

  const handleToggle = (field: ConsentField) => {
    if (!asociatieId) return;
    toggle(asociatieId, field);
    if (me) {
      void syncDirectoryConsent(asociatieId, effectiveMyUserId ?? '', me, field);
    }
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateDirectory(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title={t('directory.title')} subtitle={t('directory.subtitle')} />

      {me && (
        <Card title={t('directory.myConsent')} className="mb-5">
          <p className="mb-3 text-sm text-muted">{t('directory.consentHint')}</p>
          <div className="space-y-3">
            {FIELDS.map((f) => (
              <div key={f} className="flex items-center justify-between">
                <span>{t(`directory.${f}`)}</span>
                <Switch checked={me[f]} onChange={() => handleToggle(f)} label={t(`directory.${f}`)} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-4">
        <Input
          aria-label={t('common.search')}
          placeholder={t('directory.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {others.length === 0 ? (
        <EmptyState body={t('directory.empty')} icon={<Contact className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {others.map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{v.name}</p>
                  <div className="mt-1 space-y-1 text-sm text-muted">
                    {v.apartment && (
                      <p className="flex items-center gap-2">
                        <DoorOpen className="h-4 w-4 shrink-0" /> {v.apartment}
                      </p>
                    )}
                    {v.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        <a href={`tel:${v.phone.replace(/\s/g, '')}`} className="text-primary">
                          {v.phone}
                        </a>
                      </p>
                    )}
                    {v.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0" />
                        <a href={`mailto:${v.email}`} className="text-primary">
                          {v.email}
                        </a>
                      </p>
                    )}
                    {v.customFields.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {v.customFields.map((cf, i) => (
                          <p key={i} className="text-xs">
                            <span className="text-text/60">{cf.label}:</span>{' '}
                            <span className="text-text">{cf.value}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() =>
                      setAdminViewEntry(entries.find((e) => e.id !== me?.id && v.id === e.id)?.id ?? null)
                    }
                    className="shrink-0 text-muted transition-colors hover:text-primary"
                    aria-label={t('directory.viewProfile')}
                    title={t('directory.viewProfile')}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {isAdmin && adminProfile && adminEntry && (
        <Modal
          open={adminViewEntry !== null}
          onClose={() => setAdminViewEntry(null)}
          title={t('directory.residentProfile')}
          footer={
            <Button onClick={() => setAdminViewEntry(null)}>{t('common.close')}</Button>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
                {(adminProfile.displayName || adminProfile.fullName || '?')[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{adminProfile.fullName || adminEntry.name}</p>
                {adminProfile.displayName && adminProfile.displayName !== adminProfile.fullName && (
                  <p className="text-sm text-muted">{adminProfile.displayName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {(adminProfile.phone || adminEntry.phone) && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-muted" />
                  <a href={`tel:${(adminProfile.phone || adminEntry.phone).replace(/\s/g, '')}`} className="text-primary">
                    {adminProfile.phone || adminEntry.phone}
                  </a>
                </p>
              )}
              {(adminProfile.email || adminEntry.email) && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted" />
                  <a href={`mailto:${adminProfile.email || adminEntry.email}`} className="text-primary">
                    {adminProfile.email || adminEntry.email}
                  </a>
                </p>
              )}
              {adminEntry.apartment && (
                <p className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 shrink-0 text-muted" />
                  {adminEntry.apartment}
                  {adminProfile.scara && ` · Sc. ${adminProfile.scara}`}
                  {adminProfile.etaj && `, et. ${adminProfile.etaj}`}
                </p>
              )}
              {adminProfile.carPlate && (
                <p className="flex items-center gap-2">
                  <Car className="h-4 w-4 shrink-0 text-muted" />
                  {adminProfile.carPlate}
                </p>
              )}
              {adminProfile.address && (
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0 text-muted" />
                  {adminProfile.address}
                </p>
              )}
              {adminProfile.emergencyContact.name && (
                <div className="rounded-md bg-surface p-2 text-xs">
                  <p className="font-medium text-text">{t('profile.emergency')}</p>
                  <p className="text-muted">
                    {adminProfile.emergencyContact.name}
                    {adminProfile.emergencyContact.relationship && ` (${adminProfile.emergencyContact.relationship})`}
                    {adminProfile.emergencyContact.phone && ` · ${adminProfile.emergencyContact.phone}`}
                  </p>
                </div>
              )}
            </div>

            {adminProfile.customFields.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted uppercase tracking-wide">
                  {t('profile.custom')}
                </p>
                <div className="space-y-1">
                  {sortedCustomFields(adminProfile.customFields).map((cf) => (
                    <p key={cf.id} className="text-sm">
                      <span className="text-muted">{cf.label}:</span>{' '}
                      <span className="text-text">{cf.value || '–'}</span>
                      {cf.visibility === 'private' && (
                        <span className="ml-1 text-xs text-muted">(privat)</span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
