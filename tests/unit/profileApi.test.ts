import { describe, expect, it, beforeEach } from 'vitest';
import { useProfileStore } from '@/features/profile/profileStore';
import {
  clearProfileAvatar,
  getAvatarSignedUrl,
  hydrateProfile,
  persistProfile,
  uploadProfileAvatar,
} from '@/features/profile/profileApi';
import { emptyProfile } from '@/features/profile/profileLogic';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';

const UID = 'test-user-1';

beforeEach(() => {
  useProfileStore.setState({ byUser: {} });
});

describe('hydrateProfile (offline path)', () => {
  it('is a no-op when supabase is not configured', async () => {
    await hydrateProfile(UID);
    expect(useProfileStore.getState().byUser[UID]).toBeUndefined();
  });

  it('is a no-op when userId is empty', async () => {
    await hydrateProfile('');
    expect(Object.keys(useProfileStore.getState().byUser)).toHaveLength(0);
  });
});

describe('persistProfile (offline path)', () => {
  it('does not throw and leaves the store untouched', async () => {
    const profile = emptyProfile(UID, 'test@example.com');
    await expect(persistProfile(UID, profile)).resolves.toBeUndefined();
    expect(useProfileStore.getState().byUser[UID]).toBeUndefined();
  });

  it('is a no-op when userId is empty', async () => {
    const profile = emptyProfile('', 'test@example.com');
    await expect(persistProfile('', profile)).resolves.toBeUndefined();
  });
});

describe('uploadProfileAvatar (offline path)', () => {
  it('returns null when supabase is not configured', async () => {
    const result = await uploadProfileAvatar(UID, 'data:image/jpeg;base64,abc');
    expect(result).toBeNull();
  });

  it('returns null when userId is empty', async () => {
    const result = await uploadProfileAvatar('', 'data:image/jpeg;base64,abc');
    expect(result).toBeNull();
  });

  it('returns null when dataUrl is empty', async () => {
    const result = await uploadProfileAvatar(UID, '');
    expect(result).toBeNull();
  });
});

describe('clearProfileAvatar (offline path)', () => {
  it('does not throw when supabase is not configured', async () => {
    await expect(clearProfileAvatar(UID)).resolves.toBeUndefined();
  });

  it('does not throw when userId is empty', async () => {
    await expect(clearProfileAvatar('')).resolves.toBeUndefined();
  });
});

describe('getAvatarSignedUrl (offline path)', () => {
  it('returns null when supabase is not configured', async () => {
    const result = await getAvatarSignedUrl(`${DEMO_CURRENT_USER_ID}/avatar.jpg`);
    expect(result).toBeNull();
  });

  it('returns null when path is empty', async () => {
    const result = await getAvatarSignedUrl('');
    expect(result).toBeNull();
  });
});
