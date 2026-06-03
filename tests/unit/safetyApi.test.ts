import { beforeEach, describe, expect, it } from 'vitest';
import { useSafetyStore } from '@/features/safety/safetyStore';
import { hydrateSafetyProfile, persistSafetyProfile } from '@/features/safety/safetyApi';
import { seedSafetyByUser, safetyForUser } from '@/features/safety/safetyLogic';
import { DEMO_SAFETY_PROFILE } from '@/shared/demo/demoData';

// safetyApi offline-path tests (T218).
// Key contracts:
//   - hydrateSafetyProfile: no-op when not configured / empty userId
//   - persistSafetyProfile: updates store synchronously offline

const UID = DEMO_SAFETY_PROFILE.user_id;
const ASOC = DEMO_SAFETY_PROFILE.asociatie_id;

beforeEach(() => {
  useSafetyStore.setState({ byUser: seedSafetyByUser(), fetchError: null });
});

describe('hydrateSafetyProfile', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useSafetyStore.getState().byUser;
    await hydrateSafetyProfile(UID, ASOC);
    expect(useSafetyStore.getState().byUser).toBe(before);
    expect(useSafetyStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when userId is empty', async () => {
    const before = useSafetyStore.getState().byUser;
    await hydrateSafetyProfile('', ASOC);
    expect(useSafetyStore.getState().byUser).toBe(before);
  });
});

describe('persistSafetyProfile', () => {
  it('updates the store synchronously with new profile data', () => {
    const updated = { ...DEMO_SAFETY_PROFILE, passphrase: 'TestPhrase', updated_at: new Date().toISOString() };
    persistSafetyProfile(UID, ASOC, updated);
    const stored = safetyForUser(useSafetyStore.getState().byUser, UID);
    expect(stored?.passphrase).toBe('TestPhrase');
  });

  it('preserves contacts when updating passphrase', () => {
    const updated = { ...DEMO_SAFETY_PROFILE, passphrase: 'NewWord', updated_at: new Date().toISOString() };
    persistSafetyProfile(UID, ASOC, updated);
    const stored = safetyForUser(useSafetyStore.getState().byUser, UID);
    expect(stored?.contacts).toHaveLength(DEMO_SAFETY_PROFILE.contacts.length);
  });
});
