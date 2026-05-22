import { describe, expect, it } from 'vitest';
import {
  detectRecurring,
  maxSeverity,
  suggestAction,
  ticketLocationLabel,
  RECURRING_MIN_COUNT,
} from '@/features/recurring/recurringLogic';
import type { Ticket, TicketSeverity } from '@/shared/types/domain';

const NOW = new Date('2026-05-22T12:00:00Z');

let seq = 0;
function ticket(
  category: string,
  location: string,
  daysAgo: number,
  severity: TicketSeverity = 'low',
): Ticket {
  seq += 1;
  const created = new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();
  return {
    id: `t-${seq}`,
    asociatie_id: 'a',
    reporter_user_id: 'u',
    apartment_id: null,
    title: `${category} ${location}`,
    description: '',
    category,
    severity,
    location_scara: null,
    location_etaj: null,
    location_description: location,
    status: 'primit',
    assigned_to_user_id: null,
    sla_due_at: null,
    resolved_at: null,
    verified_at: null,
    resolution_notes: null,
    rating: null,
    created_at: created,
    updated_at: created,
  };
}

describe('ticketLocationLabel', () => {
  it('prefers the free-text description', () => {
    expect(ticketLocationLabel(ticket('lift', 'Lift, scara A', 1))).toBe('Lift, scara A');
  });

  it('composes scara/etaj when no description, else falls back', () => {
    const base = ticket('apa', '', 1);
    expect(ticketLocationLabel({ ...base, location_description: null, location_scara: 'B', location_etaj: 3 }))
      .toBe('Scara B, etaj 3');
    expect(ticketLocationLabel({ ...base, location_description: null, location_scara: null, location_etaj: null }))
      .toBe('Nespecificat');
  });
});

describe('maxSeverity', () => {
  it('returns the highest-ranked severity in the set', () => {
    expect(maxSeverity([ticket('x', 'l', 1, 'low'), ticket('x', 'l', 1, 'high'), ticket('x', 'l', 1, 'medium')]))
      .toBe('high');
  });
});

describe('suggestAction', () => {
  it('suggests structural for high severity or 4+ occurrences', () => {
    expect(suggestAction(3, 'high')).toBe('structural');
    expect(suggestAction(4, 'low')).toBe('structural');
  });

  it('suggests maintenance for low-severity, low-count patterns', () => {
    expect(suggestAction(3, 'low')).toBe('maintenance');
    expect(suggestAction(3, 'medium')).toBe('maintenance');
  });
});

describe('detectRecurring', () => {
  it('groups same category+location and keeps those at/above the threshold', () => {
    const tickets = [
      ticket('lift', 'Lift, scara A', 80, 'high'),
      ticket('lift', 'Lift, scara A', 40, 'medium'),
      ticket('lift', 'Lift, scara A', 5, 'high'),
      ticket('apa', 'Garaj subsol', 2, 'high'), // single, not recurring
    ];
    const issues = detectRecurring(tickets, NOW);
    expect(issues).toHaveLength(1);
    expect(issues[0].count).toBe(3);
    expect(issues[0].category).toBe('lift');
    expect(issues[0].suggestion).toBe('structural');
  });

  it('matches accent- and case-insensitively on category and location', () => {
    const tickets = [
      ticket('Iluminat', 'Casa scării, scara B', 30),
      ticket('iluminat', 'casa scarii, scara b', 20),
      ticket('ILUMINAT', 'CASA SCĂRII, SCARA B', 10),
    ];
    const issues = detectRecurring(tickets, NOW);
    expect(issues).toHaveLength(1);
    expect(issues[0].count).toBe(3);
  });

  it('ignores tickets outside the 90-day window', () => {
    const tickets = [
      ticket('lift', 'Lift, scara A', 200),
      ticket('lift', 'Lift, scara A', 150),
      ticket('lift', 'Lift, scara A', 5),
    ];
    const issues = detectRecurring(tickets, NOW);
    expect(issues).toHaveLength(0);
  });

  it('reports first/last occurrence chronologically', () => {
    const tickets = [
      ticket('iluminat', 'Scara B', 10, 'low'),
      ticket('iluminat', 'Scara B', 70, 'low'),
      ticket('iluminat', 'Scara B', 40, 'low'),
    ];
    const [issue] = detectRecurring(tickets, NOW);
    expect(new Date(issue.firstAt) < new Date(issue.lastAt)).toBe(true);
    expect(issue.suggestion).toBe('maintenance');
  });

  it('sorts most-frequent first, then most recent activity', () => {
    const tickets = [
      // 3x iluminat scara C
      ticket('iluminat', 'Scara C', 30),
      ticket('iluminat', 'Scara C', 20),
      ticket('iluminat', 'Scara C', 60),
      // 4x lift scara A
      ticket('lift', 'Lift, scara A', 70),
      ticket('lift', 'Lift, scara A', 50),
      ticket('lift', 'Lift, scara A', 30),
      ticket('lift', 'Lift, scara A', 3),
    ];
    const issues = detectRecurring(tickets, NOW);
    expect(issues.map((i) => i.count)).toEqual([4, 3]);
  });

  it('requires at least the documented minimum count', () => {
    const tickets = Array.from({ length: RECURRING_MIN_COUNT - 1 }, () =>
      ticket('lift', 'Lift, scara A', 10),
    );
    expect(detectRecurring(tickets, NOW)).toHaveLength(0);
  });
});
