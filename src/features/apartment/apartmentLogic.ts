import type {
  Apartment,
  Meter,
  MeterReading,
  Poll,
  PollOption,
  Ticket,
  TicketStatus,
} from '@/shared/types/domain';

/* F35 — Informații apartament.
   A read-only aggregation for a single apartament composed over existing data:
   meter readings, tickets, and votes. No table of its own — these helpers fold
   the shared stores into per-apartment views. */

/** A meter together with its reading history (newest reading first). */
export interface MeterSummary {
  meter: Meter;
  /** Most recent reading, or null if none recorded. */
  latest: MeterReading | null;
  /** All readings for this meter, newest reading date first. */
  history: MeterReading[];
}

/** Meters belonging to an apartment, each with its readings newest-first. */
export function metersForApartment(
  meters: Meter[],
  readings: MeterReading[],
  apartmentId: string,
): MeterSummary[] {
  return meters
    .filter((m) => m.apartment_id === apartmentId)
    .map((meter) => {
      const history = readings
        .filter((r) => r.meter_id === meter.id)
        .sort(
          (a, b) => new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime(),
        );
      return { meter, latest: history[0] ?? null, history };
    });
}

/** Statuses that count as an open (not yet resolved) ticket. */
export const OPEN_TICKET_STATUSES: TicketStatus[] = ['primit', 'asignat', 'in_lucru'];

export function isOpenTicket(ticket: Ticket): boolean {
  return OPEN_TICKET_STATUSES.includes(ticket.status);
}

/** Tickets belonging to an apartment: tagged to it, or submitted by its
 *  resident. De-duplicated by id, newest first. */
export function ticketsForApartment(
  tickets: Ticket[],
  apartmentId: string,
  userId: string,
): Ticket[] {
  const seen = new Set<string>();
  return tickets
    .filter((t) => {
      if (t.apartment_id !== apartmentId && t.reporter_user_id !== userId) return false;
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export interface TicketSummary {
  open: number;
  resolved: number;
  total: number;
}

export function ticketSummary(tickets: Ticket[]): TicketSummary {
  const open = tickets.filter(isOpenTicket).length;
  return { open, resolved: tickets.length - open, total: tickets.length };
}

/** How a poll resolves for this apartment: which option it picked, if any. */
export interface VoteSummary {
  poll: Poll;
  /** The option this apartment selected, or null if it has not voted. */
  optionId: string | null;
  voted: boolean;
}

/** Fold each poll against the apartment's cast votes (pollId -> optionId). */
export function votesForApartment(
  polls: Poll[],
  myVotes: Record<string, string>,
): VoteSummary[] {
  return polls.map((poll) => {
    const optionId = myVotes[poll.id] ?? null;
    return { poll, optionId, voted: optionId !== null };
  });
}

/** How many of the given polls this apartment has voted in. */
export function votesCastCount(polls: Poll[], myVotes: Record<string, string>): number {
  return polls.filter((p) => Boolean(myVotes[p.id])).length;
}

/** Human label for a poll option id, or null when not found / not voted. */
export function optionLabel(options: PollOption[], optionId: string | null): string | null {
  if (!optionId) return null;
  return options.find((o) => o.id === optionId)?.label ?? null;
}

/** Short apartment label, e.g. "Ap. 5". */
export function apartmentShortLabel(apt: Apartment): string {
  return `Ap. ${apt.numar_apartament}`;
}

/** Cota-parte indiviză as a percent string, e.g. 0.048 -> "4,8%". */
export function cotaPartePercent(value: number | null): string | null {
  if (value == null) return null;
  return `${new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(value * 100)}%`;
}
