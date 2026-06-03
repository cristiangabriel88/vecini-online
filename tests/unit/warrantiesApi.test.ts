import { beforeEach, describe, expect, it } from 'vitest';
import { useWarrantiesStore } from '@/features/warranties/warrantiesStore';
import { hydrateWarranties, addWarrantyLive } from '@/features/warranties/warrantiesApi';
import { warrantiesForAsociatie, seedWarranties } from '@/features/warranties/warrantyLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  useWarrantiesStore.setState({ byAsociatie: seedWarranties(), fetchError: null });
});

describe('hydrateWarranties', () => {
  it('is a no-op when Supabase is not configured', async () => {
    const before = useWarrantiesStore.getState().byAsociatie;
    await hydrateWarranties(ASOC);
    expect(useWarrantiesStore.getState().byAsociatie).toBe(before);
    expect(useWarrantiesStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useWarrantiesStore.getState().byAsociatie;
    await hydrateWarranties('');
    expect(useWarrantiesStore.getState().byAsociatie).toBe(before);
  });
});

describe('addWarrantyLive', () => {
  it('prepends the warranty synchronously', () => {
    const before = warrantiesForAsociatie(useWarrantiesStore.getState().byAsociatie, ASOC).length;
    addWarrantyLive(ASOC, {
      id: 'wr-test',
      asociatie_id: ASOC,
      asset: 'Lift Schindler',
      purchased_at: '2026-01-01',
      warranty_months: 24,
      expires_at: '2028-01-01',
      document_path: null,
    });
    const after = warrantiesForAsociatie(useWarrantiesStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe('wr-test');
  });
});
