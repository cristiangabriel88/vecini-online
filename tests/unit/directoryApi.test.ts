import { beforeEach, describe, expect, it } from 'vitest';
import { useDirectoryStore } from '@/features/directory/directoryStore';
import { hydrateDirectory, syncDirectoryConsent } from '@/features/directory/directoryApi';
import { seedDirectory, directoryForAsociatie } from '@/features/directory/directoryLogic';
import { DEMO_ASOCIATIE, DEMO_DIRECTORY } from '@/shared/demo/demoData';

// directoryApi offline-path tests (T216).
// Key contracts:
//   - hydrateDirectory: no-op when not configured / empty id
//   - syncDirectoryConsent: no-op when not configured

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  useDirectoryStore.setState({
    byAsociatie: seedDirectory(),
    myUserId: DEMO_DIRECTORY[0].user_id,
    fetchError: null,
  });
});

describe('hydrateDirectory', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useDirectoryStore.getState().byAsociatie;
    await hydrateDirectory(ASOC);
    expect(useDirectoryStore.getState().byAsociatie).toBe(before);
    expect(useDirectoryStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useDirectoryStore.getState().byAsociatie;
    await hydrateDirectory('');
    expect(useDirectoryStore.getState().byAsociatie).toBe(before);
  });
});

describe('syncDirectoryConsent', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const entry = DEMO_DIRECTORY[0];
    await syncDirectoryConsent(ASOC, entry.user_id, entry);
    // No error thrown; local state unchanged
    const entries = directoryForAsociatie(useDirectoryStore.getState().byAsociatie, ASOC);
    expect(entries).toHaveLength(DEMO_DIRECTORY.length);
  });
});
