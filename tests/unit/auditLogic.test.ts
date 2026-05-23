import { describe, expect, it } from 'vitest';
import {
  type AuditEntry,
  type AuditInput,
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  GENESIS_HASH,
  appendEntry,
  auditToCsv,
  auditToJson,
  buildDemoAuditChain,
  computeHash,
  filterEntries,
  newEntry,
  pruneExpired,
  sortBySeqDesc,
  verifyChain,
} from '@/features/audit/auditLogic';

const ASOC = 'asoc-1';

function input(over: Partial<AuditInput> = {}): AuditInput {
  return {
    asociatie_id: ASOC,
    actor_user_id: 'u-1',
    actor_name: 'Popescu Andrei',
    action: 'feature.enabled',
    entity: 'feature',
    entity_label: 'F01',
    before: null,
    after: 'on',
    ...over,
  };
}

// A deterministic counter so seeded ids/timestamps don't rely on real time.
function chainOf(...inputs: AuditInput[]): AuditEntry[] {
  let chain: AuditEntry[] = [];
  inputs.forEach((inp, i) => {
    chain = appendEntry(chain, inp, new Date(2026, 0, 1 + i, 9, 0, 0), () => 0.5);
  });
  return chain;
}

describe('audit chain building (T09)', () => {
  it('first entry starts at seq 1 with the genesis predecessor hash', () => {
    const e = newEntry(input(), null, new Date('2026-05-01T10:00:00Z'), () => 0.5);
    expect(e.seq).toBe(1);
    expect(e.prev_hash).toBe(GENESIS_HASH);
    expect(e.hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('appendEntry increments seq and links to the tail hash', () => {
    const chain = chainOf(input(), input({ action: 'invite.issued', entity: 'invite', entity_label: 'ABC123' }));
    expect(chain).toHaveLength(2);
    expect(chain[1].seq).toBe(2);
    expect(chain[1].prev_hash).toBe(chain[0].hash);
  });

  it('computeHash is deterministic for identical content', () => {
    const e = newEntry(input(), null, new Date('2026-05-01T10:00:00Z'), () => 0.5);
    const { hash, ...rest } = e;
    expect(computeHash(rest)).toBe(hash);
  });

  it('buildDemoAuditChain produces a valid, sequential, multi-feature chain', () => {
    const chain = buildDemoAuditChain(ASOC, 'u-1', 'Popescu Andrei');
    expect(chain.length).toBeGreaterThanOrEqual(5);
    expect(chain.map((e) => e.seq)).toEqual(chain.map((_, i) => i + 1));
    // spans more than one entity kind, demonstrating cross-feature coverage
    expect(new Set(chain.map((e) => e.entity)).size).toBeGreaterThan(1);
    expect(verifyChain(chain).ok).toBe(true);
  });
});

describe('audit chain integrity (T09)', () => {
  it('verifies an intact chain', () => {
    const chain = chainOf(input(), input({ action: 'dsr.completed', entity: 'dsr', entity_label: 'export' }));
    expect(verifyChain(chain)).toEqual({ ok: true, brokenAt: null });
  });

  it('detects an edited entry at the tampered seq', () => {
    const chain = buildDemoAuditChain(ASOC, 'u-1', 'Popescu Andrei');
    const tampered = chain.map((e) => ({ ...e }));
    tampered[2].entity_label = 'forged';
    const check = verifyChain(tampered);
    expect(check.ok).toBe(false);
    expect(check.brokenAt).toBe(3);
  });

  it('detects a reordered chain', () => {
    const chain = buildDemoAuditChain(ASOC, 'u-1', 'Popescu Andrei');
    const reordered = [...chain];
    [reordered[1], reordered[2]] = [reordered[2], reordered[1]];
    expect(verifyChain(reordered).ok).toBe(false);
  });
});

describe('audit querying (T09)', () => {
  const chain = chainOf(
    input({ action: 'feature.enabled', entity: 'feature', entity_label: 'F01', actor_name: 'Ana' }),
    input({ action: 'invite.issued', entity: 'invite', entity_label: 'XYZ789', actor_name: 'Bogdan' }),
    input({ action: 'feature.disabled', entity: 'feature', entity_label: 'F44', actor_name: 'Ana' }),
  );

  it('filters by action and entity', () => {
    expect(filterEntries(chain, { action: 'invite.issued' })).toHaveLength(1);
    expect(filterEntries(chain, { entity: 'feature' })).toHaveLength(2);
    expect(filterEntries(chain, { action: 'all', entity: 'all' })).toHaveLength(3);
  });

  it('filters by actor substring (case-insensitive) and free text', () => {
    expect(filterEntries(chain, { actor: 'ana' })).toHaveLength(2);
    expect(filterEntries(chain, { text: 'xyz' })).toHaveLength(1);
    expect(filterEntries(chain, { text: 'f44' })).toHaveLength(1);
  });

  it('filters by an inclusive date range', () => {
    // entries are on 2026-01-01, -02, -03 (see chainOf)
    const only2nd = filterEntries(chain, { from: '2026-01-02', to: '2026-01-02' });
    expect(only2nd).toHaveLength(1);
    expect(only2nd[0].entity_label).toBe('XYZ789');
  });

  it('sorts newest first by seq without mutating', () => {
    const sorted = sortBySeqDesc(chain);
    expect(sorted.map((e) => e.seq)).toEqual([3, 2, 1]);
    expect(chain.map((e) => e.seq)).toEqual([1, 2, 3]);
  });
});

describe('audit retention + export (T09)', () => {
  it('prunes entries older than the retention window', () => {
    const old = newEntry(input(), null, new Date('2020-01-01T00:00:00Z'), () => 0.5);
    const recent = newEntry(input(), old, new Date(), () => 0.5);
    const kept = pruneExpired([old, recent], new Date(), 730);
    expect(kept).toHaveLength(1);
    expect(kept[0]).toBe(recent);
  });

  it('exports JSON that round-trips and CSV with a header row', () => {
    const chain = chainOf(input(), input({ action: 'invite.issued', entity: 'invite', entity_label: 'ABC' }));
    expect(JSON.parse(auditToJson(chain))).toHaveLength(2);
    const csv = auditToCsv(chain);
    expect(csv.split('\n')[0]).toContain('seq');
    expect(csv).toContain('ABC');
  });

  it('exposes a catalogue of actions and entities for the UI', () => {
    expect(AUDIT_ACTIONS).toContain('feature.enabled');
    expect(AUDIT_ENTITIES).toContain('breach');
  });
});
