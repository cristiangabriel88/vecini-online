import type { Role, Ticket, TicketSeverity, TicketStatus } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_TICKETS } from '@/shared/demo/demoData';
import { type FileValidationError, validateFile } from '@/shared/lib/file';
import { genId } from '@/shared/lib/id';

export const TICKET_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const TICKET_ATTACHMENT_MAX_FILES = 5;
export const TICKET_ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf';
export const TICKET_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

/** Validate a candidate ticket attachment; returns null when acceptable. */
export function validateTicketFile(file: { size: number; type: string }): FileValidationError | null {
  return validateFile(file, TICKET_ATTACHMENT_MAX_BYTES, TICKET_ATTACHMENT_TYPES);
}

/** SLA response window per severity, in hours. */
export const SLA_HOURS: Record<TicketSeverity, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
};

/** Compute the SLA due timestamp for a ticket created at `createdAt`. */
export function slaDueAt(severity: TicketSeverity, createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + SLA_HOURS[severity] * 3600_000);
}

/** Whether a ticket is past its SLA due date and still open. */
export function isSlaBreached(dueAt: string | null, resolvedAt: string | null): boolean {
  if (!dueAt || resolvedAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

/**
 * Sesizări / reclamații (F17) scoped per asociație (T49).
 *
 * Pure model so the demo store stays the offline source of truth and the loop
 * (a resident submits a sesizare, then sees its status) works fully offline.
 * Each asociație owns its own tickets, keyed by asociație id, so a submitted
 * sesizare belongs to the active tenant and never leaks across asociații. With a
 * real backend the list is hydrated from / written back to `tickets` under RLS
 * (live activation is T57); this module stays the single source of the shape and
 * the per-asociație partitioning.
 */

/** All asociații's tickets, keyed by asociație id. */
export type TicketsByAsociatie = Record<string, Ticket[]>;

/**
 * Stable empty list returned for an unknown or null asociație so React selectors
 * keep a constant reference (a fresh `[]` per call would force needless
 * re-renders). Never mutate it; the helpers always build a new array.
 */
const EMPTY_TICKETS = Object.freeze([] as Ticket[]) as Ticket[];

/**
 * Seed used the first time the store initialises (before any persisted state):
 * the demo asociație gets the seeded tickets so the offline app is populated.
 * Other asociații start empty until a resident submits a sesizare.
 */
export function seedTickets(): TicketsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_TICKETS] };
}

/**
 * Migrate persisted state from any earlier version to the current shape.
 * Preserves non-demo asociații so a locally-created asociație keeps its
 * submitted tickets, but always reseeds the demo asociație from
 * `DEMO_TICKETS` so stale demo content is refreshed on version bump.
 */
export function migrateTicketsState(persisted: unknown): TicketsByAsociatie {
  const state = persisted as { byAsociatie?: unknown } | null;
  const old = state?.byAsociatie;
  if (old && typeof old === 'object') {
    return { ...(old as TicketsByAsociatie), [DEMO_ASOCIATIE.id]: [...DEMO_TICKETS] };
  }
  return seedTickets();
}

/**
 * The tickets for one asociație. Returns the stored list (a stable reference) or
 * a shared frozen empty list when the asociație has none yet or none is active.
 */
export function ticketsForAsociatie(
  byAsociatie: TicketsByAsociatie,
  asociatieId: string | null,
): Ticket[] {
  if (!asociatieId) return EMPTY_TICKETS;
  return byAsociatie[asociatieId] ?? EMPTY_TICKETS;
}

/**
 * The tickets across several asociații (a resident's memberships), unioned in
 * the order the ids are given and deduping repeated ids. Used by the GDPR export
 * (T77) so a multi-asociație resident's access right (art. 15) spans every
 * asociație they belong to, not just the active one. Returns a fresh array; the
 * caller filters it to the subject's own rows.
 */
export function ticketsForAsociatii(
  byAsociatie: TicketsByAsociatie,
  asociatieIds: string[],
): Ticket[] {
  const seen = new Set<string>();
  const out: Ticket[] = [];
  for (const id of asociatieIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const list = byAsociatie[id];
    if (list) out.push(...list);
  }
  return out;
}

/** The fields a resident supplies to submit a sesizare; the rest is derived. */
export interface NewTicketInput {
  title: string;
  description: string;
  category: string;
  severity: TicketSeverity;
  location: string;
}

/**
 * Build a freshly-submitted ticket owned by `asociatieId` and reported by the
 * given user. Starts at `primit` with its SLA due date derived from severity.
 */
export function newTicket(
  input: NewTicketInput,
  asociatieId: string,
  reporterUserId: string,
  now: Date = new Date(),
): Ticket {
  const iso = now.toISOString();
  return {
    id: genId(),
    asociatie_id: asociatieId,
    reporter_user_id: reporterUserId,
    apartment_id: null,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    severity: input.severity,
    location_scara: null,
    location_etaj: null,
    location_description: input.location.trim() || null,
    status: 'primit',
    assigned_to_user_id: null,
    sla_due_at: slaDueAt(input.severity, now).toISOString(),
    resolved_at: null,
    verified_at: null,
    resolution_notes: null,
    rating: null,
    created_at: iso,
    updated_at: iso,
  };
}

/** Roles that can manage ticket lifecycle: assign, advance, resolve, reject. */
const MANAGER_ROLES: readonly Role[] = ['admin', 'presedinte', 'comitet'];

/** Allowed next statuses from each status in the F17 lifecycle. */
export const STATUS_TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  primit: ['asignat'],
  asignat: ['in_lucru'],
  in_lucru: ['rezolvat'],
  rezolvat: ['verificat', 'respins'],
  verificat: ['inchis'],
  inchis: [],
  respins: [],
};

/**
 * The next statuses a manager role can transition a ticket to.
 * Returns an empty array for non-manager roles or terminal statuses.
 */
export function allowedTransitions(status: TicketStatus, role: Role | null): TicketStatus[] {
  if (!role || !(MANAGER_ROLES as readonly string[]).includes(role)) return [];
  return [...STATUS_TRANSITIONS[status]];
}

/** Whether `userId` can rate this ticket right now: reporter, after resolution, no prior rating. */
export function canRateTicket(ticket: Ticket, userId: string): boolean {
  return (
    ticket.reporter_user_id === userId &&
    (ticket.status === 'rezolvat' || ticket.status === 'verificat') &&
    ticket.rating === null
  );
}

/**
 * Apply a status transition, returning a new immutable ticket.
 * Sets `assigned_to_user_id` when advancing to `asignat`, stamps `resolved_at`
 * when advancing to `rezolvat`, and `verified_at` when advancing to `verificat`.
 */
export function applyStatusTransition(
  ticket: Ticket,
  newStatus: TicketStatus,
  actorUserId: string,
  resolutionNotes: string | null = null,
  now: Date = new Date(),
): Ticket {
  const iso = now.toISOString();
  return {
    ...ticket,
    status: newStatus,
    assigned_to_user_id:
      newStatus === 'asignat' ? actorUserId : ticket.assigned_to_user_id,
    resolved_at: newStatus === 'rezolvat' ? iso : ticket.resolved_at,
    verified_at: newStatus === 'verificat' ? iso : ticket.verified_at,
    resolution_notes:
      resolutionNotes !== null ? resolutionNotes : ticket.resolution_notes,
    updated_at: iso,
  };
}

/** Apply a 1-5 rating to a resolved/verified ticket, returning a new immutable ticket. */
export function applyRating(ticket: Ticket, rating: number, now: Date = new Date()): Ticket {
  return { ...ticket, rating, updated_at: now.toISOString() };
}

/**
 * Update a single ticket by id inside one asociație, returning a new `byAsociatie` map.
 * Returns the input unchanged (referentially stable) when the ticket or asociație is not found.
 */
export function updateTicketIn(
  byAsociatie: TicketsByAsociatie,
  asociatieId: string,
  ticketId: string,
  updater: (t: Ticket) => Ticket,
): TicketsByAsociatie {
  const list = byAsociatie[asociatieId];
  if (!list) return byAsociatie;
  const idx = list.findIndex((t) => t.id === ticketId);
  if (idx === -1) return byAsociatie;
  const next = [...list];
  next[idx] = updater(list[idx]);
  return { ...byAsociatie, [asociatieId]: next };
}

/**
 * Prepend a ticket to one asociație's list (newest first), returning a new
 * `byAsociatie` map without mutating the input.
 */
export function addTicketIn(
  byAsociatie: TicketsByAsociatie,
  asociatieId: string,
  ticket: Ticket,
): TicketsByAsociatie {
  return {
    ...byAsociatie,
    [asociatieId]: [ticket, ...(byAsociatie[asociatieId] ?? [])],
  };
}
