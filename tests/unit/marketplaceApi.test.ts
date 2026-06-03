import { describe, it, expect, beforeEach } from 'vitest';
import { useMarketplaceStore } from '@/features/marketplace/marketplaceStore';
import { hydrateListings, addListingLive } from '@/features/marketplace/marketplaceApi';

const DEMO_ID = 'demo-asoc';

beforeEach(() => {
  useMarketplaceStore.setState({ byAsociatie: { [DEMO_ID]: [] }, fetchError: null });
});

describe('marketplaceApi — offline path', () => {
  it('hydrateListings is a no-op when unconfigured', async () => {
    await hydrateListings(DEMO_ID);
    expect(useMarketplaceStore.getState().fetchError).toBeNull();
  });

  it('hydrateListings is a no-op when id is empty', async () => {
    await hydrateListings('');
    expect(useMarketplaceStore.getState().byAsociatie[DEMO_ID]).toEqual([]);
  });

  it('addListingLive prepends to the store synchronously', () => {
    const item = {
      id: 'ml-t1',
      asociatie_id: DEMO_ID,
      seller_user_id: 'u1',
      seller_name: 'Test User',
      category: 'mobilă',
      title: 'Canapea',
      description: '',
      price: null,
      photo_path: null,
      expires_at: '2099-01-01T00:00:00Z',
      created_at: '2026-06-01T00:00:00Z',
    };
    addListingLive(DEMO_ID, item);
    const listings = useMarketplaceStore.getState().byAsociatie[DEMO_ID];
    expect(listings[0]).toEqual(item);
  });
});
