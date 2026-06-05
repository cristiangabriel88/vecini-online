import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Building2,
  Hash,
  Home as HomeIcon,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { formatDate } from '@/shared/lib/format';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { useAuthStore } from '@/shared/store/authStore';
import { usePlatformAsociatiiStore } from './platformAsociatiiStore';
import { usePlatformAuthStore } from './platformAuthStore';
import { isDormant } from './platformProvisioningLogic';
import type { AsociatieStatus } from './demoPlatform';

/**
 * Superadmin console: asociație detail page (T249).
 *
 * Shows the full identity, member and apartment counts, last admin sign-in,
 * current lifecycle status and the lifecycle controls (suspend / reactivate /
 * archive). The privileged status write runs through the asociatie-lifecycle
 * Netlify function in live mode; demo drives the persisted platform store.
 */

type LifecycleAction = 'suspend' | 'reactivate' | 'archive';

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

export default function PlatformAsociatieDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);
  const updateLifecycle = usePlatformAsociatiiStore((s) => s.updateLifecycle);
  const a = asociatii.find((x) => x.id === id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(null);

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
