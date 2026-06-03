import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  DoorOpen,
  Gauge,
  AlertCircle,
  Vote as VoteIcon,
  Wallet,
  Users,
  Ruler,
  PieChart,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { useAsociatieMeters } from '@/features/meters/metersStore';
import { useAsociatieTickets } from '@/features/tickets/ticketsStore';
import { usePollsStore, useAsociatiePolls } from '@/features/polls/pollsStore';
import {
  DEMO_APARTMENTS,
  DEMO_CURRENT_APARTMENT_ID,
  DEMO_CURRENT_USER_ID,
} from '@/shared/demo/demoData';
import type { Ticket, TicketStatus } from '@/shared/types/domain';
import {
  apartmentShortLabel,
  cotaPartePercent,
  metersForApartment,
  optionLabel,
  ticketSummary,
  ticketsForApartment,
  votesCastCount,
  votesForApartment,
} from './apartmentLogic';

const STATUS_TONE: Record<TicketStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  primit: 'warning',
  asignat: 'warning',
  in_lucru: 'warning',
  rezolvat: 'success',
  verificat: 'success',
  inchis: 'neutral',
  respins: 'danger',
};

export default function ApartmentInfoPage() {
  const { t } = useTranslation();
  const { meters, readings } = useAsociatieMeters();
  const tickets = useAsociatieTickets();
  const myVotes = usePollsStore((s) => s.myVotes);
  const { polls, options: pollOptions } = useAsociatiePolls();

  const apartment = useMemo(
    () => DEMO_APARTMENTS.find((a) => a.id === DEMO_CURRENT_APARTMENT_ID) ?? DEMO_APARTMENTS[0],
    [],
  );

  const meterSummaries = useMemo(
    () => metersForApartment(meters, readings, apartment.id),
    [meters, readings, apartment.id],
  );
  const myTickets = useMemo(
    () => ticketsForApartment(tickets, apartment.id, DEMO_CURRENT_USER_ID),
    [tickets, apartment.id],
  );
  const summary = useMemo(() => ticketSummary(myTickets), [myTickets]);
  const voteSummaries = useMemo(() => votesForApartment(polls, myVotes), [polls, myVotes]);
  const votesCast = useMemo(() => votesCastCount(polls, myVotes), [polls, myVotes]);

  const cotaParte = cotaPartePercent(apartment.cota_parte_indiviza);

  const detail = (icon: React.ReactNode, label: string, value: string) => (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted">{icon}</span>
      <span className="text-muted">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  const TicketRow = ({ ticket }: { ticket: Ticket }) => (
    <div className="flex items-start justify-between gap-3 border-t border-[var(--border)] py-2 first:border-t-0 first:pt-0">
      <div>
        <p className="font-medium">{ticket.title}</p>
        <p className="text-xs text-muted">{formatDate(ticket.created_at)}</p>
      </div>
      <Badge tone={STATUS_TONE[ticket.status]}>{t(`tickets.status_${ticket.status}`)}</Badge>
    </div>
  );

  return (
    <div>
      <PageHeader title={t('apartment.title')} subtitle={t('apartment.subtitle')} />

      <div className="space-y-4">
        <Card title={apartmentShortLabel(apartment)}>
          <div className="space-y-2">
            {apartment.proprietar_principal_name &&
              detail(<DoorOpen className="h-4 w-4" />, t('apartment.owner'), apartment.proprietar_principal_name)}
            {detail(
              <DoorOpen className="h-4 w-4" />,
              t('apartment.location'),
              [
                apartment.scara ? t('apartment.scaraValue', { scara: apartment.scara }) : null,
                apartment.etaj != null ? t('apartment.etajValue', { etaj: apartment.etaj }) : null,
              ]
                .filter(Boolean)
                .join(' · ') || t('apartment.unspecified'),
            )}
            {apartment.suprafata_utila != null &&
              detail(
                <Ruler className="h-4 w-4" />,
                t('apartment.area'),
                t('apartment.areaValue', { value: apartment.suprafata_utila }),
              )}
            {cotaParte && detail(<PieChart className="h-4 w-4" />, t('apartment.cotaParte'), cotaParte)}
            {detail(
              <Users className="h-4 w-4" />,
              t('apartment.persons'),
              String(apartment.numar_persoane),
            )}
          </div>
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <Gauge className="h-4 w-4" /> {t('apartment.meters')}
            </span>
          }
        >
          {meterSummaries.length === 0 ? (
            <p className="text-sm text-muted">{t('apartment.metersEmpty')}</p>
          ) : (
            <div className="space-y-4">
              {meterSummaries.map(({ meter, latest, history }) => (
                <div key={meter.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t(`meters.kind_${meter.kind}`)}</span>
                    <span className="text-sm text-muted">{meter.serial}</span>
                  </div>
                  {latest ? (
                    <p className="text-sm">
                      {t('apartment.latestReading', {
                        value: latest.value,
                        date: formatDate(latest.reading_date),
                      })}
                    </p>
                  ) : (
                    <p className="text-sm text-muted">{t('apartment.noReading')}</p>
                  )}
                  {history.length > 1 && (
                    <ul className="text-xs text-muted">
                      {history.slice(1).map((r) => (
                        <li key={r.id}>
                          {formatDate(r.reading_date)} — {r.value}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {t('apartment.tickets')}
            </span>
          }
        >
          {myTickets.length === 0 ? (
            <p className="text-sm text-muted">{t('apartment.ticketsEmpty')}</p>
          ) : (
            <div>
              <p className="mb-2 text-sm text-muted">
                {t('apartment.ticketSummary', { open: summary.open, resolved: summary.resolved })}
              </p>
              <div>
                {myTickets.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <VoteIcon className="h-4 w-4" /> {t('apartment.votes')}
            </span>
          }
        >
          {voteSummaries.length === 0 ? (
            <p className="text-sm text-muted">{t('apartment.votesEmpty')}</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted">
                {t('apartment.votesCast', { count: votesCast, total: voteSummaries.length })}
              </p>
              {voteSummaries.map(({ poll, optionId, voted }) => (
                <div
                  key={poll.id}
                  className="flex items-start justify-between gap-3 border-t border-[var(--border)] py-2 first:border-t-0 first:pt-0"
                >
                  <p className="font-medium">{poll.title}</p>
                  {voted ? (
                    <Badge tone="success">{optionLabel(pollOptions, optionId) ?? t('apartment.voted')}</Badge>
                  ) : (
                    <Link to="/app/voturi" className="text-sm font-medium text-primary hover:underline">
                      {t('apartment.notVoted')}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4" /> {t('apartment.payments')}
            </span>
          }
        >
          <EmptyState body={t('apartment.paymentsDisabled')} icon={<Wallet className="h-8 w-8" />} />
        </Card>
      </div>
    </div>
  );
}
