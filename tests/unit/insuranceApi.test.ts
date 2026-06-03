import { beforeEach, describe, expect, it } from 'vitest';
import { useInsuranceStore } from '@/features/insurance/insuranceStore';
import { hydrateInsurance, addInsurancePolicyLive } from '@/features/insurance/insuranceApi';
import { seedInsurance, insuranceForAsociatie } from '@/features/insurance/insuranceLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import type { InsurancePolicy } from '@/shared/types/domain';

// insuranceApi offline-path tests (T218).

const ASOC = DEMO_ASOCIATIE.id;

function makePolicy(overrides?: Partial<InsurancePolicy>): InsurancePolicy {
  return { id: `ins-t-${Date.now()}`, asociatie_id: ASOC, insurer: 'Test Asigurator', policy_number: 'POL-TEST-001', expires_at: '2027-12-31', document_path: null, ...overrides };
}

beforeEach(() => {
  useInsuranceStore.setState({ byAsociatie: seedInsurance(), fetchError: null });
});

describe('hydrateInsurance', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useInsuranceStore.getState().byAsociatie;
    await hydrateInsurance(ASOC);
    expect(useInsuranceStore.getState().byAsociatie).toBe(before);
    expect(useInsuranceStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useInsuranceStore.getState().byAsociatie;
    await hydrateInsurance('');
    expect(useInsuranceStore.getState().byAsociatie).toBe(before);
  });
});

describe('addInsurancePolicyLive', () => {
  it('prepends the policy synchronously', () => {
    const before = insuranceForAsociatie(useInsuranceStore.getState().byAsociatie, ASOC).length;
    const policy = makePolicy();
    addInsurancePolicyLive(ASOC, policy);
    const after = insuranceForAsociatie(useInsuranceStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(policy.id);
  });
});
