import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { ErrorState } from '@/shared/components/ErrorState';
import { formatDate } from '@/shared/lib/format';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { usePlatformAsociatiiStore, type AsociatiiListFilter } from './platformAsociatiiStore';
import { isDormant } from './platformProvisioningLogic';
import { hydrateAsociatiiList } from './platformApi';
import type { AsociatieStatus } from './demoPlatform';

/**
 * Superadmin console: asociații list page (T94, updated T152, T249).
 *
 * Lists every asociație on the platform with status badges and a lifecycle
 * filter. Cards link to the detail page (/consola/asociatii/:id). The "Add
 * association" button navigates to the dedicated /consola/asociatii/adauga page.
 */

function statusTone(status: AsociatieStatus | undefined): 'success' | 'warning' | 'neutral' {
  if (status === 'suspended') return 'warning';
  if (status === 'archived') return 'neutral';
  return 'success';
}

const FILTERS: AsociatiiListFilter[] = ['all', 'active', 'suspended', 'archived'];

export default function PlatformAsociatiiPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);
  const provisions = usePlatformAsociatiiStore((s) => s.provisions);
  const pendingInvites = usePlatformAsociatiiStore((s) => s.pendingInvites);
  const fetchError = usePlatformAsociatiiStore((s) => s.fetchError);
  const listFilter = usePlatformAsociatiiStore((s) => s.listFilter);
  const setListFilter = usePlatformAsociatiiStore((s) => s.setListFilter);
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setIsHydrating(true);
    void hydrateAsociatiiList().finally(() => setIsHydrating(false));
  }, []);

  const retry = () => {
    setIsHydrating(true);
    void hydrateAsociatiiList().finally(() => setIsHydrating(false));
  };

  const openAddPage = () => navigate('/consola/asociatii/adauga');

  const filtered =
    listFilter === 'all'
      ? asociatii
      : asociatii.filter((a) => (a.status ?? 'active') === listFilter);

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

      {/* ── Fetch error ──────────────────────────────────────────────────── */}
      {fetchError && !isHydrating && (
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button variant="ghost" onClick={retry}>
              {t('common.retry')}
            </Button>
          }
        />
      )}

      {/* ── Asociații list ─────────────────────────────────────────────── */}
      {!fetchError && (
        <>
          <div className="platform-asoc-listhead">
            <h2 className="platform-overview__sectionhead">{t('platform.asociatii.listTitle')}</h2>
            <span className="platform-asoc-count">
              {t('platform.asociatii.count', { count: asociatii.length })}
            </span>
          </div>

          {/* Filter tabs */}
          <div className="platform-asoc-filters" role="group" aria-label={t('platform.asociatii.filterLabel')}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`platform-asoc-filter-btn${listFilter === f ? ' platform-asoc-filter-btn--active' : ''}`}
                onClick={() => setListFilter(f)}
                aria-pressed={listFilter === f}
              >
                {t(`platform.asociatii.filter.${f}`)}
              </button>
            ))}
          </div>

          {filtered.length === 0 && !isHydrating ? (
            <EmptyState
              icon={<Building2 size={22} />}
              body={listFilter === 'all'
                ? t('platform.asociatii.empty')
                : t('platform.asociatii.emptyFiltered', { filter: t(`platform.asociatii.filter.${listFilter}`) })}
              action={
                listFilter === 'all'
                  ? (
                    <Button onClick={openAddPage}>
                      <Plus className="h-4 w-4" /> {t('platform.asociatii.provisionCta')}
                    </Button>
                  )
                  : (
                    <Button variant="ghost" onClick={() => setListFilter('all')}>
                      {t('platform.asociatii.filter.clearFilter')}
                    </Button>
                  )
              }
            />
          ) : (
            <div className="platform-asoc-grid">
              {filtered.map((a) => {
                const dormant = isDormant(a.lastAdminSignInAt);
                const prov = provisions[a.id];
                const status = a.status ?? 'active';
                return (
                  <article key={a.id} className="platform-asoc-card">
                    <Link
                      to={`/consola/asociatii/${a.id}`}
                      className="platform-asoc-card__link-overlay"
                      aria-label={t('platform.asociatii.viewDetail', { name: a.name })}
                    />
                    <header className="platform-asoc-card__head">
                      <span className="platform-asoc-card__icon" aria-hidden="true">
                        <Building2 size={18} />
                      </span>
                      <div className="platform-asoc-card__title-wrap">
                        <h3 className="platform-asoc-card__title">{a.name}</h3>
                        {a.city && <p className="platform-asoc-card__city">{a.city}</p>}
                      </div>
                      <div className="platform-asoc-card__badges">
                        <Badge tone={statusTone(a.status)}>
                          {t(`platform.detail.status.${status}`)}
                        </Badge>
                        {status === 'active' && (
                          <Badge tone={dormant ? 'warning' : 'success'}>
                            {dormant ? t('platform.asociatii.dormant') : t('platform.asociatii.active')}
                          </Badge>
                        )}
                      </div>
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
        </>
      )}
    </div>
  );
}
