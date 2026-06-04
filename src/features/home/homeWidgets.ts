import type { Announcement, BuildingEvent, Poll, Ticket, TicketStatus } from '@/shared/types/domain';
import type { FeatureKey } from '@/shared/features/registry';

/**
 * F108 — Rich per-card home widgets. Each widget describes live at-a-glance
 * state for one feature, rendered inside an expanded shortcut card.
 * All builders are pure (no side effects, no React) so they are trivially testable.
 */

const CLOSED_TICKET_STATUSES: readonly TicketStatus[] = ['rezolvat', 'verificat', 'inchis', 'respins'];

/** Discriminated union of all supported widget kinds. */
export type WidgetData =
  | { kind: 'announcement'; title: string; date: string | null }
  | { kind: 'event'; title: string; startsAt: string }
  | { kind: 'polls'; count: number; firstTitle: string }
  | { kind: 'open_tickets'; count: number };

/**
 * Latest published announcement, sorted by published_at descending.
 * Returns null when no published announcements exist.
 */
export function buildAnnouncementWidget(announcements: Announcement[]): WidgetData | null {
  const published = announcements.filter((a) => a.published_at !== null);
  if (published.length === 0) return null;
  const latest = published.reduce((best, a) =>
    (a.published_at ?? '') > (best.published_at ?? '') ? a : best,
  );
  return { kind: 'announcement', title: latest.title, date: latest.published_at };
}

/**
 * Next upcoming event (starts_at strictly after nowIso), sorted ascending.
 * Returns null when no upcoming events exist.
 */
export function buildEventWidget(events: BuildingEvent[], nowIso: string): WidgetData | null {
  const upcoming = events.filter((e) => e.starts_at > nowIso);
  if (upcoming.length === 0) return null;
  const next = upcoming.reduce((a, b) => (a.starts_at <= b.starts_at ? a : b));
  return { kind: 'event', title: next.title, startsAt: next.starts_at };
}

/**
 * Count of currently open polls: published, not yet closed, within the
 * opens_at..closes_at window (null bounds mean open-ended).
 * Returns null when no active polls exist.
 */
export function buildPollWidget(polls: Poll[], nowIso: string): WidgetData | null {
  const active = polls.filter(
    (p) =>
      p.published_at !== null &&
      p.closed_at === null &&
      (p.opens_at === null || p.opens_at <= nowIso) &&
      (p.closes_at === null || p.closes_at > nowIso),
  );
  if (active.length === 0) return null;
  return { kind: 'polls', count: active.length, firstTitle: active[0].title };
}

/**
 * Count of the current resident's open (non-terminal) tickets.
 * Returns null when there are none.
 */
export function buildTicketWidget(tickets: Ticket[], userId: string): WidgetData | null {
  const open = tickets.filter(
    (t) => t.reporter_user_id === userId && !CLOSED_TICKET_STATUSES.includes(t.status),
  );
  if (open.length === 0) return null;
  return { kind: 'open_tickets', count: open.length };
}

/** Input bundles for the widget dispatcher below. */
export interface WidgetSources {
  announcements: Announcement[];
  events: BuildingEvent[];
  polls: Poll[];
  tickets: Ticket[];
  userId: string;
  nowIso: string;
}

/**
 * Return widget data for a given feature key, or null for features that do not
 * have a widget. Dispatches to the appropriate pure builder.
 */
export function widgetForFeature(key: FeatureKey, src: WidgetSources): WidgetData | null {
  switch (key) {
    case 'F01': return buildAnnouncementWidget(src.announcements);
    case 'F08': return buildEventWidget(src.events, src.nowIso);
    case 'F09': return buildPollWidget(src.polls, src.nowIso);
    case 'F17': return buildTicketWidget(src.tickets, src.userId);
    default: return null;
  }
}
