import { describe, expect, it } from 'vitest';
import {
  apartmentShortLabel,
  cotaPartePercent,
  isOpenTicket,
  metersForApartment,
  optionLabel,
  ticketSummary,
  ticketsForApartment,
  votesCastCount,
  votesForApartment,
} from '@/features/apartment/apartmentLogic';
import type {
  Apartment,
  Meter,
  MeterReading,
  Poll,
  PollOption,
  Ticket,
  TicketStatus,
} from '@/shared/types/domain';

const apt: Apartment = {
  id: 'ap-2',
  asociatie_id: 'a',
  scara: 'A',
  etaj: 1,
  numar_apartament: '5',
  suprafata_utila: 63.8,
  cota_parte_indiviza: 0.048,
  numar_persoane: 3,
  persons: [],
  proprietar_principal_name: 'Popescu Andrei',
  is_active: true,
  notes: null,
  created_at: '',
  updated_at: '',
};

function meter(id: string, apartmentId: string): Meter {
  return { id, asociatie_id: 'a', apartment_id: apartmentId, kind: 'apa_rece', serial: `S-${id}`, last_value: 0 };
}

function reading(id: string, meterId: string, date: string, value: number): MeterReading {
  return {
    id,
    asociatie_id: 'a',
    meter_id: meterId,
    value,
    photo_path: null,
    submitted_by: 'u',
    reading_date: date,
    created_at: `${date}T09:00:00Z`,
  };
}

function ticket(id: string, opts: Partial<Ticket> & { status: TicketStatus }): Ticket {
  return {
    id,
    asociatie_id: 'a',
    reporter_user_id: opts.reporter_user_id ?? 'u-res',
    apartment_id: opts.apartment_id ?? null,
    title: opts.title ?? `Ticket ${id}`,
    description: '',
    category: 'general',
    severity: 'low',
    location_scara: null,
    location_etaj: null,
    location_description: null,
    status: opts.status,
    assigned_to_user_id: null,
    sla_due_at: null,
    resolved_at: null,
    verified_at: null,
    resolution_notes: null,
    rating: null,
    created_at: opts.created_at ?? '2026-05-01T09:00:00Z',
    updated_at: '2026-05-01T09:00:00Z',
  };
}

describe('apartmentShortLabel / cotaPartePercent', () => {
  it('renders a short apartment label', () => {
    expect(apartmentShortLabel(apt)).toBe('Ap. 5');
  });

  it('formats cota-parte as a Romanian percent and tolerates null', () => {
    expect(cotaPartePercent(0.048)).toBe('4,8%');
    expect(cotaPartePercent(null)).toBeNull();
  });
});

describe('metersForApartment', () => {
  it('keeps only this apartment meters and orders readings newest-first', () => {
    const meters = [meter('m1', 'ap-2'), meter('m2', 'ap-9')];
    const readings = [
      reading('r1', 'm1', '2026-03-03', 300),
      reading('r2', 'm1', '2026-04-03', 312),
      reading('r3', 'm2', '2026-04-03', 99),
    ];
    const summaries = metersForApartment(meters, readings, 'ap-2');
    expect(summaries).toHaveLength(1);
    expect(summaries[0].meter.id).toBe('m1');
    expect(summaries[0].latest?.value).toBe(312);
    expect(summaries[0].history.map((r) => r.id)).toEqual(['r2', 'r1']);
  });

  it('reports a null latest when a meter has no readings', () => {
    const summaries = metersForApartment([meter('m1', 'ap-2')], [], 'ap-2');
    expect(summaries[0].latest).toBeNull();
  });
});

describe('ticketsForApartment / ticketSummary', () => {
  const tickets = [
    ticket('t1', { status: 'in_lucru', reporter_user_id: 'u-res', apartment_id: 'ap-3', created_at: '2026-05-19T00:00:00Z' }),
    ticket('t2', { status: 'rezolvat', reporter_user_id: 'u-other', apartment_id: 'ap-2', created_at: '2026-05-20T00:00:00Z' }),
    ticket('t3', { status: 'primit', reporter_user_id: 'u-other', apartment_id: 'ap-9', created_at: '2026-05-21T00:00:00Z' }),
  ];

  it('matches tickets by reporter or apartment, newest first, de-duplicated', () => {
    const mine = ticketsForApartment(tickets, 'ap-2', 'u-res');
    expect(mine.map((t) => t.id)).toEqual(['t2', 't1']);
  });

  it('summarises open vs resolved', () => {
    const mine = ticketsForApartment(tickets, 'ap-2', 'u-res');
    expect(ticketSummary(mine)).toEqual({ open: 1, resolved: 1, total: 2 });
  });

  it('classifies open statuses', () => {
    expect(isOpenTicket(ticket('x', { status: 'primit' }))).toBe(true);
    expect(isOpenTicket(ticket('x', { status: 'verificat' }))).toBe(false);
  });
});

describe('votesForApartment / votesCastCount / optionLabel', () => {
  const polls: Poll[] = [
    { id: 'poll-1', asociatie_id: 'a', author_user_id: 'u', title: 'P1', description: null, poll_type: 'yes_no', weighted: false, quorum_percent: 50, majority_rule: 'simple', opens_at: null, closes_at: null, audience: { type: 'all' }, created_at: '', published_at: null, closed_at: null },
    { id: 'poll-2', asociatie_id: 'a', author_user_id: 'u', title: 'P2', description: null, poll_type: 'yes_no', weighted: false, quorum_percent: 50, majority_rule: 'simple', opens_at: null, closes_at: null, audience: { type: 'all' }, created_at: '', published_at: null, closed_at: null },
  ];
  const options: PollOption[] = [
    { id: 'po-1', poll_id: 'poll-1', label: 'Pentru', sort_order: 0 },
    { id: 'po-2', poll_id: 'poll-1', label: 'Contra', sort_order: 1 },
  ];

  it('marks each poll voted/unvoted from myVotes', () => {
    const summaries = votesForApartment(polls, { 'poll-1': 'po-1' });
    expect(summaries[0]).toMatchObject({ voted: true, optionId: 'po-1' });
    expect(summaries[1]).toMatchObject({ voted: false, optionId: null });
  });

  it('counts cast votes', () => {
    expect(votesCastCount(polls, { 'poll-1': 'po-1' })).toBe(1);
    expect(votesCastCount(polls, {})).toBe(0);
  });

  it('resolves an option label and tolerates null / missing', () => {
    expect(optionLabel(options, 'po-1')).toBe('Pentru');
    expect(optionLabel(options, null)).toBeNull();
    expect(optionLabel(options, 'po-x')).toBeNull();
  });
});
