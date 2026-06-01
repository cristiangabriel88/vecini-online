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
  allowedTransitions,
  applyStatusTransition,
  applyRating,
  canRateTicket,
  updateTicketIn,
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

describe('status-lifecycle helpers (T67)', () => {
  const INPUT: NewTicketInput = {
    title: 'Test',
    description: 'Desc',
    category: 'electric',
    severity: 'medium',
    location: '',
  };
  const BASE = newTicket(INPUT, 'asoc-x', 'u-reporter', new Date('2026-05-01T10:00:00Z'));

  describe('allowedTransitions', () => {
    it('returns the correct next statuses for manager roles', () => {
      expect(allowedTransitions('primit', 'admin')).toEqual(['asignat']);
      expect(allowedTransitions('asignat', 'comitet')).toEqual(['in_lucru']);
      expect(allowedTransitions('in_lucru', 'presedinte')).toEqual(['rezolvat']);
      expect(allowedTransitions('rezolvat', 'admin')).toEqual(['verificat', 'respins']);
      expect(allowedTransitions('verificat', 'admin')).toEqual(['inchis']);
      expect(allowedTransitions('inchis', 'admin')).toEqual([]);
      expect(allowedTransitions('respins', 'admin')).toEqual([]);
    });

    it('returns empty for non-manager roles', () => {
      expect(allowedTransitions('primit', 'proprietar')).toEqual([]);
      expect(allowedTransitions('primit', 'chirias')).toEqual([]);
      expect(allowedTransitions('primit', 'cenzor')).toEqual([]);
      expect(allowedTransitions('primit', null)).toEqual([]);
    });
  });

  describe('applyStatusTransition', () => {
    it('advances to asignat and sets assigned_to_user_id', () => {
      const now = new Date('2026-05-02T09:00:00Z');
      const next = applyStatusTransition(BASE, 'asignat', 'u-admin', null, now);
      expect(next.status).toBe('asignat');
      expect(next.assigned_to_user_id).toBe('u-admin');
      expect(next.resolved_at).toBeNull();
      expect(next.verified_at).toBeNull();
      expect(next.updated_at).toBe(now.toISOString());
    });

    it('stamps resolved_at when transitioning to rezolvat', () => {
      const inLucru = { ...BASE, status: 'in_lucru' as const };
      const now = new Date('2026-05-03T12:00:00Z');
      const next = applyStatusTransition(inLucru, 'rezolvat', 'u-admin', 'Fixed the wiring.', now);
      expect(next.status).toBe('rezolvat');
      expect(next.resolved_at).toBe(now.toISOString());
      expect(next.resolution_notes).toBe('Fixed the wiring.');
      expect(next.verified_at).toBeNull();
    });

    it('stamps verified_at when transitioning to verificat', () => {
      const resolved = {
        ...BASE,
        status: 'rezolvat' as const,
        resolved_at: '2026-05-03T12:00:00Z',
      };
      const now = new Date('2026-05-04T08:00:00Z');
      const next = applyStatusTransition(resolved, 'verificat', 'u-admin', null, now);
      expect(next.status).toBe('verificat');
      expect(next.verified_at).toBe(now.toISOString());
      expect(next.resolved_at).toBe('2026-05-03T12:00:00Z');
    });

    it('does not overwrite existing notes when resolutionNotes is null', () => {
      const withNotes = { ...BASE, resolution_notes: 'Original note' };
      const next = applyStatusTransition(withNotes, 'asignat', 'u-admin', null);
      expect(next.resolution_notes).toBe('Original note');
    });

    it('is pure and does not mutate the original ticket', () => {
      const snapshot = JSON.parse(JSON.stringify(BASE)) as typeof BASE;
      applyStatusTransition(BASE, 'asignat', 'u-admin');
      expect(BASE).toEqual(snapshot);
    });
  });

  describe('canRateTicket', () => {
    it('allows rating only for reporter on rezolvat/verificat with no rating yet', () => {
      const resolved = { ...BASE, status: 'rezolvat' as const };
      expect(canRateTicket(resolved, 'u-reporter')).toBe(true);
      const verified = { ...BASE, status: 'verificat' as const };
      expect(canRateTicket(verified, 'u-reporter')).toBe(true);
    });

    it('denies rating for non-reporter', () => {
      const resolved = { ...BASE, status: 'rezolvat' as const };
      expect(canRateTicket(resolved, 'u-other')).toBe(false);
    });

    it('denies rating when ticket is not resolved/verified', () => {
      expect(canRateTicket(BASE, 'u-reporter')).toBe(false);
      const inLucru = { ...BASE, status: 'in_lucru' as const };
      expect(canRateTicket(inLucru, 'u-reporter')).toBe(false);
    });

    it('denies rating when already rated', () => {
      const rated = { ...BASE, status: 'rezolvat' as const, rating: 4 };
      expect(canRateTicket(rated, 'u-reporter')).toBe(false);
    });
  });

  describe('applyRating', () => {
    it('sets the rating and updates updated_at', () => {
      const resolved = { ...BASE, status: 'rezolvat' as const };
      const now = new Date('2026-05-05T10:00:00Z');
      const rated = applyRating(resolved, 5, now);
      expect(rated.rating).toBe(5);
      expect(rated.updated_at).toBe(now.toISOString());
    });

    it('is pure and does not mutate the original', () => {
      const resolved = { ...BASE, status: 'rezolvat' as const };
      const snapshot = JSON.parse(JSON.stringify(resolved)) as typeof resolved;
      applyRating(resolved, 3);
      expect(resolved).toEqual(snapshot);
    });
  });

  describe('updateTicketIn', () => {
    it('applies the updater to the matching ticket without mutating the map', () => {
      const seeded = seedTickets();
      const snapshot = JSON.parse(JSON.stringify(seeded));
      const [first] = seeded[DEMO_ASOCIATIE.id];
      const updated = updateTicketIn(seeded, DEMO_ASOCIATIE.id, first.id, (tk) => ({
        ...tk,
        status: 'asignat' as const,
      }));
      expect(updated).not.toBe(seeded);
      expect(seeded).toEqual(snapshot);
      expect(updated[DEMO_ASOCIATIE.id][0].status).toBe('asignat');
    });

    it('returns the same map reference when the asociație is not found', () => {
      const seeded = seedTickets();
      const result = updateTicketIn(seeded, 'unknown-asoc', 'any-id', (tk) => tk);
      expect(result).toBe(seeded);
    });

    it('returns the same map reference when the ticket id is not found', () => {
      const seeded = seedTickets();
      const result = updateTicketIn(seeded, DEMO_ASOCIATIE.id, 'no-such-ticket', (tk) => tk);
      expect(result).toBe(seeded);
    });
  });
});
