import { beforeEach, describe, expect, it } from 'vitest';
import { useThankYousStore } from '@/features/thankyous/thankYousStore';
import { hydrateThankYous, postThankYouLive } from '@/features/thankyous/thankYousApi';
import { thankYousForAsociatie, seedThankYous } from '@/features/thankyous/thankYouLogic';
import { DEMO_ASOCIATIE, DEMO_THANK_YOUS } from '@/shared/demo/demoData';
import type { ThankYou } from '@/shared/types/domain';

// thankYousApi offline-path tests (T216).
// Key contracts:
//   - hydrateThankYous: no-op when not configured / empty id
//   - postThankYouLive: prepends synchronously, offline-safe

const ASOC = DEMO_ASOCIATIE.id;

function makeThankYou(overrides?: Partial<ThankYou>): ThankYou {
  return {
    id: `ty-test-${Date.now()}`,
    asociatie_id: ASOC,
    from_user_id: 'u-test',
    from_name: 'Test User',
    to_apartment: 'Ap. 5',
    message: 'Multumesc pentru ajutor!',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  useThankYousStore.setState({ byAsociatie: seedThankYous(), fetchError: null });
});

describe('hydrateThankYous', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useThankYousStore.getState().byAsociatie;
    await hydrateThankYous(ASOC);
    expect(useThankYousStore.getState().byAsociatie).toBe(before);
    expect(useThankYousStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useThankYousStore.getState().byAsociatie;
    await hydrateThankYous('');
    expect(useThankYousStore.getState().byAsociatie).toBe(before);
  });
});

describe('postThankYouLive', () => {
  it('prepends the thank-you synchronously to the store', () => {
    const before = thankYousForAsociatie(useThankYousStore.getState().byAsociatie, ASOC).length;
    const item = makeThankYou();
    postThankYouLive(ASOC, item);
    const after = thankYousForAsociatie(useThankYousStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(item.id);
  });

  it('preserves the demo thank-yous after adding a new one', () => {
    postThankYouLive(ASOC, makeThankYou());
    const after = thankYousForAsociatie(useThankYousStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_THANK_YOUS.map((ty) => ty.id);
    expect(after.filter((ty) => demoIds.includes(ty.id))).toHaveLength(DEMO_THANK_YOUS.length);
  });
});
