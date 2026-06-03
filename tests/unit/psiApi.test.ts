import { beforeEach, describe, expect, it } from 'vitest';
import { usePsiStore } from '@/features/psi/psiStore';
import { hydratePsiAssets, addPsiAssetLive } from '@/features/psi/psiApi';
import { seedPsiAssets, psiForAsociatie } from '@/features/psi/psiLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import type { PsiAsset } from '@/shared/types/domain';

// psiApi offline-path tests (T218).

const ASOC = DEMO_ASOCIATIE.id;

function makeAsset(overrides?: Partial<PsiAsset>): PsiAsset {
  return { id: `psi-t-${Date.now()}`, asociatie_id: ASOC, asset: 'Stingator test', kind: 'Stingator', location: null, next_check: '2027-01-01', ...overrides };
}

beforeEach(() => {
  usePsiStore.setState({ byAsociatie: seedPsiAssets(), fetchError: null });
});

describe('hydratePsiAssets', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = usePsiStore.getState().byAsociatie;
    await hydratePsiAssets(ASOC);
    expect(usePsiStore.getState().byAsociatie).toBe(before);
    expect(usePsiStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = usePsiStore.getState().byAsociatie;
    await hydratePsiAssets('');
    expect(usePsiStore.getState().byAsociatie).toBe(before);
  });
});

describe('addPsiAssetLive', () => {
  it('prepends the asset synchronously to the store', () => {
    const before = psiForAsociatie(usePsiStore.getState().byAsociatie, ASOC).length;
    const asset = makeAsset();
    addPsiAssetLive(ASOC, asset);
    const after = psiForAsociatie(usePsiStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(asset.id);
  });
});
