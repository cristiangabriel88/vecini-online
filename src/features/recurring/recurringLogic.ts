import type { Ticket, TicketSeverity } from '@/shared/types/domain';

/* F21 — Sesizări recurente.
   Computed entirely over the existing `tickets` data: no table of its own.
   The detector groups tickets by (category + location) inside a rolling window
   and surfaces any group that repeats often enough to look like a pattern
   rather than a one-off, with a suggested course of action. */

/** Rolling window the detector looks back over (the spec's "3 months"). */
export const RECURRING_WINDOW_DAYS = 90;

/** A group needs at least this many tickets in the window to count as recurring. */
export const RECURRING_MIN_COUNT = 3;

/** Suggested response: a lasting structural fix vs. ongoing routine maintenance. */
export type RecurringAction = 'structural' | 'maintenance';

export interface RecurringIssue {
  /** stable identity: normalized category + location, drives acknowledgement */
  key: string;
  category: string;
  location: string;
  count: number;
  /** earliest occurrence inside the window (ISO) */
  firstAt: string;
  /** most recent occurrence inside the window (ISO) */
  lastAt: string;
  maxSeverity: TicketSeverity;
  ticketIds: string[];
  suggestion: RecurringAction;
}

const SEVERITY_RANK: Record<TicketSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/** Accent-insensitive, lower-cased key part for grouping. */
function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Human-readable location for a ticket: prefer the free-text description,
 *  otherwise compose it from scara/etaj, falling back to "unspecified". */
export function ticketLocationLabel(ticket: Ticket): string {
  if (ticket.location_description && ticket.location_description.trim()) {
    return ticket.location_description.trim();
  }
  const parts: string[] = [];
  if (ticket.location_scara) parts.push(`Scara ${ticket.location_scara}`);
  if (ticket.location_etaj != null) parts.push(`etaj ${ticket.location_etaj}`);
  return parts.join(', ') || 'Nespecificat';
}

/** Grouping key — same kind of problem in the same place. */
function groupKey(ticket: Ticket): string {
  return `${norm(ticket.category)}::${norm(ticketLocationLabel(ticket))}`;
}

/** Highest severity seen across a set of tickets. */
export function maxSeverity(tickets: Ticket[]): TicketSeverity {
  return tickets.reduce<TicketSeverity>(
    (acc, t) => (SEVERITY_RANK[t.severity] > SEVERITY_RANK[acc] ? t.severity : acc),
    'low',
  );
}

/** A frequent or severe pattern points at a structural fix; otherwise it reads
 *  as something to keep on the routine-maintenance list. */
export function suggestAction(count: number, severity: TicketSeverity): RecurringAction {
  return SEVERITY_RANK[severity] >= SEVERITY_RANK.high || count >= 4 ? 'structural' : 'maintenance';
}

/** Detect recurring issues: group recent tickets by category+location and keep
 *  those that repeat at least RECURRING_MIN_COUNT times inside the window.
 *  Sorted most-frequent first, then most-recent activity. */
export function detectRecurring(tickets: Ticket[], now: Date = new Date()): RecurringIssue[] {
  const cutoff = now.getTime() - RECURRING_WINDOW_DAYS * 86_400_000;
  const groups = new Map<string, Ticket[]>();

  for (const ticket of tickets) {
    if (new Date(ticket.created_at).getTime() < cutoff) continue;
    const key = groupKey(ticket);
    const bucket = groups.get(key);
    if (bucket) bucket.push(ticket);
    else groups.set(key, [ticket]);
  }

  const issues: RecurringIssue[] = [];
  for (const [key, list] of groups) {
    if (list.length < RECURRING_MIN_COUNT) continue;
    const sorted = [...list].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const severity = maxSeverity(list);
    issues.push({
      key,
      category: sorted[0].category,
      location: ticketLocationLabel(sorted[0]),
      count: list.length,
      firstAt: sorted[0].created_at,
      lastAt: sorted[sorted.length - 1].created_at,
      maxSeverity: severity,
      ticketIds: sorted.map((t) => t.id),
      suggestion: suggestAction(list.length, severity),
    });
  }

  return issues.sort(
    (a, b) => b.count - a.count || new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
}
