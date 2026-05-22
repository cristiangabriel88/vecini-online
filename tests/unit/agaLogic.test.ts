import { describe, expect, it } from 'vitest';
import {
  generateProcesVerbal,
  isQuorumMet,
  isValidAgendaItem,
  isValidMeeting,
  itemOutcome,
  itemPercentages,
  itemTally,
  nextStatus,
  presentApartments,
  quorumPercent,
  sortMeetings,
} from '@/features/aga/agaLogic';
import type { AgaAgendaItem, AgaMeeting } from '@/shared/types/domain';

const item = (over: Partial<AgaAgendaItem> = {}): AgaAgendaItem => ({
  id: 'agi-1',
  aga_id: 'aga-1',
  sort_order: 1,
  title: 'Punct',
  description: '',
  majority_rule: 'simple',
  votes: { pentru: 0, contra: 0, abtinere: 0 },
  my_vote: null,
  ...over,
});

const meeting = (over: Partial<AgaMeeting> = {}): AgaMeeting => ({
  id: 'aga-1',
  asociatie_id: 'a',
  title: 'AGA test',
  scheduled_at: '2026-05-01T18:00:00',
  location: 'Sala A',
  scheduled_online: false,
  required_quorum_percent: 50,
  status: 'in_desfasurare',
  total_apartments: 40,
  represented_apartments: 19,
  my_rsvp: null,
  agenda: [],
  ...over,
});

describe('isValidMeeting', () => {
  it('requires a title and a parseable date', () => {
    expect(isValidMeeting('AGA 2026', '2026-05-01T18:00')).toBe(true);
    expect(isValidMeeting(' ', '2026-05-01T18:00')).toBe(false);
    expect(isValidMeeting('AGA 2026', 'not-a-date')).toBe(false);
  });
});

describe('isValidAgendaItem', () => {
  it('requires a title', () => {
    expect(isValidAgendaItem('Buget')).toBe(true);
    expect(isValidAgendaItem('  ')).toBe(false);
  });
});

describe('presentApartments', () => {
  it('counts the current apartment only when present or by proxy', () => {
    expect(presentApartments(meeting({ my_rsvp: null }))).toBe(19);
    expect(presentApartments(meeting({ my_rsvp: 'prezent' }))).toBe(20);
    expect(presentApartments(meeting({ my_rsvp: 'procura' }))).toBe(20);
    expect(presentApartments(meeting({ my_rsvp: 'absent' }))).toBe(19);
  });
});

describe('quorum', () => {
  it('computes the represented percent', () => {
    expect(quorumPercent(meeting({ represented_apartments: 20, my_rsvp: null }))).toBe(50);
    expect(quorumPercent(meeting({ total_apartments: 0 }))).toBe(0);
  });

  it('checks against the required threshold', () => {
    expect(isQuorumMet(meeting({ represented_apartments: 20, my_rsvp: null }))).toBe(true);
    expect(isQuorumMet(meeting({ represented_apartments: 19, my_rsvp: null }))).toBe(false);
    expect(isQuorumMet(meeting({ represented_apartments: 19, my_rsvp: 'prezent' }))).toBe(true);
  });
});

describe('itemTally', () => {
  it('folds the current apartment vote into the counts', () => {
    const t = itemTally(item({ votes: { pentru: 10, contra: 4, abtinere: 2 }, my_vote: 'pentru' }));
    expect(t).toEqual({ pentru: 11, contra: 4, abtinere: 2, total: 17 });
  });
});

describe('itemPercentages', () => {
  it('returns whole-number percents of votes cast and zero when none', () => {
    expect(itemPercentages(item({ votes: { pentru: 3, contra: 1, abtinere: 0 } }))).toEqual({
      pentru: 75,
      contra: 25,
      abtinere: 0,
    });
    expect(itemPercentages(item())).toEqual({ pentru: 0, contra: 0, abtinere: 0 });
  });
});

describe('itemOutcome', () => {
  const quorate = meeting({ represented_apartments: 25, my_rsvp: null });

  it('is pending while no votes are cast', () => {
    expect(itemOutcome(item(), quorate)).toBe('in_asteptare');
  });

  it('is rejected without quorum even if support is high', () => {
    const noQuorum = meeting({ represented_apartments: 5, my_rsvp: null });
    expect(itemOutcome(item({ votes: { pentru: 5, contra: 0, abtinere: 0 } }), noQuorum)).toBe('respins');
  });

  it('applies simple majority', () => {
    expect(itemOutcome(item({ votes: { pentru: 6, contra: 5, abtinere: 0 } }), quorate)).toBe('adoptat');
    expect(itemOutcome(item({ votes: { pentru: 5, contra: 6, abtinere: 0 } }), quorate)).toBe('respins');
  });

  it('applies absolute majority against total apartments', () => {
    const abs = item({ majority_rule: 'absolute', votes: { pentru: 21, contra: 0, abtinere: 0 } });
    expect(itemOutcome(abs, quorate)).toBe('adoptat'); // 21 > 40/2
    const absFail = item({ majority_rule: 'absolute', votes: { pentru: 20, contra: 0, abtinere: 0 } });
    expect(itemOutcome(absFail, quorate)).toBe('respins'); // 20 is not > 20
  });

  it('applies a two-thirds qualified majority of votes cast', () => {
    const ok = item({ majority_rule: 'qualified_2_3', votes: { pentru: 8, contra: 2, abtinere: 2 } });
    expect(itemOutcome(ok, quorate)).toBe('adoptat'); // 8 >= 2/3*12
    const fail = item({ majority_rule: 'qualified_2_3', votes: { pentru: 7, contra: 3, abtinere: 2 } });
    expect(itemOutcome(fail, quorate)).toBe('respins');
  });
});

describe('sortMeetings', () => {
  it('orders in-progress, then upcoming soonest, then concluded most-recent', () => {
    const list: AgaMeeting[] = [
      meeting({ id: 'past', status: 'incheiata', scheduled_at: '2025-01-01T18:00:00' }),
      meeting({ id: 'soon', status: 'convocata', scheduled_at: '2026-06-01T18:00:00' }),
      meeting({ id: 'live', status: 'in_desfasurare', scheduled_at: '2026-05-01T18:00:00' }),
      meeting({ id: 'later', status: 'convocata', scheduled_at: '2026-07-01T18:00:00' }),
    ];
    expect(sortMeetings(list).map((m) => m.id)).toEqual(['live', 'soon', 'later', 'past']);
  });
});

describe('nextStatus', () => {
  it('walks the lifecycle and stops when concluded', () => {
    expect(nextStatus('convocata')).toBe('in_desfasurare');
    expect(nextStatus('in_desfasurare')).toBe('incheiata');
    expect(nextStatus('incheiata')).toBeNull();
  });
});

describe('generateProcesVerbal', () => {
  it('produces minutes carrying the title, items, quorum and decisions', () => {
    const m = meeting({
      status: 'incheiata',
      represented_apartments: 25,
      my_rsvp: null,
      agenda: [
        item({ id: 'a', sort_order: 1, title: 'Aprobare buget', votes: { pentru: 20, contra: 4, abtinere: 1 } }),
        item({
          id: 'b',
          sort_order: 2,
          title: 'Credit reabilitare',
          majority_rule: 'qualified_2_3',
          votes: { pentru: 5, contra: 18, abtinere: 2 },
        }),
      ],
    });
    const pv = generateProcesVerbal(m);
    expect(pv).toContain('PROCES-VERBAL');
    expect(pv).toContain('AGA test');
    expect(pv).toContain('Aprobare buget');
    expect(pv).toContain('Credit reabilitare');
    expect(pv).toContain('Cvorum: întrunit');
    expect(pv).toContain('ADOPTAT');
    expect(pv).toContain('RESPINS');
    expect(pv).toContain('Legii 196/2018');
  });
});
