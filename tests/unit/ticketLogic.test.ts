import { describe, expect, it } from 'vitest';
import { slaDueAt, isSlaBreached, SLA_HOURS } from '@/features/tickets/ticketLogic';

describe('ticket SLA', () => {
  it('computes due dates from severity', () => {
    const created = new Date('2026-05-21T10:00:00Z');
    const due = slaDueAt('critical', created);
    expect(due.getTime() - created.getTime()).toBe(SLA_HOURS.critical * 3600_000);
  });

  it('flags breached SLAs only when still open', () => {
    const past = new Date(Date.now() - 3600_000).toISOString();
    const future = new Date(Date.now() + 3600_000).toISOString();
    expect(isSlaBreached(past, null)).toBe(true);
    expect(isSlaBreached(future, null)).toBe(false);
    expect(isSlaBreached(past, new Date().toISOString())).toBe(false);
    expect(isSlaBreached(null, null)).toBe(false);
  });
});
