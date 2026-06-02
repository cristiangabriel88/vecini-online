import type { ResidentPost, ResidentPostCategory } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useLocatorStore, type NewResidentPostInput } from './locatorStore';

/* Dual-mode neighbour-posts repository (F06, T186). The zustand store is the
   synchronous source of truth the page reads; these functions apply each change
   there and, when a backend is configured, mirror it to `resident_posts` under
   RLS (members read; the author manages their own post).

   The demo/offline store stays the default when Supabase is absent. */

interface PostRow {
  id: string;
  asociatie_id: string;
  author_user_id: string | null;
  category: string | null;
  title: string | null;
  body: string | null;
  photo_path: string | null;
  expires_at: string | null;
  created_at: string;
  author: { full_name: string | null } | null;
}

/** Hydrate the neighbour posts for one asociație from the backend, when
 *  configured. The demo store is the source of truth if the read fails or the
 *  backend is absent. */
export async function hydrateLocator(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useLocatorStore.getState();
  try {
    const { data, error } = await supabase
      .from('resident_posts')
      .select(
        'id, asociatie_id, author_user_id, category, title, body, photo_path, expires_at, created_at, author:users(full_name)',
      )
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'locatorApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    // A single-FK embed resolves to one object at runtime; the generated types
    // widen it to an array, so cast through unknown.
    const items: ResidentPost[] = (data as unknown as PostRow[]).map((r) => ({
      id: r.id,
      asociatie_id: r.asociatie_id,
      author_user_id: r.author_user_id ?? '',
      author_name: r.author?.full_name ?? '',
      category: (r.category ?? 'info') as ResidentPostCategory,
      title: r.title ?? '',
      body: r.body ?? '',
      photo_path: r.photo_path,
      expires_at: r.expires_at ?? r.created_at,
      created_at: r.created_at,
    }));
    store.setFetchError(null);
    store.replace(items);
  } catch (err) {
    reportError(err, { source: 'locatorApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Publish a neighbour post: updates the store and mirrors to `resident_posts`
 *  when a backend is configured. Returns the recorded post. */
export function createPost(
  asociatieId: string,
  author: { id: string; name: string },
  input: NewResidentPostInput,
): ResidentPost {
  const post = useLocatorStore.getState().add(asociatieId, author, input);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('resident_posts').insert({
          id: post.id,
          asociatie_id: post.asociatie_id,
          author_user_id: post.author_user_id,
          category: post.category,
          title: post.title,
          body: post.body,
          photo_path: post.photo_path,
          expires_at: post.expires_at,
          created_at: post.created_at,
        });
      } catch (err) {
        reportError(err, { source: 'locatorApi.create' });
      }
    })();
  }
  return post;
}
