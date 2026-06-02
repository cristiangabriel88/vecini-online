import { describe, expect, it } from 'vitest';
import type { Apartment } from '@/shared/types/domain';
import {
  applyVote,
  catalogForAsociatie,
  findVoterApartmentId,
  migratePollsState,
  optionsForPoll,
  quorumApartmentCount,
  seedPolls,
  seedVoteCounts,
  tallyYesNo,
} from '@/features/polls/pollLogic';
import {
  DEMO_ASOCIATIE,
  DEMO_POLLS,
  DEMO_POLL_OPTIONS,
  DEMO_VOTE_COUNTS,
} from '@/shared/demo/demoData';

function apt(id: string, claimed?: string, is_active = true): Apartment {
  return {
    id,
    asociatie_id: 'asoc-x',
    scara: 'A',
    etaj: 0,
    numar_apartament: id,
    suprafata_utila: 50,
    cota_parte_indiviza: 0.04,
    numar_persoane: 1,
    persons: [
      {
        id: `${id}-p0`,
        name: 'Owner',
        role: 'proprietar',
        is_primary: true,
        claimed_user_id: claimed ?? null,
      },
    ],
    proprietar_principal_name: 'Owner',
    is_active,
    notes: null,
    created_at: '',
    updated_at: '',
  };
}

const base = {
  yesOptionId: 'yes',
  noOptionId: 'no',
  totalApartments: 100,
};

describe('tallyYesNo', () => {
  it('fails when quorum is not met', () => {
    const r = tallyYesNo({
      ...base,
      counts: { yes: 10, no: 5 },
      quorumPercent: 50,
      majorityRule: 'simple',
    });
    expect(r.quorumMet).toBe(false);
    expect(r.passed).toBe(false);
  });

  it('passes with simple majority when quorum met', () => {
    const r = tallyYesNo({
      ...base,
      counts: { yes: 40, no: 20 },
      quorumPercent: 50,
      majorityRule: 'simple',
    });
    expect(r.quorumMet).toBe(true);
    expect(r.passed).toBe(true);
  });

  it('absolute majority needs more than half of all apartments', () => {
    const r = tallyYesNo({
      ...base,
      counts: { yes: 40, no: 20 },
      quorumPercent: 50,
      majorityRule: 'absolute',
    });
    expect(r.passed).toBe(false);
    const r2 = tallyYesNo({
      ...base,
      counts: { yes: 51, no: 20 },
      quorumPercent: 50,
      majorityRule: 'absolute',
    });
    expect(r2.passed).toBe(true);
  });

  it('qualified 2/3 majority of cast votes', () => {
    const r = tallyYesNo({
      ...base,
      counts: { yes: 67, no: 33 },
      quorumPercent: 50,
      majorityRule: 'qualified_2_3',
    });
    expect(r.passed).toBe(true);
    const r2 = tallyYesNo({
      ...base,
      counts: { yes: 60, no: 40 },
      quorumPercent: 50,
      majorityRule: 'qualified_2_3',
    });
    expect(r2.passed).toBe(false);
  });

  it('computes percentages', () => {
    const r = tallyYesNo({
      ...base,
      counts: { yes: 75, no: 25 },
      quorumPercent: 50,
      majorityRule: 'simple',
    });
    expect(r.percentages.yes).toBe(75);
    expect(r.percentages.no).toBe(25);
  });

  it('treats zero apartments as quorum not met (no division by zero)', () => {
    const r = tallyYesNo({
      ...base,
      counts: { yes: 5 },
      totalApartments: 0,
      quorumPercent: 50,
      majorityRule: 'simple',
    });
    expect(r.quorumMet).toBe(false);
    expect(r.percentages.yes).toBe(100);
  });
});

describe('poll catalog model', () => {
  it('seeds the demo asociație with the demo poll catalog', () => {
    const seed = seedPolls();
    expect(seed[DEMO_ASOCIATIE.id].polls).toEqual(DEMO_POLLS);
    expect(seed[DEMO_ASOCIATIE.id].options).toEqual(DEMO_POLL_OPTIONS);
  });

  it('seeds the running counts from the demo vote counts (a copy)', () => {
    expect(seedVoteCounts()).toEqual(DEMO_VOTE_COUNTS);
    expect(seedVoteCounts()).not.toBe(DEMO_VOTE_COUNTS);
  });

  it('returns the catalog for a known asociație and a stable empty one otherwise', () => {
    const seed = seedPolls();
    expect(catalogForAsociatie(seed, DEMO_ASOCIATIE.id).polls).toEqual(DEMO_POLLS);
    expect(catalogForAsociatie(seed, 'unknown')).toBe(catalogForAsociatie(seed, 'other'));
    expect(catalogForAsociatie(seed, null)).toBe(catalogForAsociatie({}, null));
    expect(catalogForAsociatie(seed, null).polls).toEqual([]);
  });

  it('optionsForPoll filters by poll and sorts by sort_order', () => {
    const options = [
      { id: 'b', poll_id: 'p1', label: 'B', sort_order: 1 },
      { id: 'a', poll_id: 'p1', label: 'A', sort_order: 0 },
      { id: 'x', poll_id: 'p2', label: 'X', sort_order: 0 },
    ];
    expect(optionsForPoll(options, 'p1').map((o) => o.id)).toEqual(['a', 'b']);
    expect(optionsForPoll(options, 'p2').map((o) => o.id)).toEqual(['x']);
  });

  it('quorumApartmentCount counts only active apartments', () => {
    expect(quorumApartmentCount([apt('1'), apt('2'), apt('3', undefined, false)])).toBe(2);
    expect(quorumApartmentCount([])).toBe(0);
  });

  it('findVoterApartmentId resolves the active apartment claimed by the voter', () => {
    const apts = [apt('1', 'u-1'), apt('2', 'u-2'), apt('3', 'u-3', false)];
    expect(findVoterApartmentId(apts, 'u-2')).toBe('2');
    expect(findVoterApartmentId(apts, 'u-3')).toBeNull(); // inactive apartment excluded
    expect(findVoterApartmentId(apts, 'u-unknown')).toBeNull();
  });

  it('applyVote increments one option without mutating the input', () => {
    const before = { a: 2, b: 1 };
    expect(applyVote(before, 'a')).toEqual({ a: 3, b: 1 });
    expect(before).toEqual({ a: 2, b: 1 }); // pure
    expect(applyVote(before, 'c')).toEqual({ a: 2, b: 1, c: 1 }); // new option
  });

  it('migratePollsState preserves non-demo asociații and reseeds the demo one', () => {
    const custom = { polls: [], options: [] };
    const persisted = {
      byAsociatie: { 'asoc-b': custom, [DEMO_ASOCIATIE.id]: { polls: [], options: [] } },
    };
    const migrated = migratePollsState(persisted);
    expect(migrated['asoc-b']).toBe(custom); // kept as-is
    expect(migrated[DEMO_ASOCIATIE.id].polls).toEqual(DEMO_POLLS); // reseeded
    expect(migrated[DEMO_ASOCIATIE.id].options).toEqual(DEMO_POLL_OPTIONS);
  });

  it('migratePollsState falls back to the seed when nothing is persisted', () => {
    expect(migratePollsState(null)).toEqual(seedPolls());
    expect(migratePollsState({})).toEqual(seedPolls());
  });
});
