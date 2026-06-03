import { beforeEach, describe, expect, it } from 'vitest';
import { useKeysStore } from '@/features/keys/keysStore';
import { hydrateKeys, addKeyLive, handoverKeyLive } from '@/features/keys/keysApi';
import { seedKeys, keysForAsociatie } from '@/features/keys/keysLogic';
import { DEMO_ASOCIATIE, DEMO_KEYS } from '@/shared/demo/demoData';
import type { KeyRecord } from '@/shared/types/domain';

// keysApi offline-path tests (T218).

const ASOC = DEMO_ASOCIATIE.id;

function makeKey(overrides?: Partial<KeyRecord>): KeyRecord {
  return { id: `key-t-${Date.now()}`, asociatie_id: ASOC, space: 'Sala tehnica', holder_name: 'Administrator test', notes: null, ...overrides };
}

beforeEach(() => {
  useKeysStore.setState({ byAsociatie: seedKeys(), fetchError: null });
});

describe('hydrateKeys', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useKeysStore.getState().byAsociatie;
    await hydrateKeys(ASOC);
    expect(useKeysStore.getState().byAsociatie).toBe(before);
    expect(useKeysStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useKeysStore.getState().byAsociatie;
    await hydrateKeys('');
    expect(useKeysStore.getState().byAsociatie).toBe(before);
  });
});

describe('addKeyLive', () => {
  it('prepends the key record synchronously', () => {
    const before = keysForAsociatie(useKeysStore.getState().byAsociatie, ASOC).length;
    const key = makeKey();
    addKeyLive(ASOC, key);
    const after = keysForAsociatie(useKeysStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(key.id);
  });
});

describe('handoverKeyLive', () => {
  it('updates the holder name synchronously', () => {
    const id = DEMO_KEYS[0].id;
    handoverKeyLive(ASOC, id, 'Noul Responsabil');
    const after = keysForAsociatie(useKeysStore.getState().byAsociatie, ASOC);
    expect(after.find((k) => k.id === id)?.holder_name).toBe('Noul Responsabil');
  });
});
