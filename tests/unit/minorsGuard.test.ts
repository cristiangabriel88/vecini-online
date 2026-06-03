import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  KIDS_AGE_RANGE_FIELDS,
  KIDS_EVENT_FIELDS,
  MINORS_RULE,
  MinorIdentityError,
  assertAggregateOnly,
  minorIdentityFields,
  unexpectedFields,
} from '@/shared/lib/minorsGuard';
import { useKidsStore } from '@/features/kids/kidsStore';
import { DEMO_KIDS_RANGES, DEMO_KIDS_EVENTS } from '@/shared/demo/demoData';

// T23 — Minors' consent guardrails (Legea 190/2018). These assertions make the
// "no feature collects identifying data about children" rule enforced, not just
// declared: the runtime guard rejects an identifying field, and parse-based locks
// pin the F64 type model + the SQL schema to the aggregate field set so a future
// change that adds a child identifier fails the suite.

describe('minorIdentityFields', () => {
  it('flags field names that would identify a child', () => {
    expect(
      minorIdentityFields([
        'child_name',
        'kid_photo',
        'copil_prenume',
        'date_of_birth',
        'data_nasterii',
        'cnp',
        'school',
        'scoala',
        'gradinita',
        'birthday',
      ]),
    ).toEqual([
      'child_name',
      'kid_photo',
      'copil_prenume',
      'date_of_birth',
      'data_nasterii',
      'cnp',
      'school',
      'scoala',
      'gradinita',
      'birthday',
    ]);
  });

  it('does NOT flag the legitimate adult/aggregate fields of the F64 model', () => {
    // user_id / organizer_name describe the responsible adult; bucket/count are aggregate.
    expect(minorIdentityFields([...KIDS_AGE_RANGE_FIELDS])).toEqual([]);
    expect(minorIdentityFields([...KIDS_EVENT_FIELDS])).toEqual([]);
  });
});

describe('unexpectedFields', () => {
  it('returns the keys outside the allowed aggregate set', () => {
    expect(
      unexpectedFields({ id: '1', bucket: '4-6', count: 2, child_name: 'x' }, KIDS_AGE_RANGE_FIELDS),
    ).toEqual(['child_name']);
    expect(unexpectedFields({ id: '1', bucket: '4-6', count: 2 }, KIDS_AGE_RANGE_FIELDS)).toEqual([]);
  });
});

describe('assertAggregateOnly', () => {
  it('passes a clean aggregate registration and a clean activity', () => {
    expect(() =>
      assertAggregateOnly(
        { id: 'k', asociatie_id: 'a', user_id: 'u', bucket: '4-6', count: 2 },
        KIDS_AGE_RANGE_FIELDS,
        'kids_age_ranges',
      ),
    ).not.toThrow();
    expect(() => assertAggregateOnly(DEMO_KIDS_EVENTS[0], KIDS_EVENT_FIELDS, 'kids_events')).not.toThrow();
  });

  it('throws MinorIdentityError when a child-identifying field is present', () => {
    expect(() =>
      assertAggregateOnly(
        { id: 'k', asociatie_id: 'a', user_id: 'u', bucket: '4-6', count: 2, child_name: 'Maria' },
        KIDS_AGE_RANGE_FIELDS,
        'kids_age_ranges',
      ),
    ).toThrow(MinorIdentityError);
  });

  it('throws on any field outside the allowlist, naming the offenders', () => {
    try {
      assertAggregateOnly(
        { id: 'k', bucket: '4-6', count: 1, date_of_birth: '2018-01-01', note: 'x' },
        KIDS_AGE_RANGE_FIELDS,
        'kids_age_ranges',
      );
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(MinorIdentityError);
      // `date_of_birth` (identifying) and `note` (not allowlisted) both reported, deduped.
      expect((e as MinorIdentityError).offendingFields.sort()).toEqual(['date_of_birth', 'note']);
    }
  });
});

describe('the F64 type model stays aggregate (structural lock on domain.ts)', () => {
  const domainSrc = readFileSync(
    join(process.cwd(), 'src', 'shared', 'types', 'domain.ts'),
    'utf8',
  );

  function interfaceFields(name: string): string[] {
    const start = domainSrc.indexOf(`export interface ${name} {`);
    expect(start, `interface ${name} not found`).toBeGreaterThan(-1);
    const body = domainSrc.slice(start + `export interface ${name} {`.length);
    const end = body.indexOf('\n}');
    const block = body.slice(0, end);
    const fields: string[] = [];
    for (const raw of block.split('\n')) {
      const line = raw.trim();
      // Skip blank lines and jsdoc/comment lines.
      if (!line || line.startsWith('*') || line.startsWith('/')) continue;
      const m = line.match(/^([a-zA-Z_][\w]*)\??:/);
      if (m) fields.push(m[1]);
    }
    return fields;
  }

  it('KidsAgeRange declares exactly the allowed aggregate fields', () => {
    expect(interfaceFields('KidsAgeRange').sort()).toEqual([...KIDS_AGE_RANGE_FIELDS].sort());
  });

  it('KidsEvent declares exactly the allowed aggregate fields', () => {
    expect(interfaceFields('KidsEvent').sort()).toEqual([...KIDS_EVENT_FIELDS].sort());
  });

  it('neither minor-facing type declares a child-identifying field', () => {
    expect(minorIdentityFields(interfaceFields('KidsAgeRange'))).toEqual([]);
    expect(minorIdentityFields(interfaceFields('KidsEvent'))).toEqual([]);
  });
});

describe('the F64 SQL schema stays aggregate (lock on the migration)', () => {
  const featuresSql = readFileSync(
    join(process.cwd(), 'supabase', 'migrations', '20260121000002_features.sql'),
    'utf8',
  );

  function tableColumns(table: string): string[] {
    const start = featuresSql.indexOf(`create table ${table} (`);
    expect(start, `table ${table} not found`).toBeGreaterThan(-1);
    const body = featuresSql.slice(start + `create table ${table} (`.length);
    const end = body.indexOf(');');
    const block = body.slice(0, end);
    return block
      .split(',')
      .map((c) => c.trim().split(/\s+/)[0])
      .filter((c) => c && /^[a-z_]+$/.test(c));
  }

  it('kids_age_ranges / kids_events declare no child-identifying column', () => {
    expect(minorIdentityFields(tableColumns('kids_age_ranges'))).toEqual([]);
    expect(minorIdentityFields(tableColumns('kids_events'))).toEqual([]);
  });
});

const DEMO_ASOC = 'demo-asoc';

describe('the kids store never stores a child identity', () => {
  it('a registration written through the store carries only aggregate fields', () => {
    const cat = useKidsStore.getState().byAsociatie[DEMO_ASOC] ?? { ranges: [], events: [] };
    const before = cat.ranges.length;
    // '15-18' is not in the demo user's seeded registrations, so this takes the insert path.
    useKidsStore.getState().registerKids(DEMO_ASOC, 'u-res', '', '15-18', 2);
    const ranges = useKidsStore.getState().byAsociatie[DEMO_ASOC]?.ranges ?? [];
    expect(ranges.length).toBe(before + 1);
    const added = ranges[ranges.length - 1];
    expect(added.count).toBe(2);
    expect(unexpectedFields(added, KIDS_AGE_RANGE_FIELDS)).toEqual([]);
    expect(minorIdentityFields(Object.keys(added))).toEqual([]);
  });

  it('an activity written through the store carries only aggregate fields', () => {
    const cat = useKidsStore.getState().byAsociatie[DEMO_ASOC] ?? { ranges: [], events: [] };
    const before = cat.events.length;
    const event = {
      id: `ke-test`, asociatie_id: DEMO_ASOC, title: 'Întâlnire în parc', date: '2026-07-01',
      time: '17:00', location: 'Parc', bucket: '4-6' as const, note: '', interested: 0,
      organizer_user_id: 'u-res', organizer_name: 'Popescu Andrei', created_at: '2026-06-01T00:00:00Z',
    };
    useKidsStore.getState().addEvent(DEMO_ASOC, event);
    const events = useKidsStore.getState().byAsociatie[DEMO_ASOC]?.events ?? [];
    expect(events.length).toBe(before + 1);
    const added = events[events.length - 1];
    expect(unexpectedFields(added, KIDS_EVENT_FIELDS)).toEqual([]);
    expect(minorIdentityFields(Object.keys(added))).toEqual([]);
  });

  it('the demo seed holds no child identity', () => {
    for (const r of DEMO_KIDS_RANGES) {
      expect(unexpectedFields(r, KIDS_AGE_RANGE_FIELDS)).toEqual([]);
      expect(minorIdentityFields(Object.keys(r))).toEqual([]);
    }
    for (const e of DEMO_KIDS_EVENTS) {
      expect(unexpectedFields(e, KIDS_EVENT_FIELDS)).toEqual([]);
      expect(minorIdentityFields(Object.keys(e))).toEqual([]);
    }
  });
});

describe('MINORS_RULE', () => {
  it('cites the governing law for the consent surface and docs', () => {
    expect(MINORS_RULE.legalBasis).toMatch(/190\/2018/);
    expect(MINORS_RULE.legalBasis).toMatch(/art\. 8/);
    expect(MINORS_RULE.summary.length).toBeGreaterThan(0);
  });
});
