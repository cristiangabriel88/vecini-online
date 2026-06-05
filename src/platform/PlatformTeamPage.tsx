import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Mail,
  Plus,
  Shield,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { formatDate } from '@/shared/lib/format';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { useAuthStore } from '@/shared/store/authStore';
import { hydrateTeam } from './platformApi';
import { usePlatformTeamStore } from './platformTeamStore';
import { usePlatformAuthStore } from './platformAuthStore';
import { DEMO_PLATFORM_ADMIN } from './demoPlatform';

/**
 * Platform console: operator team management page (T251).
 *
 * Lists the current platform superadmins (name, email, granted date, last
 * sign-in), allows inviting a new operator, and revoking an existing one
 * with a guard against removing the last admin. All privileged writes go
 * through service-role Netlify functions; demo drives the persisted store.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function callInviteFunction(
  name: string,
  email: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch('/.netlify/functions/platform-team-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email }),
    });
    const data = (await resp.json()) as Record<string, unknown>;
    if (!resp.ok) return { ok: false, error: String(data.error ?? 'failed') };
    return { ok: true };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

async function callRevokeFunction(
  targetUserId: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch('/.netlify/functions/platform-team-revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUserId }),
    });
    const data = (await resp.json()) as Record<string, unknown>;
    if (!resp.ok) return { ok: false, error: String(data.error ?? 'failed') };
    return { ok: true };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

export default function PlatformTeamPage() {
  const { t } = useTranslation();

  const admins = usePlatformTeamStore((s) => s.admins);
  const pendingInvites = usePlatformTeamStore((s) => s.pendingInvites);
  const fetchError = usePlatformTeamStore((s) => s.fetchError);
  const inviteAdmin = usePlatformTeamStore((s) => s.inviteAdmin);
  const revokeAdmin = usePlatformTeamStore((s) => s.revokeAdmin);
  const cancelInvite = usePlatformTeamStore((s) => s.cancelInvite);

  const isDemo = usePlatformAuthStore.getState().demo || !isSupabaseConfigured;
  const currentUserId = useAuthStore((s) => s.session?.user?.id) ?? DEMO_PLATFORM_ADMIN.id;

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteErrors, setInviteErrors] = useState<{ name?: string; email?: string }>({});
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDemo) void hydrateTeam();
  }, [isDemo]);

  async function handleInvite() {
    const name = inviteName.trim();
    const email = inviteEmail.trim();
    const errors: { name?: string; email?: string } = {};
    if (!name) errors.name = 'required';
    else if (name.length < 2) errors.name = 'tooShort';
    if (!email) errors.email = 'required';
    else if (!EMAIL_RE.test(email)) errors.email = 'email';
    if (Object.keys(errors).length > 0) { setInviteErrors(errors); return; }
    setInviteErrors({});
    setInviteError(null);
    setInviteLoading(true);

    if (isDemo) {
      inviteAdmin(name, email);
      setInviteSuccess(email);
      setInviteName('');
      setInviteEmail('');
      setShowInviteForm(false);
      setInviteLoading(false);
      return;
    }

    const token = useAuthStore.getState().session?.access_token ?? '';
    if (!token) { setInviteError('unauthorized'); setInviteLoading(false); return; }
    const result = await callInviteFunction(name, email, token);
    if (!result.ok) {
      setInviteError(result.error === 'already-admin' ? 'alreadyAdmin' : 'inviteFailed');
      setInviteLoading(false);
      return;
    }
    inviteAdmin(name, email);
    setInviteSuccess(email);
    setInviteName('');
    setInviteEmail('');
    setShowInviteForm(false);
    setInviteLoading(false);
  }

  async function handleRevoke(userId: string) {
    setRevokeError(null);
    setRevokeConfirmId(null);
    setRevokeLoading(userId);

    if (admins.length <= 1) {
      setRevokeError('lastAdmin');
      setRevokeLoading(null);
      return;
    }

    if (isDemo) {
      revokeAdmin(userId);
      setRevokeLoading(null);
      return;
    }

    const token = useAuthStore.getState().session?.access_token ?? '';
    if (!token) { setRevokeError('unauthorized'); setRevokeLoading(null); return; }
    const result = await callRevokeFunction(userId, token);
    if (!result.ok) {
      setRevokeError(result.error === 'last-admin' ? 'lastAdmin' : 'revokeFailed');
      setRevokeLoading(null);
      return;
    }
    revokeAdmin(userId);
    setRevokeLoading(null);
  }

  return (
    <div>
      <PageHeader
        title={t('platform.team.title')}
        subtitle={t('platform.team.subtitle')}
      />

      {fetchError && (
        <p role="alert" className="platform-detail-error">
          {t(`platform.team.err.${fetchError}`, { defaultValue: t('platform.team.err.failed') })}
        </p>
      )}

      {/* ── Active operators ─────────────────────────────────────────────── */}
      <section className="platform-detail-section" aria-label={t('platform.team.membersTitle')}>
        <h2 className="platform-overview__sectionhead">{t('platform.team.membersTitle')}</h2>

        {revokeError && (
          <p role="alert" className="platform-detail-error">
            {t(`platform.team.err.${revokeError}`, { defaultValue: t('platform.team.err.failed') })}
          </p>
        )}

        {admins.length === 0 ? (
          <p className="platform-detail-sub-note">{t('platform.team.membersEmpty')}</p>
        ) : (
          <ul className="platform-roster-list">
            {admins.map((admin) => {
              const isCurrentUser = admin.userId === currentUserId;
              const isLastAdmin = admins.length <= 1;
              return (
                <li key={admin.userId} className="platform-roster-item">
                  <span className="platform-roster-item__icon" aria-hidden="true">
                    <Shield size={14} />
                  </span>
                  <div className="platform-roster-item__body">
                    <span className="platform-roster-item__name">{admin.name}</span>
                    <span className="platform-roster-item__email">{admin.email}</span>
                    {isCurrentUser && (
                      <Badge tone="success">{t('platform.team.youBadge')}</Badge>
                    )}
                    <span className="platform-roster-item__date">
                      {t('platform.team.grantedOn', { date: formatDate(admin.grantedAt) })}
                    </span>
                    {admin.lastSignInAt ? (
                      <span className="platform-roster-item__date">
                        {t('platform.team.lastSignIn', { date: formatDate(admin.lastSignInAt) })}
                      </span>
                    ) : (
                      <span className="platform-roster-item__date">
                        {t('platform.team.neverSignedIn')}
                      </span>
                    )}
                  </div>
                  <div className="platform-roster-item__actions">
                    {!isLastAdmin && revokeConfirmId !== admin.userId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevokeConfirmId(admin.userId)}
                        disabled={!!revokeLoading}
                        aria-label={t('platform.team.revokeCta')}
                        data-testid={`revoke-platform-admin-${admin.userId}`}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        {t('platform.team.revokeCta')}
                      </Button>
                    )}
                    {!isLastAdmin && revokeConfirmId === admin.userId && (
                      <div className="platform-roster-confirm">
                        <span className="platform-roster-confirm__body">
                          {t('platform.team.confirmRevokeBody', { name: admin.name })}
                        </span>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => void handleRevoke(admin.userId)}
                          disabled={!!revokeLoading}
                        >
                          {revokeLoading === admin.userId
                            ? t('common.saving')
                            : t('platform.team.confirmRevoke')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevokeConfirmId(null)}
                          disabled={!!revokeLoading}
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

        {/* Invite form */}
        {inviteSuccess && !showInviteForm && (
          <p role="status" className="platform-detail-success">
            {t('platform.team.inviteSuccess', { email: inviteSuccess })}
          </p>
        )}

        {inviteError && (
          <p role="alert" className="platform-detail-error">
            {t(`platform.team.err.${inviteError}`, { defaultValue: t('platform.team.err.failed') })}
          </p>
        )}

        {!showInviteForm ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowInviteForm(true); setInviteSuccess(null); setInviteError(null); }}
            className="platform-roster-add-btn"
          >
            <Plus size={13} aria-hidden="true" />
            {t('platform.team.inviteCta')}
          </Button>
        ) : (
          <div className="platform-roster-provision-form">
            <h3 className="platform-roster-provision-form__title">
              {t('platform.team.inviteFormTitle')}
            </h3>
            <div className="platform-roster-provision-form__fields">
              <div className="platform-detail-field">
                <label htmlFor="team-invite-name" className="platform-detail-reason-label">
                  <UserRound size={13} aria-hidden="true" />
                  {t('platform.team.nameLabel')}
                </label>
                <input
                  id="team-invite-name"
                  type="text"
                  className="platform-detail-reason-input platform-detail-reason-input--single"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder={t('platform.team.namePlaceholder')}
                  aria-invalid={!!inviteErrors.name}
                />
                {inviteErrors.name && (
                  <span className="platform-detail-field-error" role="alert">
                    {t(`platform.team.err.${inviteErrors.name}`)}
                  </span>
                )}
              </div>
              <div className="platform-detail-field">
                <label htmlFor="team-invite-email" className="platform-detail-reason-label">
                  <Mail size={13} aria-hidden="true" />
                  {t('platform.team.emailLabel')}
                </label>
                <input
                  id="team-invite-email"
                  type="email"
                  className="platform-detail-reason-input platform-detail-reason-input--single"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t('platform.team.emailPlaceholder')}
                  aria-invalid={!!inviteErrors.email}
                />
                {inviteErrors.email && (
                  <span className="platform-detail-field-error" role="alert">
                    {t(`platform.team.err.${inviteErrors.email}`)}
                  </span>
                )}
              </div>
            </div>
            <div className="platform-detail-reason-actions">
              <Button
                onClick={() => void handleInvite()}
                disabled={inviteLoading}
              >
                {inviteLoading ? t('common.saving') : t('platform.team.submit')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteErrors({});
                  setInviteError(null);
                }}
                disabled={inviteLoading}
              >
                {t('platform.team.cancel')}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── Pending invitations ───────────────────────────────────────────── */}
      {pendingInvites.length > 0 && (
        <section className="platform-detail-section" aria-label={t('platform.team.pendingTitle')}>
          <h2 className="platform-overview__sectionhead">{t('platform.team.pendingTitle')}</h2>
          <ul className="platform-roster-list">
            {pendingInvites.map((inv) => (
              <li key={inv.id} className="platform-roster-item">
                <span className="platform-roster-item__icon" aria-hidden="true">
                  <Clock size={14} />
                </span>
                <div className="platform-roster-item__body">
                  <span className="platform-roster-item__name">{inv.name}</span>
                  <span className="platform-roster-item__email">{inv.email}</span>
                  <Badge tone="warning">{t('platform.team.pendingBadge')}</Badge>
                  <span className="platform-roster-item__date">
                    {t('platform.team.invitedOn', { date: formatDate(inv.invitedAt) })}
                  </span>
                </div>
                <div className="platform-roster-item__actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelInvite(inv.id)}
                    aria-label={t('platform.team.cancelInviteCta')}
                  >
                    <X size={12} aria-hidden="true" />
                    {t('platform.team.cancelInviteCta')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
