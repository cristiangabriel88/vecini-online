import type { MarketplaceListing } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useMarketplaceStore } from './marketplaceStore';

interface ListingRow {
  id: string;
  asociatie_id: string;
  seller_user_id: string | null;
  seller_name: string | null;
  category: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  photo_path: string | null;
  expires_at: string | null;
  created_at: string;
}

function rowToListing(row: ListingRow): MarketplaceListing {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    seller_user_id: row.seller_user_id ?? '',
    seller_name: row.seller_name ?? '',
    category: row.category ?? 'altele',
    title: row.title ?? '',
    description: row.description ?? '',
    price: row.price,
    photo_path: row.photo_path,
    expires_at: row.expires_at ?? new Date().toISOString(),
    created_at: row.created_at,
  };
}

export async function hydrateListings(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useMarketplaceStore.getState();
  try {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('id,asociatie_id,seller_user_id,seller_name,category,title,description,price,photo_path,expires_at,created_at')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'marketplaceApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, (data as ListingRow[]).map(rowToListing));
  } catch (err) {
    reportError(err, { source: 'marketplaceApi.hydrate' });
    store.setFetchError('load');
  }
}

export function addListingLive(asociatieId: string, item: MarketplaceListing): void {
  useMarketplaceStore.getState().addListing(asociatieId, item);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('marketplace_listings').insert({
        id: item.id,
        asociatie_id: asociatieId,
        seller_user_id: item.seller_user_id,
        seller_name: item.seller_name,
        category: item.category,
        title: item.title,
        description: item.description,
        price: item.price,
        expires_at: item.expires_at,
      });
    } catch (err) {
      reportError(err, { source: 'marketplaceApi.add' });
    }
  })();
}
