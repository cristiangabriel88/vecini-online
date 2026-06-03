import type { VisitorReport, VisitorStatus } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_VISITOR_REPORTS } from '@/shared/demo/demoData';

/** Minimum note length for a useful visitor report. */
export const MIN_NOTE_LENGTH = 5;

/** A report needs a non-trivial note. */
export function isValidReport(note: string): boolean {
  return note.trim().length >= MIN_NOTE_LENGTH;
}

/** The status cycle a comitet member steps a report through. */
export const VISITOR_STATUSES: VisitorStatus[] = ['nou', 'cunoscut', 'rezolvat'];

/** Next status when the comitet taps the status button (cycles back to start). */
export function nextStatus(status: VisitorStatus): VisitorStatus {
  const i = VISITOR_STATUSES.indexOf(status);
  return VISITOR_STATUSES[(i + 1) % VISITOR_STATUSES.length];
}

/** Reports newest-first, with open ("nou") reports always above resolved ones. */
export function recentReports(reports: VisitorReport[]): VisitorReport[] {
  return [...reports].sort((a, b) => {
    const aOpen = a.status === 'nou' ? 0 : 1;
    const bOpen = b.status === 'nou' ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

// ── Per-asociatie visitor report catalog ─────────────────────────────────────

export type VisitorsByAsociatie = Record<string, VisitorReport[]>;

const EMPTY_VISITORS: VisitorReport[] = [];

export function visitorsForAsociatie(map: VisitorsByAsociatie, asociatieId: string | null): VisitorReport[] {
  if (!asociatieId) return EMPTY_VISITORS;
  return map[asociatieId] ?? EMPTY_VISITORS;
}

export function seedVisitors(): VisitorsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_VISITOR_REPORTS] };
}

export function addVisitorIn(map: VisitorsByAsociatie, asociatieId: string, report: VisitorReport): VisitorsByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [report, ...current] };
}

export function cycleStatusIn(map: VisitorsByAsociatie, asociatieId: string, id: string): VisitorsByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: current.map((r) => (r.id === id ? { ...r, status: nextStatus(r.status) } : r)) };
}

export function migrateVisitorsState(persisted: unknown): VisitorsByAsociatie {
  const p = persisted as { byAsociatie?: VisitorsByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_VISITOR_REPORTS] };
}
