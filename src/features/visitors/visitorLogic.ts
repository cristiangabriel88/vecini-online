import type { VisitorReport, VisitorStatus } from '@/shared/types/domain';

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
