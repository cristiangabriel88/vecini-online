import { describe, expect, it } from 'vitest';
import {
  generateProcesVerbal,
  isQuorumMet,
  itemOutcome,
  itemPercentages,
  itemTally,
  presentApartments,
  quorumPercent,
} from '@/shared/lib/pvGenerator';
import type { AgaAgendaItem, AgaMeeting, AgaProxy } from '@/shared/types/domain';

const makeItem = (over: Partial<AgaAgendaItem> = {}): AgaAgendaItem => ({
  id: 'i1',
  aga_id: 'a1',
  sort_order: 1,
  title: 'Punct de ordine',
  description: '',
  majority_rule: 'simple',
  votes: { pentru: 0, contra: 0, abtinere: 0 },
  my_vote: null,
  ...over,
});

const makeMeeting = (over: Partial<AgaMeeting> = {}): AgaMeeting => ({
  id: 'aga-x',
  asociatie_id: 'asoc-x',
  title: 'AGA test',
  scheduled_at: '2026-05-01T18:00:00',
  location: 'Sala A',
  scheduled_online: false,
  required_quorum_percent: 50,
  status: 'incheiata',
  total_apartments: 40,
  represented_apartments: 20,
  my_rsvp: null,
  agenda: [],
  proxies: [],
  ...over,
});

const makeProxy = (over: Partial<AgaProxy> = {}): AgaProxy => ({
  id: 'p1',
  grantor_apartment: 'Ap. 5',
  proxy_holder: 'Ion Pop',
  document_name: null,
  document_url: null,
  votes: {},
  ...over,
});

describe('presentApartments', () => {
  it('includes present or proxy rsvp as +1, excludes absent', () => {
    expect(presentApartments(makeMeeting({ my_rsvp: null }))).toBe(20);
    expect(presentApartments(makeMeeting({ my_rsvp: 'prezent' }))).toBe(21);
    expect(presentApartments(makeMeeting({ my_rsvp: 'procura' }))).toBe(21);
    expect(presentApartments(makeMeeting({ my_rsvp: 'absent' }))).toBe(20);
  });

  it('counts each recorded proxy as +1', () => {
    const m = makeMeeting({
      represented_apartments: 10,
      my_rsvp: 'prezent',
      proxies: [makeProxy({ id: 'p1' }), makeProxy({ id: 'p2' })],
    });
    expect(presentApartments(m)).toBe(13); // 10 + 1 self + 2 proxies
  });
});

describe('quorumPercent + isQuorumMet', () => {
  it('computes percent correctly and checks threshold', () => {
    expect(quorumPercent(makeMeeting({ represented_apartments: 20, my_rsvp: null }))).toBe(50);
    expect(isQuorumMet(makeMeeting({ represented_apartments: 20, my_rsvp: null }))).toBe(true);
    expect(isQuorumMet(makeMeeting({ represented_apartments: 19, my_rsvp: null }))).toBe(false);
    expect(quorumPercent(makeMeeting({ total_apartments: 0 }))).toBe(0);
  });
});

describe('itemTally with proxy votes', () => {
  it('folds proxy votes into the per-item count', () => {
    const item = makeItem({ id: 'i1', votes: { pentru: 5, contra: 2, abtinere: 1 } });
    const proxies = [
      makeProxy({ id: 'p1', votes: { i1: 'pentru' } }),
      makeProxy({ id: 'p2', votes: { i1: 'contra' } }),
    ];
    expect(itemTally(item, proxies)).toEqual({ pentru: 6, contra: 3, abtinere: 1, total: 10 });
  });

  it('ignores proxy votes for other items', () => {
    const item = makeItem({ id: 'i1', votes: { pentru: 3, contra: 0, abtinere: 0 } });
    const proxies = [makeProxy({ id: 'p1', votes: { other: 'contra' } })];
    expect(itemTally(item, proxies).contra).toBe(0);
  });
});

describe('itemPercentages', () => {
  it('returns 0 for all when no votes', () => {
    expect(itemPercentages(makeItem())).toEqual({ pentru: 0, contra: 0, abtinere: 0 });
  });
});

describe('itemOutcome', () => {
  it('is in_asteptare while no votes cast', () => {
    const m = makeMeeting({ represented_apartments: 25 });
    expect(itemOutcome(makeItem(), m)).toBe('in_asteptare');
  });

  it('is respins without quorum even with high support', () => {
    const m = makeMeeting({ represented_apartments: 5 });
    const item = makeItem({ votes: { pentru: 5, contra: 0, abtinere: 0 } });
    expect(itemOutcome(item, m)).toBe('respins');
  });
});

describe('generateProcesVerbal', () => {
  it('produces a document with title, quorum info, item decisions, and legal footer', () => {
    const m = makeMeeting({
      represented_apartments: 25,
      agenda: [
        makeItem({ id: 'a', title: 'Buget anual', votes: { pentru: 20, contra: 3, abtinere: 2 } }),
      ],
    });
    const pv = generateProcesVerbal(m);
    expect(pv).toContain('PROCES-VERBAL');
    expect(pv).toContain('AGA test');
    expect(pv).toContain('Buget anual');
    expect(pv).toContain('Cvorum: întrunit');
    expect(pv).toContain('ADOPTAT');
    expect(pv).toContain('Legii 196/2018');
  });

  it('includes the proxy count when procuri are recorded', () => {
    const m = makeMeeting({
      represented_apartments: 25,
      proxies: [makeProxy({ id: 'p1' }), makeProxy({ id: 'p2' })],
      agenda: [makeItem({ id: 'a', votes: { pentru: 10, contra: 0, abtinere: 0 } })],
    });
    expect(generateProcesVerbal(m)).toContain('Procuri (împuterniciri) înregistrate: 2');
  });

  it('does not contain an em dash character', () => {
    const m = makeMeeting({ location: '', agenda: [] });
    expect(generateProcesVerbal(m)).not.toContain('—');
  });
});
