import { beforeEach, describe, expect, it } from 'vitest';
import { useDutyStore } from '@/features/duty/dutyStore';
import { hydrateDutySlots, signUpForDuty, releaseFromDuty } from '@/features/duty/dutyApi';
import { dutyForAsociatie, seedDuty } from '@/features/duty/dutyLogic';
import { DEMO_ASOCIATIE, DEMO_DUTY } from '@/shared/demo/demoData';

// dutyApi offline-path tests (T214).
// Key contracts:
//   - hydrateDutySlots: no-op when not configured / empty id
//   - signUpForDuty: sets volunteer synchronously; offline-safe
//   - releaseFromDuty: clears volunteer synchronously; offline-safe

const ASOC = DEMO_ASOCIATIE.id;
const FREE_SLOT = DEMO_DUTY.find((s) => s.volunteer_user_id === null)!;

beforeEach(() => {
  useDutyStore.setState({ byAsociatie: seedDuty(), fetchError: null });
});

describe('hydrateDutySlots', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useDutyStore.getState().byAsociatie;
    await hydrateDutySlots(ASOC);
    expect(useDutyStore.getState().byAsociatie).toBe(before);
    expect(useDutyStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useDutyStore.getState().byAsociatie;
    await hydrateDutySlots('');
    expect(useDutyStore.getState().byAsociatie).toBe(before);
  });
});

describe('signUpForDuty', () => {
  it('sets volunteer_user_id and volunteer_name on the target slot', () => {
    signUpForDuty(ASOC, FREE_SLOT.id, 'u-test', 'Ion Test', 'Disponibil');
    const slot = dutyForAsociatie(useDutyStore.getState().byAsociatie, ASOC).find(
      (s) => s.id === FREE_SLOT.id,
    )!;
    expect(slot.volunteer_user_id).toBe('u-test');
    expect(slot.volunteer_name).toBe('Ion Test');
    expect(slot.note).toBe('Disponibil');
  });

  it('stores a null note when note is empty', () => {
    signUpForDuty(ASOC, FREE_SLOT.id, 'u-test', 'Ion Test', '');
    const slot = dutyForAsociatie(useDutyStore.getState().byAsociatie, ASOC).find(
      (s) => s.id === FREE_SLOT.id,
    )!;
    expect(slot.note).toBeNull();
  });

  it('does not affect other slots', () => {
    signUpForDuty(ASOC, FREE_SLOT.id, 'u-test', 'Ion Test', '');
    const others = dutyForAsociatie(useDutyStore.getState().byAsociatie, ASOC).filter(
      (s) => s.id !== FREE_SLOT.id,
    );
    expect(others).toHaveLength(DEMO_DUTY.length - 1);
  });
});

describe('releaseFromDuty', () => {
  it('clears volunteer fields on the target slot', () => {
    const coveredSlot = DEMO_DUTY.find((s) => s.volunteer_user_id !== null)!;
    releaseFromDuty(ASOC, coveredSlot.id);
    const slot = dutyForAsociatie(useDutyStore.getState().byAsociatie, ASOC).find(
      (s) => s.id === coveredSlot.id,
    )!;
    expect(slot.volunteer_user_id).toBeNull();
    expect(slot.volunteer_name).toBeNull();
    expect(slot.note).toBeNull();
  });
});
