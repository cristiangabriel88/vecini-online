import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Hash,
  Home as HomeIcon,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
  ToggleLeft,
  ToggleRight,
  UserCog,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { formatDate } from '@/shared/lib/format';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { useAuthStore } from '@/shared/store/authStore';
import { usePlatformAsociatiiStore, type AdminProvisionRecord } from './platformAsociatiiStore';
import { usePlatformAuthStore } from './platformAuthStore';
import { isDormant } from './platformProvisioningLogic';
import type { AsociatieStatus } from './demoPlatform';
import { useAuditStore } from '@/shared/store/auditStore';
import { useFeatureOverridesStore } from '@/shared/features/featureOverridesStore';
import { FEATURES, featureTitle, categoryLabel, type FeatureCategory } from '@/shared/features/registry';

/**
 * Superadmin console: asociație detail page (T249 + T250).
 *
 * Shows the full identity, member and apartment counts, last admin sign-in,
 * current lifecycle status and the lifecycle controls (suspend / reactivate /
 * archive). T250 adds the admin roster (active + pending admins) with resend,
 * revoke-invite, provision-additional-admin, and revoke-access actions.
 * All privileged writes run through service-role Netlify functions; demo drives
 * the persisted platform store.
 */

type LifecycleAction = 'suspend' | 'reactivate' | 'archive';

async function callAdminInviteAction(
  action: 'resend' | 'revoke',
  inviteId: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch('/.netlify/functions/admin-invite-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, inviteId }),
    });
    const data = (await resp.json()) as Record<string, unknown>;
    if (!resp.ok) return { ok: false, error: String(data.error ?? 'failed') };
    return { ok: true };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

async function callProvisionAdditionalAdmin(
  asociatieId: string,
  adminName: string,
  adminEmail: string,
  token: string,
): Promise<{ ok: boolean; inviteId?: string; emailSent?: boolean; error?: string }> {
  try {
    const resp = await fetch('/.netlify/functions/provision-additional-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ asociatieId, adminName, adminEmail }),
    });
    const data = (await resp.json()) as Record<string, unknown>;
    if (!resp.ok) return { ok: false, error: String(data.error ?? 'failed') };
    return { ok: true, inviteId: data.inviteId as string, emailSent: data.emailSent as boolean };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

async function callRevokeAdminAccess(
  asociatieId: string,
  adminEmail: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch('/.netlify/functions/revoke-admin-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ asociatieId, adminEmail }),
    });
    const data = (await resp.json()) as Record<string, unknown>;
    if (!resp.ok) return { ok: false, error: String(data.error ?? 'failed') };
    return { ok: true };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

async function callLifecycleFunction(
  action: LifecycleAction,
  asociatieId: string,
  reason: string,
  token: string,
): Promise<{ ok: boolean; status?: AsociatieStatus; statusChangedAt?: string; error?: string }> {
  try {
    const resp = await fetch('/.netlify/functions/asociatie-lifecycle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ asociatieId, action, reason }),
    });
    const data = (await resp.json()) as Record<string, unknown>;
    if (!resp.ok) return { ok: false, error: String(data.error ?? 'failed') };
    return { ok: true, status: data.status as AsociatieStatus, statusChangedAt: data.statusChangedAt as string };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

function statusTone(status: AsociatieStatus | undefined): 'success' | 'warning' | 'neutral' {
  if (status === 'suspended') return 'warning';
  if (status === 'archived') return 'neutral';
  return 'success';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PlatformAsociatieDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);
  const provisions = usePlatformAsociatiiStore((s) => s.provisions);
  const additionalAdmins = usePlatformAsociatiiStore((s) => s.additionalAdmins);
  const updateLifecycle = usePlatformAsociatiiStore((s) => s.updateLifecycle);
  const revokeAdminAccess = usePlatformAsociatiiStore((s) => s.revokeAdminAccess);
  const provisionAdditionalAdmin = usePlatformAsociatiiStore((s) => s.provisionAdditionalAdmin);
  const a = asociatii.find((x) => x.id === id);

  const setOverride = useFeatureOverridesStore((s) => s.setOverride);
  const clearOverride = useFeatureOverridesStore((s) => s.clearOverride);
  const overridesFor = useFeatureOverridesStore((s) => s.overridesFor);
  const currentOverrides = id ? overridesFor(id) : {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(null);

  // Admin roster state (T250)
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [revokeConfirmEmail, setRevokeConfirmEmail] = useState<string | null>(null);
  const [showProvisionForm, setShowProvisionForm] = useState(false);
  const [provisionName, setProvisionName] = useState('');

  // Feature override state (T256)
  const [overrideLoading, setOverrideLoading] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionErrors, setProvisionErrors] = useState<{ name?: string; email?: string }>({});
  const [provisionSuccess, setProvisionSuccess] = useState<string | null>(null);

  if (!a) {
    return (
      <div>
        <PageHeader
          title={t('platform.detail.notFoundTitle')}
          subtitle={t('platform.detail.notFoundBody')}
          action={
            <Button variant="ghost" onClick={() => navigate('/consola/asociatii')}>
              <ArrowLeft className="h-4 w-4" />
              {t('platform.detail.back')}
            </Button>
          }
        />
      </div>
    );
  }

  const status = a.status ?? 'active';
  const dormant = isDormant(a.lastAdminSignInAt);
  const isDemo = usePlatformAuthStore.getState().demo || !isSupabaseConfigured;

  async function executeAction(action: LifecycleAction, reason: string) {
    setLoading(true);
    setError(null);

    if (isDemo) {
      const statusMap: Record<LifecycleAction, AsociatieStatus> = {
        suspend: 'suspended',
        reactivate: 'active',
        archive: 'archived',
      };
      updateLifecycle(a!.id, statusMap[action], reason || undefined);
      setLoading(false);
      setShowReasonForm(false);
      setPendingAction(null);
      setReasonInput('');
      return;
    }

    const token = useAuthStore.getState().session?.access_token ?? '';
    if (!token) {
      setError('unauthorized');
      setLoading(false);
      return;
    }
    const result = await callLifecycleFunction(action, a!.id, reason, token);
    if (!result.ok) {
      setError(result.error ?? 'failed');
      setLoading(false);
      return;
    }
    updateLifecycle(a!.id, result.status!, reason || undefined);
    setLoading(false);
    setShowReasonForm(false);
    setPendingAction(null);
    setReasonInput('');
  }

  function initiateAction(action: LifecycleAction) {
    setError(null);
    if (action === 'suspend') {
      setPendingAction('suspend');
      setShowReasonForm(true);
    } else {
      void executeAction(action, '');
    }
  }

  function confirmSuspend() {
    if (!reasonInput.trim()) {
      setError('reasonRequired');
      return;
    }
    void executeAction('suspend', reasonInput.trim());
  }

  // Admin roster handlers (T250)
  async function handleRevokeInvite(record: AdminProvisionRecord) {
    setAdminActionError(null);
    setAdminActionLoading(`revoke-invite-${record.email}`);
    if (isDemo) {
      revokeAdminAccess(a!.id, record.email);
      setAdminActionLoading(null);
      return;
    }
    const token = useAuthStore.getState().session?.access_token ?? '';
    if (!token) { setAdminActionError('unauthorized'); setAdminActionLoading(null); return; }
    // Prefer the live invite UUID (set by the live provisioning path); the
    // plaintext setup token works as a fallback for records minted before the
    // UUID was tracked (the server hashes non-UUID values and matches the
    // token-at-rest digest).
    const result = await callAdminInviteAction('revoke', record.inviteId ?? record.setupToken, token);
    if (!result.ok) { setAdminActionError('revokeFailed'); setAdminActionLoading(null); return; }
    revokeAdminAccess(a!.id, record.email);
    setAdminActionLoading(null);
  }

  async function handleRevokeAccess(adminEmail: string) {
    setAdminActionError(null);
    setRevokeConfirmEmail(null);
    setAdminActionLoading(`revoke-access-${adminEmail}`);
    if (isDemo) {
      revokeAdminAccess(a!.id, adminEmail);
      setAdminActionLoading(null);
      return;
    }
    const token = useAuthStore.getState().session?.access_token ?? '';
    if (!token) { setAdminActionError('unauthorized'); setAdminActionLoading(null); return; }
    const result = await callRevokeAdminAccess(a!.id, adminEmail, token);
    if (!result.ok) { setAdminActionError('revokeAdminFailed'); setAdminActionLoading(null); return; }
    revokeAdminAccess(a!.id, adminEmail);
    setAdminActionLoading(null);
  }

  async function handleProvisionAdditionalAdmin() {
    const errors: { name?: string; email?: string } = {};
    const name = provisionName.trim();
    const email = provisionEmail.trim();
    if (!name) errors.name = 'required';
    else if (name.length < 2) errors.name = 'tooShort';
    if (!email) errors.email = 'required';
    else if (!EMAIL_RE.test(email)) errors.email = 'email';
    if (Object.keys(errors).length > 0) { setProvisionErrors(errors); return; }
    setProvisionErrors({});
    setAdminActionError(null);
    setAdminActionLoading('provision');
    if (isDemo) {
      provisionAdditionalAdmin(a!.id, name, email);
      setProvisionSuccess(email);
      setProvisionName('');
      setProvisionEmail('');
      setShowProvisionForm(false);
      setAdminActionLoading(null);
      return;
    }
    const token = useAuthStore.getState().session?.access_token ?? '';
    if (!token) { setAdminActionError('unauthorized'); setAdminActionLoading(null); return; }
    const result = await callProvisionAdditionalAdmin(a!.id, name, email, token);
    if (!result.ok) { setAdminActionError('provisionAdminFailed'); setAdminActionLoading(null); return; }
    // Record the server invite UUID so revoke can address the real DB row.
    provisionAdditionalAdmin(a!.id, name, email, result.inviteId);
    setProvisionSuccess(email);
    setProvisionName('');
    setProvisionEmail('');
    setShowProvisionForm(false);
    setAdminActionLoading(null);
  }

  // Feature override handlers (T256)
  async function handleSetOverride(featureKey: string, enabled: boolean | null) {
    if (!id) return;
    setOverrideError(null);
    setOverrideLoading(featureKey);

    if (isDemo) {
      if (enabled === null) {
        clearOverride(id, featureKey);
      } else {
        setOverride(id, featureKey, enabled);
      }
      const operator = useAuthStore.getState();
      const actorId = operator.session?.user?.id ?? 'demo';
      const actorName = operator.profile?.full_name ?? 'Demo operator';
      useAuditStore.getState().record({
        asociatie_id: id,
        actor_user_id: actorId,
        actor_name: actorName,
        action: enabled ? 'feature.override_enabled' : 'feature.override_disabled',
        entity: 'feature',
        entity_label: featureKey,
        before: null,
        after: enabled === null ? 'cleared' : String(enabled),
      });
      setOverrideLoading(null);
      return;
    }

    const token = useAuthStore.getState().session?.access_token ?? '';
    if (!token) { setOverrideError('unauthorized'); setOverrideLoading(null); return; }
    try {
      const resp = await fetch('/.netlify/functions/feature-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ asociatieId: id, featureKey, overrideEnabled: enabled }),
      });
      const data = (await resp.json()) as Record<string, unknown>;
      if (!resp.ok) { setOverrideError('overrideFailed'); setOverrideLoading(null); return; }
      if (data.ok) {
        if (enabled === null) {
          clearOverride(id, featureKey);
        } else {
          setOverride(id, featureKey, enabled);
        }
      }
    } catch {
      setOverrideError('overrideFailed');
    }
    setOverrideLoading(null);
  }

  // Build the combined admin roster for this asociatie
  const primaryAdmin = id ? provisions[id] : undefined;
  const extraAdmins: AdminProvisionRecord[] = id ? (additionalAdmins[id] ?? []) : [];
  const allAdmins: AdminProvisionRecord[] = [
    ...(primaryAdmin ? [primaryAdmin] : []),
    ...extraAdmins,
  ].filter((r) => !r.revokedAt);

  return (
    <div>
      <PageHeader
        title={a.name}
        subtitle={a.city}
        action={
          <Button variant="ghost" onClick={() => navigate('/consola/asociatii')}>
            <ArrowLeft className="h-4 w-4" />
            {t('platform.detail.back')}
          </Button>
        }
      />

      {/* ── Status + health strip ─────────────────────────────────────────── */}
      <div className="platform-detail-statusbar">
        <Badge tone={statusTone(status)}>
          {t(`platform.detail.status.${status}`)}
        </Badge>
        {status === 'active' && (
          <Badge tone={dormant ? 'warning' : 'success'}>
            {dormant ? t('platform.asociatii.dormant') : t('platform.asociatii.active')}
          </Badge>
        )}
        {a.statusReason && (
          <span className="platform-detail-status-reason">{a.statusReason}</span>
        )}
        {a.statusChangedAt && (
          <span className="platform-detail-status-date">
            {t('platform.detail.statusChangedAt', { date: formatDate(a.statusChangedAt) })}
          </span>
        )}
      </div>

      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <section className="platform-detail-section" aria-label={t('platform.detail.identityTitle')}>
        <h2 className="platform-overview__sectionhead">{t('platform.detail.identityTitle')}</h2>
        <dl className="platform-detail-identity">
          {a.address && (
            <div className="platform-asoc-identity-row">
              <dt><MapPin size={13} aria-hidden="true" />{t('platform.asociatii.fields.address')}</dt>
              <dd>{a.address}</dd>
            </div>
          )}
          {a.cui && (
            <div className="platform-asoc-identity-row">
              <dt><Hash size={13} aria-hidden="true" />{t('platform.asociatii.fields.cui')}</dt>
              <dd>{a.cui}</dd>
            </div>
          )}
          {a.registrationNumber && (
            <div className="platform-asoc-identity-row">
              <dt><Hash size={13} aria-hidden="true" />{t('platform.asociatii.fields.registrationNumber')}</dt>
              <dd>{a.registrationNumber}</dd>
            </div>
          )}
          {a.iban && (
            <div className="platform-asoc-identity-row">
              <dt><Landmark size={13} aria-hidden="true" />{t('platform.asociatii.fields.iban')}</dt>
              <dd>{a.iban}</dd>
            </div>
          )}
          {a.contactPhone && (
            <div className="platform-asoc-identity-row">
              <dt><Phone size={13} aria-hidden="true" />{t('platform.asociatii.fields.contactPhone')}</dt>
              <dd>{a.contactPhone}</dd>
            </div>
          )}
          {a.contactEmail && (
            <div className="platform-asoc-identity-row">
              <dt><Mail size={13} aria-hidden="true" />{t('platform.asociatii.fields.contactEmail')}</dt>
              <dd>{a.contactEmail}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="platform-detail-section" aria-label={t('platform.detail.statsTitle')}>
        <h2 className="platform-overview__sectionhead">{t('platform.detail.statsTitle')}</h2>
        <div className="platform-detail-stats">
          <div className="platform-detail-stat">
            <Users size={16} aria-hidden="true" />
            <span>{t('platform.asociatii.members', { count: a.members })}</span>
          </div>
          <div className="platform-detail-stat">
            <HomeIcon size={16} aria-hidden="true" />
            <span>{t('platform.asociatii.apartments', { count: a.apartments })}</span>
          </div>
          <div className="platform-detail-stat">
            <Building2 size={16} aria-hidden="true" />
            <span>
              {a.lastAdminSignInAt
                ? t('platform.asociatii.lastSignIn', { date: formatDate(a.lastAdminSignInAt) })
                : t('platform.asociatii.neverSignedIn')}
            </span>
          </div>
        </div>
      </section>

      {/* ── Admin roster ─────────────────────────────────────────────────── */}
      <section className="platform-detail-section" aria-label={t('platform.detail.adminRosterTitle')}>
        <h2 className="platform-overview__sectionhead">{t('platform.detail.adminRosterTitle')}</h2>

        {adminActionError && (
          <p role="alert" className="platform-detail-error">
            {t(`platform.detail.err.${adminActionError}`, { defaultValue: t('platform.detail.err.failed') })}
          </p>
        )}

        {provisionSuccess && (
          <p role="status" className="platform-detail-success">
            {t('platform.detail.adminProvisionSuccess', { email: provisionSuccess })}
          </p>
        )}

        {allAdmins.length === 0 && !showProvisionForm ? (
          <p className="platform-detail-sub-note">{t('platform.detail.adminRosterEmpty')}</p>
        ) : (
          <ul className="platform-roster-list">
            {allAdmins.map((rec) => {
              const isPending = !rec.redeemedAt;
              const actionKey = `action-${rec.email}`;
              return (
                <li key={rec.email} className="platform-roster-item">
                  <span className="platform-roster-item__icon" aria-hidden="true">
                    {isPending ? <Clock size={14} /> : <CheckCircle2 size={14} />}
                  </span>
                  <div className="platform-roster-item__body">
                    <span className="platform-roster-item__name">{rec.name}</span>
                    <span className="platform-roster-item__email">{rec.email}</span>
                    <Badge tone={isPending ? 'warning' : 'success'}>
                      {isPending ? t('platform.detail.adminPending') : t('platform.detail.adminActive')}
                    </Badge>
                    <span className="platform-roster-item__date">
                      {rec.redeemedAt
                        ? t('platform.detail.adminRedeemedOn', { date: formatDate(new Date(rec.redeemedAt).toISOString()) })
                        : t('platform.detail.adminProvisionedOn', { date: formatDate(rec.provisionedAt) })}
                    </span>
                  </div>
                  <div className="platform-roster-item__actions">
                    {isPending && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleRevokeInvite(rec)}
                        disabled={!!adminActionLoading}
                        aria-label={t('platform.detail.revokeInviteCta')}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        {t('platform.detail.revokeInviteCta')}
                      </Button>
                    )}
                    {!isPending && revokeConfirmEmail !== rec.email && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevokeConfirmEmail(rec.email)}
                        disabled={!!adminActionLoading}
                        aria-label={t('platform.detail.revokeAdminCta')}
                        data-testid={`revoke-admin-${rec.email}`}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        {t('platform.detail.revokeAdminCta')}
                      </Button>
                    )}
                    {!isPending && revokeConfirmEmail === rec.email && (
                      <div className="platform-roster-confirm" key={actionKey}>
                        <span className="platform-roster-confirm__body">
                          {t('platform.detail.revokeAdminConfirmBody', { name: rec.name })}
                        </span>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => void handleRevokeAccess(rec.email)}
                          disabled={!!adminActionLoading}
                        >
                          {t('platform.detail.confirmRevokeAdmin')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevokeConfirmEmail(null)}
                          disabled={!!adminActionLoading}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Provision additional admin form */}
        {!showProvisionForm ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowProvisionForm(true); setProvisionSuccess(null); }}
            className="platform-roster-add-btn"
          >
            <Plus size={13} aria-hidden="true" />
            {t('platform.detail.adminProvisionTitle')}
          </Button>
        ) : (
          <div className="platform-roster-provision-form">
            <h3 className="platform-roster-provision-form__title">
              {t('platform.detail.adminProvisionTitle')}
            </h3>
            <div className="platform-roster-provision-form__fields">
              <div className="platform-detail-field">
                <label htmlFor="provision-name" className="platform-detail-reason-label">
                  <UserCog size={13} aria-hidden="true" />
                  {t('platform.asociatii.fields.adminName')}
                </label>
                <input
                  id="provision-name"
                  type="text"
                  className="platform-detail-reason-input platform-detail-reason-input--single"
                  value={provisionName}
                  onChange={(e) => setProvisionName(e.target.value)}
                  placeholder={t('platform.asociatii.fields.adminNamePlaceholder')}
                  aria-invalid={!!provisionErrors.name}
                />
                {provisionErrors.name && (
                  <span className="platform-detail-field-error" role="alert">
                    {t(`platform.asociatii.err.${provisionErrors.name}`)}
                  </span>
                )}
              </div>
              <div className="platform-detail-field">
                <label htmlFor="provision-email" className="platform-detail-reason-label">
                  <Mail size={13} aria-hidden="true" />
                  {t('platform.asociatii.fields.adminEmail')}
                </label>
                <input
                  id="provision-email"
                  type="email"
                  className="platform-detail-reason-input platform-detail-reason-input--single"
                  value={provisionEmail}
                  onChange={(e) => setProvisionEmail(e.target.value)}
                  placeholder={t('platform.asociatii.fields.adminEmailPlaceholder')}
                  aria-invalid={!!provisionErrors.email}
                />
                {provisionErrors.email && (
                  <span className="platform-detail-field-error" role="alert">
                    {t(`platform.asociatii.err.${provisionErrors.email}`)}
                  </span>
                )}
              </div>
            </div>
            <div className="platform-detail-reason-actions">
              <Button
                onClick={() => void handleProvisionAdditionalAdmin()}
                disabled={adminActionLoading === 'provision'}
              >
                {adminActionLoading === 'provision' ? t('common.saving') : t('platform.detail.adminProvisionCta')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowProvisionForm(false); setProvisionErrors({}); }}
                disabled={adminActionLoading === 'provision'}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── Feature overrides ────────────────────────────────────────────── */}
      <section className="platform-detail-section" aria-label={t('platform.detail.featureOverridesTitle')}>
        <h2 className="platform-overview__sectionhead">{t('platform.detail.featureOverridesTitle')}</h2>
        <p className="platform-detail-sub-note">{t('platform.detail.featureOverridesSubtitle')}</p>

        {overrideError && (
          <p role="alert" className="platform-detail-error">
            {t(`platform.detail.err.${overrideError}`, { defaultValue: t('platform.detail.err.overrideFailed') })}
          </p>
        )}

        {FEATURES.length === 0 ? (
          <p className="platform-detail-sub-note">{t('platform.detail.featureOverridesEmpty')}</p>
        ) : (
          <div className="platform-feature-overrides">
            {(
              Object.entries(
                FEATURES.reduce<Record<string, typeof FEATURES>>((acc, f) => {
                  (acc[f.category] ??= []).push(f);
                  return acc;
                }, {}),
              ) as [FeatureCategory, typeof FEATURES][]
            ).map(([category, catFeatures]) => (
              <div key={category} className="platform-feature-overrides__group">
                <h3 className="platform-feature-overrides__category">
                  {categoryLabel(t, category)}
                </h3>
                <ul className="platform-feature-overrides__list">
                  {catFeatures.map((feat) => {
                    const override = currentOverrides[feat.key];
                    const hasOverride = override !== undefined;
                    const loadingThis = overrideLoading === feat.key;
                    return (
                      <li key={feat.key} className="platform-feature-override-row">
                        <span className="platform-feature-override-row__key" aria-hidden="true">
                          {feat.key}
                        </span>
                        <span className="platform-feature-override-row__title">
                          {featureTitle(t, feat)}
                        </span>
                        {hasOverride && (
                          <Badge tone={override ? 'success' : 'warning'}>
                            {override
                              ? t('platform.detail.featureOverrideForcedOn')
                              : t('platform.detail.featureOverrideForcedOff')}
                          </Badge>
                        )}
                        <div className="platform-feature-override-row__actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleSetOverride(feat.key, true)}
                            disabled={loadingThis || override === true}
                            aria-label={`${t('platform.detail.featureOverrideOn')} ${feat.key}`}
                            aria-pressed={override === true}
                          >
                            <ToggleRight size={13} aria-hidden="true" />
                            {t('platform.detail.featureOverrideOn')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleSetOverride(feat.key, false)}
                            disabled={loadingThis || override === false}
                            aria-label={`${t('platform.detail.featureOverrideOff')} ${feat.key}`}
                            aria-pressed={override === false}
                          >
                            <ToggleLeft size={13} aria-hidden="true" />
                            {t('platform.detail.featureOverrideOff')}
                          </Button>
                          {hasOverride && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleSetOverride(feat.key, null)}
                              disabled={loadingThis}
                              aria-label={`${t('platform.detail.featureOverrideClear')} ${feat.key}`}
                            >
                              <RotateCcw size={13} aria-hidden="true" />
                              {t('platform.detail.featureOverrideClear')}
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Lifecycle controls ────────────────────────────────────────────── */}
      {status !== 'archived' && (
        <section className="platform-detail-section" aria-label={t('platform.detail.lifecycleTitle')}>
          <h2 className="platform-overview__sectionhead">{t('platform.detail.lifecycleTitle')}</h2>

          {error && (
            <p role="alert" className="platform-detail-error">
              {t(`platform.detail.err.${error}`, { defaultValue: t('platform.detail.err.failed') })}
            </p>
          )}

          {showReasonForm && pendingAction === 'suspend' ? (
            <div className="platform-detail-reason-form">
              <label className="platform-detail-reason-label" htmlFor="suspend-reason">
                {t('platform.detail.suspendReasonLabel')}
              </label>
              <textarea
                id="suspend-reason"
                className="platform-detail-reason-input"
                rows={3}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder={t('platform.detail.suspendReasonPlaceholder')}
                aria-required="true"
              />
              <div className="platform-detail-reason-actions">
                <Button
                  variant="danger"
                  onClick={confirmSuspend}
                  disabled={loading}
                >
                  {loading ? t('common.saving') : t('platform.detail.confirmSuspend')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setShowReasonForm(false); setPendingAction(null); setError(null); }}
                  disabled={loading}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="platform-detail-lifecycle-actions">
              {status === 'active' && (
                <Button variant="danger" onClick={() => initiateAction('suspend')} disabled={loading}>
                  {t('platform.detail.suspendCta')}
                </Button>
              )}
              {status === 'suspended' && (
                <Button onClick={() => void initiateAction('reactivate')} disabled={loading}>
                  {loading ? t('common.saving') : t('platform.detail.reactivateCta')}
                </Button>
              )}
              <Button variant="ghost" onClick={() => void initiateAction('archive')} disabled={loading}>
                {loading ? t('common.saving') : t('platform.detail.archiveCta')}
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ── Subscription link ─────────────────────────────────────────────── */}
      <section className="platform-detail-section" aria-label={t('platform.detail.subscriptionTitle')}>
        <h2 className="platform-overview__sectionhead">{t('platform.detail.subscriptionTitle')}</h2>
        <p className="platform-detail-sub-note">
          {t('platform.detail.subscriptionNote')}
          {' '}
          <Link to="/consola/abonamente" className="platform-detail-sub-link">
            {t('platform.detail.subscriptionLink')}
          </Link>
        </p>
      </section>
    </div>
  );
}
