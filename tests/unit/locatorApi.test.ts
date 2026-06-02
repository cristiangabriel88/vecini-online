import { beforeEach, describe, expect, it } from 'vitest';
import type { ResidentPost } from '@/shared/types/domain';
import { useLocatorStore } from '@/features/locator/locatorStore';
import { hydrateLocator, createPost } from '@/features/locator/locatorApi';

// locatorApi offline-path tests (T186). Live-path tests require a real Supabase
// backend; CI exercises the offline path (isSupabaseConfigured === false).

const SEED: ResidentPost[] = [
  { id: 'rp-seed', asociatie_id: 'a', author_user_id: 'u-1', author_name: 'Ion', category: 'info', title: 'Seed', body: 'Seed body', photo_path: null, expires_at: '2099-01-01T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z' },
];

beforeEach(() => {
  useLocatorStore.setState({ items: [...SEED], fetchError: null });
});

describe('hydrateLocator', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useLocatorStore.getState().items;
    await hydrateLocator('a');
    expect(useLocatorStore.getState().items).toBe(before);
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useLocatorStore.getState().items;
    await hydrateLocator('');
    expect(useLocatorStore.getState().items).toBe(before);
  });
});

describe('createPost', () => {
  it('prepends a well-formed post authored by the given user and returns it', () => {
    const post = createPost(
      'a',
      { id: 'u-2', name: 'Maria' },
      { title: 'Vând masă', body: 'Stare bună', category: 'vand' },
    );
    const items = useLocatorStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items[0]).toBe(post);
    expect(post.author_user_id).toBe('u-2');
    expect(post.author_name).toBe('Maria');
    expect(post.category).toBe('vand');
    expect(new Date(post.expires_at).getTime()).toBeGreaterThan(new Date(post.created_at).getTime());
  });
});
