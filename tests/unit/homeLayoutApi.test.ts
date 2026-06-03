/**
 * T106: Live-activate per-resident home layout.
 *
 * Tests the offline path (Supabase not configured):
 * - hydrateHomeLayout is a no-op when Supabase is absent or ids are empty
 * - persistHomeLayout is a no-op when Supabase is absent (no throw, store unchanged)
 * - deleteHomeLayout is a no-op when Supabase is absent (no throw)
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { useHomeLayoutStore } from '@/features/home/homeLayoutStore';
import {
  hydrateHomeLayout,
  persistHomeLayout,
  deleteHomeLayout,
} from '@/features/home/homeLayoutApi';

const RESIDENT = 'test-resident-00000000-0001';
const ASOC = 'test-asoc-home-00000000-0001';

function storeKey(r: string, a: string) {
  return `${r}::${a}`;
}

beforeEach(() => {
  useHomeLayoutStore.setState({ byKey: {} });
});

describe('hydrateHomeLayout (offline path)', () => {
  it('is a no-op when Supabase is not configured', async () => {
    await hydrateHomeLayout(RESIDENT, ASOC);
    expect(useHomeLayoutStore.getState().byKey[storeKey(RESIDENT, ASOC)]).toBeUndefined();
  });

  it('is a no-op when residentId is empty', async () => {
    await hydrateHomeLayout('', ASOC);
    expect(Object.keys(useHomeLayoutStore.getState().byKey)).toHaveLength(0);
  });

  it('is a no-op when asociatieId is empty', async () => {
    await hydrateHomeLayout(RESIDENT, '');
    expect(Object.keys(useHomeLayoutStore.getState().byKey)).toHaveLength(0);
  });
});

describe('persistHomeLayout (offline path)', () => {
  it('is a no-op when Supabase is not configured (does not throw)', async () => {
    const cards = [{ key: 'F01' as const, visible: true, size: 'compact' as const }];
    await expect(persistHomeLayout(RESIDENT, ASOC, cards)).resolves.toBeUndefined();
    expect(useHomeLayoutStore.getState().byKey[storeKey(RESIDENT, ASOC)]).toBeUndefined();
  });
});

describe('deleteHomeLayout (offline path)', () => {
  it('is a no-op when Supabase is not configured (does not throw)', async () => {
    useHomeLayoutStore
      .getState()
      .save(RESIDENT, ASOC, [{ key: 'F01' as const, visible: true, size: 'compact' as const }]);
    await expect(deleteHomeLayout(RESIDENT, ASOC)).resolves.toBeUndefined();
    expect(useHomeLayoutStore.getState().byKey[storeKey(RESIDENT, ASOC)]).toBeDefined();
  });
});
