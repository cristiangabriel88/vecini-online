import { describe, expect, it } from 'vitest';
import {
  slaDueAt,
  isSlaBreached,
  SLA_HOURS,
  seedTickets,
  ticketsForAsociatie,
  ticketsForAsociatii,
  newTicket,
  addTicketIn,
  type NewTicketInput,
} from '@/features/tickets/ticketLogic';
import { DEMO_ASOCIATIE, DEMO_TICKETS } from '@/shared/demo/demoData';

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

describe('tickets scoped per asociație (T49)', () => {
  const INPUT: NewTicketInput = {
    title: '  Lift blocat  ',
    description: '  Liftul s-a oprit între etaje.  ',
    category: 'lift',
    severity: 'high',
    location: '  Scara A  ',
  };

  it('seeds the demo asociație with the demo tickets', () => {
    const seeded = seedTickets();
    expect(seeded[DEMO_ASOCIATIE.id]).toHaveLength(DEMO_TICKETS.length);
    expect(seeded[DEMO_ASOCIATIE.id]).not.toBe(DEMO_TICKETS); // copied, not aliased
  });

  it('returns the stored list for a known asociație and a stable empty list otherwise', () => {
    const seeded = seedTickets();
    expect(ticketsForAsociatie(seeded, DEMO_ASOCIATIE.id)).toBe(seeded[DEMO_ASOCIATIE.id]);
    const a = ticketsForAsociatie(seeded, 'unknown-asoc');
    const b = ticketsForAsociatie(seeded, null);
    expect(a).toHaveLength(0);
    expect(a).toBe(b); // shared frozen empty reference
  });

  it('builds a freshly-submitted ticket trimmed, owned and SLA-dated from severity', () => {
    const now = new Date('2026-05-23T10:00:00Z');
    const tk = newTicket(INPUT, 'asoc-x', 'u-7', now);
    expect(tk.asociatie_id).toBe('asoc-x');
    expect(tk.reporter_user_id).toBe('u-7');
    expect(tk.title).toBe('Lift blocat');
    expect(tk.description).toBe('Liftul s-a oprit între etaje.');
    expect(tk.location_description).toBe('Scara A');
    expect(tk.status).toBe('primit');
    expect(tk.sla_due_at).toBe(slaDueAt('high', now).toISOString());
  });

  it('builds a ticket with a null location when none is supplied', () => {
    const tk = newTicket({ ...INPUT, location: '   ' }, 'asoc-x', 'u-7');
    expect(tk.location_description).toBeNull();
  });

  it('prepends newest-first into one asociație without mutating or leaking across tenants', () => {
    const before = seedTickets();
    const tk = newTicket(INPUT, DEMO_ASOCIATIE.id, 'u-7', new Date('2026-05-23T10:00:00Z'));
    const after = addTicketIn(before, DEMO_ASOCIATIE.id, tk);
    expect(after).not.toBe(before);
    expect(before[DEMO_ASOCIATIE.id]).toHaveLength(DEMO_TICKETS.length); // input untouched
    expect(after[DEMO_ASOCIATIE.id][0]).toBe(tk); // newest first
    expect(after['asoc-y']).toBeUndefined(); // no phantom asociație

    const fresh = addTicketIn({}, 'asoc-y', tk);
    expect(fresh['asoc-y']).toEqual([tk]);
  });

  it('unions tickets across several asociații (T77), in order, deduped, ignoring unknowns', () => {
    const now = new Date('2026-05-23T10:00:00Z');
    const byAsociatie = {
      a1: [{ ...newTicket(INPUT, 'a1', 'u-7', now), id: 'a1-1' }],
      a2: [{ ...newTicket(INPUT, 'a2', 'u-7', now), id: 'a2-1' }],
    };
    // Active first, dedupes a repeated id, ignores an asociație with no tickets.
    const out = ticketsForAsociatii(byAsociatie, ['a2', 'a1', 'a2', 'a3']);
    expect(out.map((t) => t.id)).toEqual(['a2-1', 'a1-1']);
    expect(ticketsForAsociatii(byAsociatie, [])).toEqual([]);
  });
});
