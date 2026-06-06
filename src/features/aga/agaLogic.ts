import type { AgaMeeting } from '@/shared/types/domain';
import { DEMO_AGAS, DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

/**
 * F10 -- digital General Assembly (AGA) model, per Legea 196/2018.
 *
 * Pure logic so the demo store stays the offline source of truth and the full
 * lifecycle (convoke, RSVP / procura, vote, conclude, minutes) works offline.
 * Each asociație owns its own list of assemblies, keyed by asociație id, so a
 * convoked assembly belongs to the active tenant and never leaks across
 * asociații. With a real backend the list is hydrated from / written back to
 * `agas` / `aga_agenda_items` / `aga_attendees` / `aga_votes` under RLS (live
 * activation in `agaApi.ts`); this module stays the single source of the shape,
 * the per-asociație partitioning, the validation, the quorum / tally maths and
 * the procura (proxy-vote) folding.
 *
 * The proces-verbal generation and its pure tally helpers live in
 * `src/shared/lib/pvGenerator.ts` (no @/ aliases) so the Netlify PDF function
 * can import them without esbuild alias issues.
 */

// Re-export the shared computation helpers so existing imports of agaLogic
// continue to work after the extraction.
export {
  type ItemTally,
  type ItemOutcome,
  presentApartments,
  quorumPercent,
  isQuorumMet,
  itemTally,
  itemPercentages,
  itemOutcome,
  generateProcesVerbal,
} from '@/shared/lib/pvGenerator';

/** All asociații's assemblies, keyed by asociație id. */
export type AgasByAsociatie = Record<string, AgaMeeting[]>;

const EMPTY_AGAS = emptyArray<AgaMeeting>();

/** Deep-clone a meeting list so the seed is never mutated through the store. */
export function cloneAgas(meetings: AgaMeeting[]): AgaMeeting[] {
  return meetings.map((m) => ({
    ...m,
    agenda: m.agenda.map((a) => ({ ...a, votes: { ...a.votes } })),
    proxies: m.proxies.map((p) => ({ ...p, votes: { ...p.votes } })),
  }));
}

/**
 * Seed used the first time the store initialises: the demo asociație gets the
 * seeded assembly history so the offline app is populated. Other asociații start
 * empty until a comitet convokes one.
 */
export function seedAgas(): AgasByAsociatie {
  return { [DEMO_ASOCIATIE.id]: cloneAgas(DEMO_AGAS) };
}

/**
 * The assemblies for one asociație. Returns the stored list (a stable reference)
 * or a shared frozen empty list when the asociație has none yet or none is
 * active.
 */
export function agasForAsociatie(
  byAsociatie: AgasByAsociatie,
  asociatieId: string | null,
): AgaMeeting[] {
  if (!asociatieId) return EMPTY_AGAS;
  return byAsociatie[asociatieId] ?? EMPTY_AGAS;
}

/**
 * Migrate persisted state from any earlier version to the current shape.
 * Preserves non-demo asociații so a locally-created asociație keeps its
 * assemblies, but always reseeds the demo asociație from `DEMO_AGAS` so stale
 * demo content is refreshed on version bump.
 */
export function migrateAgasState(persisted: unknown): AgasByAsociatie {
  const state = persisted as { byAsociatie?: unknown } | null;
  const old = state?.byAsociatie;
  if (old && typeof old === 'object') {
    return { ...(old as AgasByAsociatie), [DEMO_ASOCIATIE.id]: cloneAgas(DEMO_AGAS) };
  }
  return seedAgas();
}

/** A meeting needs a title and a parseable scheduled date. */
export function isValidMeeting(title: string, scheduledAt: string): boolean {
  return title.trim().length > 0 && !Number.isNaN(Date.parse(scheduledAt));
}

/** An agenda item needs a title. */
export function isValidAgendaItem(title: string): boolean {
  return title.trim().length > 0;
}

/** A procura needs the granting apartment and the holder's name. */
export function isValidProxy(grantorApartment: string, proxyHolder: string): boolean {
  return grantorApartment.trim().length > 0 && proxyHolder.trim().length > 0;
}

const STATUS_RANK: Record<AgaMeeting['status'], number> = {
  in_desfasurare: 0,
  convocata: 1,
  incheiata: 2,
};

/** Meetings ordered for display: in-progress first, then upcoming soonest-first,
 *  then concluded most-recent-first. */
export function sortMeetings(meetings: AgaMeeting[]): AgaMeeting[] {
  return [...meetings].sort((a, b) => {
    if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) {
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    }
    const ta = Date.parse(a.scheduled_at);
    const tb = Date.parse(b.scheduled_at);
    return a.status === 'incheiata' ? tb - ta : ta - tb;
  });
}

/** The next status in the convocata -> in_desfasurare -> incheiata lifecycle,
 *  or null when already concluded. */
export function nextStatus(status: AgaMeeting['status']): AgaMeeting['status'] | null {
  if (status === 'convocata') return 'in_desfasurare';
  if (status === 'in_desfasurare') return 'incheiata';
  return null;
}
