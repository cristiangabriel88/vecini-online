import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { usePlatformAsociatiiStore } from '@/platform/platformAsociatiiStore';
import { DEMO_PLATFORM_ASOCIATII } from '@/platform/demoPlatform';

const SRC = readFileSync(join(process.cwd(), 'src', 'platform', 'platformApi.ts'), 'utf8');

// Supabase is not configured in the test environment, so hydrateAsociatiiList
// is a no-op and the store retains its seeded demo data.

beforeEach(() => {
  usePlatformAsociatiiStore.setState({
    asociatii: DEMO_PLATFORM_ASOCIATII,
    fetchError: null,
  });
});

describe('platformApi source contract', () => {
  it('short-circuits hydration when Supabase is not configured', () => {
    expect(SRC).toContain('if (!isSupabaseConfigured) return;');
  });

  it('keeps the optional status columns out of the primary list query', () => {
    expect(SRC).toContain("select('id, name, address, cui, iban, contact_phone, contact_email')");
  });
});

describe('platformAsociatiiStore.replaceAsociatii', () => {
  it('replaces the asociatii list with the provided rows', () => {
    const newRows = [
      {
        id: 'live-1',
        name: 'Asociatia Live',
        city: '',
        members: 10,
        apartments: 8,
        lastAdminSignInAt: '2026-06-01T10:00:00Z',
      },
    ];
    usePlatformAsociatiiStore.getState().replaceAsociatii(newRows);
    const { asociatii } = usePlatformAsociatiiStore.getState();
    expect(asociatii).toHaveLength(1);
    expect(asociatii[0].id).toBe('live-1');
    expect(asociatii[0].members).toBe(10);
  });

  it('can be called with an empty array to clear the list', () => {
    usePlatformAsociatiiStore.getState().replaceAsociatii([]);
    expect(usePlatformAsociatiiStore.getState().asociatii).toHaveLength(0);
  });
});

describe('platformAsociatiiStore.setFetchError', () => {
  it('sets a non-null error', () => {
    usePlatformAsociatiiStore.getState().setFetchError('load');
    expect(usePlatformAsociatiiStore.getState().fetchError).toBe('load');
  });

  it('clears the error when passed null', () => {
    usePlatformAsociatiiStore.getState().setFetchError('load');
    usePlatformAsociatiiStore.getState().setFetchError(null);
    expect(usePlatformAsociatiiStore.getState().fetchError).toBeNull();
  });
});
