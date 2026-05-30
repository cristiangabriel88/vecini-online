// auditStore live read path tests (T86).
// The live path (isSupabaseConfigured === true) is exercised via a supabase
// mock. The offline path (false, which is the CI default) just verifies that
// hydrateForAsociatie is a no-op. verifyChain() is NOT called on live data:
// seq is server-stamped (trigger overrides the client's value), so the stored
// hash may be computed over a different seq; the RLS append-only policy is the
// real tamper-evidence control.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditStore } from '@/shared/store/auditStore';
import { GENESIS_HASH } from '@/features/audit/auditLogic';

const ASOC = 'asoc-audit-live-test';

// ---- supabase mock (live path) ------------------------------------------

type QueryBuilder = Record<string, () => QueryBuilder> & { _resolve: (v: unknown) => void };

function makeQueryBuilder(rows: unknown[]): QueryBuilder {
  let _resolve: (v: unknown) => void = () => {};
  const p = new Promise((r) => { _resolve = r; });
  const qb: QueryBuilder = {
    select: () => qb,
    eq: () => qb,
    order: () => { _resolve({ data: rows, error: null }); return qb as unknown as QueryBuilder; },
    then: (fn: (v: unknown) => void) => p.then(fn),
    _resolve,
  } as unknown as QueryBuilder;
  return qb;
}

vi.mock('@/shared/lib/supabase', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: vi.fn(),
    },
  };
});

// ---- helpers -------------------------------------------------------------

const FAKE_ROWS = [
  {
    id: 'row-1',
    seq: 1,
    asociatie_id: ASOC,
    actor_user_id: 'u-1',
    actor_name: 'Ion Popescu',
    action: 'feature.enabled',
    entity: 'feature',
    entity_label: 'Anunturi',
    before_value: null,
    after_value: 'enabled',
    created_at: '2026-05-30T12:00:00.000Z',
    prev_hash: GENESIS_HASH,
    hash: 'aabbccdd11223344',
  },
  {
    id: 'row-2',
    seq: 2,
    asociatie_id: ASOC,
    actor_user_id: 'u-1',
    actor_name: 'Ion Popescu',
    action: 'announcement.published',
    entity: 'announcement',
    entity_label: 'Aviz lift',
    before_value: null,
    after_value: null,
    created_at: '2026-05-30T12:01:00.000Z',
    prev_hash: 'aabbccdd11223344',
    hash: '55667788aabbccdd',
  },
];

beforeEach(async () => {
  useAuditStore.setState({ liveByAsociatie: {} });
  vi.mocked((await import('@/shared/lib/supabase')).supabase.from).mockReset();
});

describe('hydrateForAsociatie', () => {
  it('populates liveByAsociatie with mapped entries on success', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    vi.mocked(supabase.from).mockReturnValue(makeQueryBuilder(FAKE_ROWS) as unknown as ReturnType<typeof supabase.from>);

    await useAuditStore.getState().hydrateForAsociatie(ASOC);

    const live = useAuditStore.getState().liveByAsociatie[ASOC];
    expect(live).toHaveLength(2);
    expect(live[0].id).toBe('row-1');
    expect(live[0].actor_name).toBe('Ion Popescu');
    expect(live[0].action).toBe('feature.enabled');
    expect(live[0].at).toBe('2026-05-30T12:00:00.000Z');
    expect(live[1].seq).toBe(2);
  });

  it('uses GENESIS_HASH for null prev_hash / hash in DB rows', async () => {
    const rowWithNulls = [{ ...FAKE_ROWS[0], prev_hash: null, hash: null }];
    const { supabase } = await import('@/shared/lib/supabase');
    vi.mocked(supabase.from).mockReturnValue(makeQueryBuilder(rowWithNulls) as unknown as ReturnType<typeof supabase.from>);

    await useAuditStore.getState().hydrateForAsociatie(ASOC);

    const entry = useAuditStore.getState().liveByAsociatie[ASOC][0];
    expect(entry.prev_hash).toBe(GENESIS_HASH);
    expect(entry.hash).toBe(GENESIS_HASH);
  });

  it('leaves liveByAsociatie unchanged on Supabase error (fallback stays)', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    vi.mocked(supabase.from).mockImplementation(() => {
      throw new Error('network failure');
    });
    useAuditStore.setState({ liveByAsociatie: { [ASOC]: [] } });

    await useAuditStore.getState().hydrateForAsociatie(ASOC);

    expect(useAuditStore.getState().liveByAsociatie[ASOC]).toEqual([]);
  });
});

describe('forAsociatie', () => {
  it('returns live data when liveByAsociatie is populated', async () => {
    useAuditStore.setState({
      liveByAsociatie: { [ASOC]: FAKE_ROWS.map((r) => ({
        id: r.id, seq: r.seq, asociatie_id: r.asociatie_id,
        actor_user_id: r.actor_user_id, actor_name: r.actor_name ?? '',
        action: r.action as import('@/features/audit/auditLogic').AuditAction,
        entity: r.entity as import('@/features/audit/auditLogic').AuditEntity,
        entity_label: r.entity_label ?? '', before: r.before_value, after: r.after_value,
        at: r.created_at, prev_hash: r.prev_hash ?? GENESIS_HASH, hash: r.hash ?? GENESIS_HASH,
      })) },
    });
    const chain = useAuditStore.getState().forAsociatie(ASOC);
    expect(chain).toHaveLength(2);
    expect(chain[0].id).toBe('row-1');
  });

  it('returns persisted offline chain when no live data is available', () => {
    useAuditStore.setState({ liveByAsociatie: {} });
    const chain = useAuditStore.getState().forAsociatie(ASOC);
    // No local chain seeded for ASOC → returns empty chain
    expect(chain).toHaveLength(0);
  });

  it('returns empty chain for null asociatieId', () => {
    expect(useAuditStore.getState().forAsociatie(null)).toHaveLength(0);
  });
});

describe('hydrateForAsociatie offline guard', () => {
  it('is a no-op when asociatieId is empty', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    await useAuditStore.getState().hydrateForAsociatie('');
    expect(vi.mocked(supabase.from)).not.toHaveBeenCalled();
  });
});
