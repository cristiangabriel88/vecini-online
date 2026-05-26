import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Clock,
  Hash,
  Home as HomeIcon,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Plus,
  UserCog,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { usePlatformAsociatiiStore } from './platformAsociatiiStore';
import { isDormant } from './platformProvisioningLogic';

/**
 * Superadmin console: asociații list page (T94, updated T152).
 *
 * Lists every asociație on the platform. The "Add association" button navigates
 * to the dedicated `/consola/asociatii/adauga` page (T152) where the operator
 * enters only the new administrator's name and email and sends the invite email.
 * A "Pending invitations" section shows invites that have been sent but where
 * the admin has not yet completed onboarding.
 *
 * Setup codes and setup links are no longer shown in the platform UI (T152);
 * the setup link lives exclusively in the invitation email (T153 admin template).
 */
export default function PlatformAsociatiiPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);
  const provisions = usePlatformAsociatiiStore((s) => s.provisions);
  const pendingInvites = usePlatformAsociatiiStore((s) => s.pendingInvites);

  const openAddPage = () => navigate('/consola/asociatii/adauga');

  return (
    <div>
      <PageHeader
        title={t('platform.asociatii.title')}
        subtitle={t('platform.asociatii.subtitle')}
        action={
          <Button onClick={openAddPage}>
            <Plus className="h-4 w-4" /> {t('platform.asociatii.provisionCta')}
          </Button>
        }
      />

      {/* ── Pending invitations ─────────────────────────────────────────── */}
      {pendingInvites.length > 0 && (
        <section className="platform-asoc-pending" aria-label={t('platform.asociatii.pendingInvitesTitle')}>
          <h2 className="platform-overview__sectionhead">
            {t('platform.asociatii.pendingInvitesTitle')}
          </h2>
          <div className="platform-asoc-pending-list">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="platform-asoc-pending-card">
                <span className="platform-asoc-pending-card__icon" aria-hidden="true">
                  <Clock size={15} />
                </span>
                <div className="platform-asoc-pending-card__body">
                  <span className="platform-asoc-pending-card__name">{inv.adminName}</span>
                  <span className="platform-asoc-pending-card__email">{inv.adminEmail}</span>
                  <span className="platform-asoc-pending-card__date">
                    {t('platform.asociatii.invitedOn', { date: formatDate(inv.invitedAt) })}
                  </span>
                </div>
                <Badge tone="warning">{t('platform.asociatii.pendingSetup')}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Asociații list ─────────────────────────────────────────────── */}
      <div className="platform-asoc-listhead">
        <h2 className="platform-overview__sectionhead">{t('platform.asociatii.listTitle')}</h2>
        <span className="platform-asoc-count">
          {t('platform.asociatii.count', { count: asociatii.length })}
        </span>
      </div>

      {asociatii.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} />}
          body={t('platform.asociatii.empty')}
          action={
            <Button onClick={openAddPage}>
              <Plus className="h-4 w-4" /> {t('platform.asociatii.provisionCta')}
            </Button>
          }
        />
      ) : (
        <div className="platform-asoc-grid">
          {asociatii.map((a) => {
            const dormant = isDormant(a.lastAdminSignInAt);
            const prov = provisions[a.id];
            return (
              <article key={a.id} className="platform-asoc-card">
                <header className="platform-asoc-card__head">
                  <span className="platform-asoc-card__icon" aria-hidden="true">
                    <Building2 size={18} />
                  </span>
                  <div className="platform-asoc-card__title-wrap">
                    <h3 className="platform-asoc-card__title">{a.name}</h3>
                    <p className="platform-asoc-card__city">{a.city}</p>
                  </div>
                  <Badge tone={dormant ? 'warning' : 'success'}>
                    {dormant ? t('platform.asociatii.dormant') : t('platform.asociatii.active')}
                  </Badge>
                </header>

                <div className="platform-asoc-card__stats">
                  <span className="platform-asoc-stat">
                    <Users size={14} aria-hidden="true" />
                    {t('platform.asociatii.members', { count: a.members })}
                  </span>
                  <span className="platform-asoc-stat">
                    <HomeIcon size={14} aria-hidden="true" />
                    {t('platform.asociatii.apartments', { count: a.apartments })}
                  </span>
                </div>

                <p className="platform-asoc-card__signin">
                  {a.lastAdminSignInAt
                    ? t('platform.asociatii.lastSignIn', { date: formatDate(a.lastAdminSignInAt) })
                    : t('platform.asociatii.neverSignedIn')}
                </p>

                {(a.address || a.cui || a.iban || a.contactPhone || a.contactEmail) && (
                  <dl className="platform-asoc-card__identity">
                    {a.address && (
                      <div className="platform-asoc-identity-row">
                        <dt>
                          <MapPin size={13} aria-hidden="true" />
                          {t('platform.asociatii.fields.address')}
                        </dt>
                        <dd>{a.address}</dd>
                      </div>
                    )}
                    {a.cui && (
                      <div className="platform-asoc-identity-row">
                        <dt>
                          <Hash size={13} aria-hidden="true" />
                          {t('platform.asociatii.fields.cui')}
                        </dt>
                        <dd>{a.cui}</dd>
                      </div>
                    )}
                    {a.iban && (
                      <div className="platform-asoc-identity-row">
                        <dt>
                          <Landmark size={13} aria-hidden="true" />
                          {t('platform.asociatii.fields.iban')}
                        </dt>
                        <dd>{a.iban}</dd>
                      </div>
                    )}
                    {a.contactPhone && (
                      <div className="platform-asoc-identity-row">
                        <dt>
                          <Phone size={13} aria-hidden="true" />
                          {t('platform.asociatii.fields.contactPhone')}
                        </dt>
                        <dd>{a.contactPhone}</dd>
                      </div>
                    )}
                    {a.contactEmail && (
                      <div className="platform-asoc-identity-row">
                        <dt>
                          <Mail size={13} aria-hidden="true" />
                          {t('platform.asociatii.fields.contactEmail')}
                        </dt>
                        <dd>{a.contactEmail}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {/* Admin info (old provisioning records): name/email + badge only.
                    Setup codes and links are no longer shown in the UI (T152);
                    they live in the emailed invitation (T153 template). */}
                {prov && !prov.redeemedAt && (
                  <div className="platform-asoc-card__admin">
                    <div className="platform-asoc-card__admin-head">
                      <span className="platform-asoc-card__admin-icon" aria-hidden="true">
                        <UserCog size={14} />
                      </span>
                      <div className="platform-asoc-card__admin-meta">
                        <span className="platform-asoc-card__admin-label">
                          {t('platform.asociatii.adminLabel')}
                        </span>
                        <span className="platform-asoc-card__admin-name">{prov.name}</span>
                        <span className="platform-asoc-card__admin-email">{prov.email}</span>
                      </div>
                      <Badge tone="warning">{t('platform.asociatii.pendingSetup')}</Badge>
                    </div>
                    <p className="platform-asoc-card__provisioned">
                      {t('platform.asociatii.provisionedOn', { date: formatDate(prov.provisionedAt) })}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
