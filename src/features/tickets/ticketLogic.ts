import type { TicketSeverity } from '@/shared/types/domain';

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
