import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Download, FileJson, FileSpreadsheet, ShieldAlert, Trash2, History } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { useAuthStore } from '@/shared/store/authStore';
import { useGdprStore } from '@/shared/store/gdprStore';
import { useConsentStore } from '@/shared/store/consentStore';
import { useSecurityStore } from '@/shared/store/securityStore';
import { useTicketsStore } from '@/features/tickets/ticketsStore';
import { ticketsForAsociatii } from '@/features/tickets/ticketLogic';
import { useMarketplaceStore } from '@/features/marketplace/marketplaceStore';
import { useIdeasStore } from '@/features/ideas/ideasStore';
import { useDiscussionStore } from '@/features/discussions/discussionStore';
import { threadsForAsociatii } from '@/features/discussions/discussionLogic';
import { useAdminChatStore } from '@/features/adminchat/adminChatStore';
import { useAnonymousStore } from '@/features/anonymous/anonymousStore';
import { usePetitionStore } from '@/features/petitions/petitionStore';
import { useThankYousStore } from '@/features/thankyous/thankYousStore';
import { useDirectoryStore } from '@/features/directory/directoryStore';
import { useBirthdaysStore } from '@/features/birthdays/birthdaysStore';
import { useCarpoolStore } from '@/features/carpool/carpoolStore';
import { useSitterStore } from '@/features/sitters/sitterStore';
import { useBarterStore } from '@/features/barter/barterStore';
import { usePetsStore } from '@/features/pets/petsStore';
import { useBikesStore } from '@/features/bikes/bikesStore';
import { useLendingStore } from '@/features/lending/lendingStore';
import { useFeedbackStore } from '@/features/feedback/feedbackStore';
import { useKidsStore } from '@/features/kids/kidsStore';
import { useLaundryStore } from '@/features/laundry/laundryStore';
import { useMovingStore } from '@/features/moving/movingStore';
import { useVenueStore } from '@/features/venue/venueStore';
import { useVisitorsStore } from '@/features/visitors/visitorsStore';
import { formatDateTime } from '@/shared/lib/format';
import {
  DEMO_APARTMENTS,
  DEMO_ASOCIATIE,
  DEMO_CURRENT_APARTMENT_ID,
  DEMO_CURRENT_USER_ID,
  DEMO_CURRENT_USER_NAME,
} from '@/shared/demo/demoData';
import {
  ERASURE_PLAN,
  RETENTION_POLICY,
  collectPersonalData,
  hasOpenRequest,
  subjectAsociatieIds,
  toExportCsv,
  toExportJson,
  type DsrStatus,
} from './gdprLogic';

function download(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const STATUS_TONE: Record<DsrStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  completed: 'success',
  rejected: 'danger',
};

/** Resident self-service surface for the GDPR data-subject rights (T06). */
export default function MyDataPage() {
  const { t } = useTranslation();

  const profile = useAuthStore((s) => s.profile);
  const demo = useAuthStore((s) => s.demo);
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);
  const memberships = useAuthStore((s) => s.memberships);
  const localAsociatii = useAuthStore((s) => s.localAsociatii);
  const sessionEmail = useAuthStore((s) => s.session?.user?.email ?? null);
  const sessionUserId = useAuthStore((s) => s.session?.user?.id ?? null);

  const listings = useMarketplaceStore((s) => s.listings);
  const ideas = useIdeasStore((s) => s.items);
  const adminChatThreads = useAdminChatStore((s) => s.threads);
  const anonymousMessages = useAnonymousStore((s) => s.messages);
  const petitions = usePetitionStore((s) => s.petitions);
  const thankYous = useThankYousStore((s) => s.items);
  const directory = useDirectoryStore((s) => s.entries);
  const birthdays = useBirthdaysStore((s) => s.consents);
  const carpool = useCarpoolStore((s) => s.profiles);
  const sitters = useSitterStore((s) => s.profiles);
  const barter = useBarterStore((s) => s.offerings);
  const pets = usePetsStore((s) => s.pets);
  const bikes = useBikesStore((s) => s.bikes);
  const lending = useLendingStore((s) => s.items);
  const feedback = useFeedbackStore((s) => s.items);
  const kidsRanges = useKidsStore((s) => s.ranges);
  const kidsEvents = useKidsStore((s) => s.events);
  const laundryBookings = useLaundryStore((s) => s.bookings);
  const movingBookings = useMovingStore((s) => s.bookings);
  const venueBookings = useVenueStore((s) => s.bookings);
  const visitorReports = useVisitorsStore((s) => s.reports);
  const consentHistory = useConsentStore((s) => s.history);
  const securityEvents = useSecurityStore((s) => s.events);

  const requests = useGdprStore((s) => s.requests);
  const fileRequest = useGdprStore((s) => s.request);
  const actionRequest = useGdprStore((s) => s.action);

  const userId = profile?.id ?? sessionUserId ?? DEMO_CURRENT_USER_ID;
  const name = profile?.full_name ?? DEMO_CURRENT_USER_NAME;
  const email = profile?.email ?? sessionEmail;
  const asociatieId = currentAsociatieId ?? DEMO_ASOCIATIE.id;
  const asociatieName =
    localAsociatii.find((a) => a.id === currentAsociatieId)?.name ?? DEMO_ASOCIATIE.name;
  const apartment = demo
    ? (() => {
        const apt = DEMO_APARTMENTS.find((a) => a.id === DEMO_CURRENT_APARTMENT_ID);
        return apt ? `Ap. ${apt.numar_apartament}` : null;
      })()
    : null;

  const myRequests = useMemo(
    () =>
      requests
        .filter((r) => r.subject_user_id === userId)
        .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()),
    [requests, userId],
  );
  const erasurePending = hasOpenRequest(requests, userId, 'erasure');

  const buildExport = () => {
    // Tickets + discussions are keyed per asociație, so gather them across every
    // asociație the subject belongs to (not just the active one) for a complete
    // art. 15 access right (T77); the flat stores below already span all of them.
    const asociatieIds = subjectAsociatieIds(memberships, currentAsociatieId);
    const tickets = ticketsForAsociatii(useTicketsStore.getState().byAsociatie, asociatieIds);
    const discussionThreads = threadsForAsociatii(
      useDiscussionStore.getState().byAsociatie,
      asociatieIds,
    );
    return collectPersonalData({
      userId,
      name,
      email,
      apartment,
      asociatieName,
      tickets,
      marketplace: listings,
      ideas,
      discussionThreads,
      adminChatThreads,
      anonymousMessages,
      petitions,
      thankYous,
      directory,
      birthdays,
      carpool,
      sitters,
      barter,
      pets,
      bikes,
      lending,
      feedback,
      kidsRanges,
      kidsEvents,
      laundryBookings,
      movingBookings,
      venueBookings,
      visitorReports,
      consentHistory,
      securityEvents,
    });
  };

  /** Log the self-service access (accountability trail) then hand over the file. */
  const logExport = () => {
    const req = fileRequest('export', userId, name, asociatieId);
    actionRequest(req.id, 'completed', name);
  };

  const downloadJson = () => {
    const exp = buildExport();
    download('date-personale.json', toExportJson(exp), 'application/json;charset=utf-8');
    logExport();
    toast.success(t('gdpr.exported'));
  };

  const downloadCsv = () => {
    const exp = buildExport();
    download('date-personale.csv', toExportCsv(exp), 'text/csv;charset=utf-8');
    logExport();
    toast.success(t('gdpr.exported'));
  };

  const requestErasure = () => {
    if (erasurePending) {
      toast(t('gdpr.alreadyRequested'));
      return;
    }
    fileRequest('erasure', userId, name, asociatieId);
    toast.success(t('gdpr.erasureRequested'));
  };

  return (
    <div>
      <PageHeader title={t('gdpr.rightsTitle')} subtitle={t('gdpr.rightsSubtitle')} />

      <Card title={t('gdpr.exportTitle')}>
        <p className="text-sm text-muted" style={{ marginTop: 0 }}>
          {t('gdpr.exportBody')}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <Button onClick={downloadJson}>
            <FileJson size={15} /> {t('gdpr.downloadJson')}
          </Button>
          <Button variant="secondary" onClick={downloadCsv}>
            <FileSpreadsheet size={15} /> {t('gdpr.downloadCsv')}
          </Button>
        </div>
      </Card>

      <Card title={t('gdpr.retentionTitle')} className="mt-4">
        <p className="text-sm text-muted" style={{ marginTop: 0 }}>
          {t('gdpr.retentionBody')}
        </p>
        <div className="gdpr-table" role="table" aria-label={t('gdpr.retentionTitle')}>
          <div className="gdpr-table__row gdpr-table__row--head" role="row">
            <span role="columnheader">{t('gdpr.colCategory')}</span>
            <span role="columnheader">{t('gdpr.colPeriod')}</span>
            <span role="columnheader">{t('gdpr.colBasis')}</span>
          </div>
          {RETENTION_POLICY.map((r) => (
            <div key={r.category} className="gdpr-table__row" role="row">
              <span role="cell">{t(`gdpr.section.${r.category}`)}</span>
              <span role="cell">{t(r.periodKey)}</span>
              <span role="cell" className="text-muted">
                {t(r.basisKey)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title={t('gdpr.erasureTitle')} className="mt-4">
        <p className="text-sm text-muted" style={{ marginTop: 0 }}>
          {t('gdpr.erasureBody')}
        </p>
        <div className="gdpr-plan">
          <div className="iv-caps" style={{ marginBottom: 6 }}>
            {t('gdpr.erasurePlanTitle')}
          </div>
          <ul className="gdpr-plan__list">
            {ERASURE_PLAN.map((rule) => (
              <li key={rule.category} className="gdpr-plan__item">
                <Badge tone={rule.action === 'delete' ? 'danger' : rule.action === 'anonymize' ? 'warning' : 'neutral'}>
                  {t(`gdpr.action.${rule.action}`)}
                </Badge>
                <span className="gdpr-plan__cat">{t(`gdpr.section.${rule.category}`)}</span>
                <span className="gdpr-plan__reason text-muted">{t(rule.reasonKey)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ marginTop: 14 }}>
          <Button variant="danger" onClick={requestErasure} disabled={erasurePending}>
            <Trash2 size={15} /> {t('gdpr.requestErasure')}
          </Button>
          {erasurePending && (
            <p className="text-sm text-muted" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={14} /> {t('gdpr.alreadyRequested')}
            </p>
          )}
        </div>
      </Card>

      <Card title={t('gdpr.myRequestsTitle')} className="mt-4">
        {myRequests.length === 0 ? (
          <EmptyState icon={<History size={22} />} body={t('gdpr.myRequestsEmpty')} />
        ) : (
          <ul className="gdpr-requests">
            {myRequests.map((r) => (
              <li key={r.id} className="gdpr-requests__row">
                <span className="gdpr-requests__type">
                  {r.type === 'export' ? <Download size={14} /> : <Trash2 size={14} />}
                  {t(`gdpr.type.${r.type}`)}
                </span>
                <span className="text-muted">{formatDateTime(r.requested_at)}</span>
                <Badge tone={STATUS_TONE[r.status]}>{t(`gdpr.status.${r.status}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
