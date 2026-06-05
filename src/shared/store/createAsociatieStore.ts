import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UseBoundStore, StoreApi } from 'zustand';
import { useAuthStore } from '@/shared/store/authStore';

export type AsociatieMap<T> = Record<string, T[]>;

// Minimal set signature used within extra actions -- always updates byAsociatie or fetchError
export type AsociatieSetFn<T> = (
  updater:
    | Partial<{ byAsociatie: AsociatieMap<T>; fetchError: string | null }>
    | ((s: {
        byAsociatie: AsociatieMap<T>;
        fetchError: string | null;
      }) => Partial<{ byAsociatie: AsociatieMap<T>; fetchError: string | null }>),
) => void;

export type BaseAsociatieState<T> = {
  byAsociatie: AsociatieMap<T>;
  fetchError: string | null;
  replaceForAsociatie: (asociatieId: string, items: T[]) => void;
  setFetchError: (msg: string | null) => void;
};

export type AsociatieStoreConfig<TItem, TExtra extends object = object> = {
  storeName: string;
  version: number;
  seed: () => AsociatieMap<TItem>;
  migrate: (persisted: unknown) => AsociatieMap<TItem>;
  selector: (map: AsociatieMap<TItem>, id: string | null) => TItem[];
  extraActions?: (set: AsociatieSetFn<TItem>) => TExtra;
};

/**
 * Factory for the standard per-asociatie Zustand store shape.
 *
 * Returns a tuple [useStore, useAsociatieItems] where:
 *   - useStore is the Zustand hook for the full store state
 *   - useAsociatieItems() selects items for the currently active asociatie
 *
 * The caller provides seed, migrate, selector, and any domain actions via
 * extraActions. The base shape (byAsociatie, fetchError, replaceForAsociatie,
 * setFetchError) and persist config are handled automatically.
 */
export function createAsociatieStore<TItem, TExtra extends object = object>(
  config: AsociatieStoreConfig<TItem, TExtra>,
): [UseBoundStore<StoreApi<BaseAsociatieState<TItem> & TExtra>>, () => TItem[]] {
  const { storeName, version, seed, migrate, selector, extraActions } = config;

  type FullState = BaseAsociatieState<TItem> & TExtra;

  const useStore = create<FullState>()(
    persist(
      (set) => {
        // Cast to the narrower setter type to avoid circular type issues
        // when combining the fixed base state with the caller's extra actions.
        // Safe: extraActions only ever reads/updates byAsociatie and fetchError.
        const narrowSet = set as unknown as AsociatieSetFn<TItem>;

        const base: BaseAsociatieState<TItem> = {
          byAsociatie: seed(),
          fetchError: null,
          replaceForAsociatie: (asociatieId, items) =>
            narrowSet((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: items } })),
          setFetchError: (msg) => narrowSet({ fetchError: msg }),
        };

        const extra = extraActions ? extraActions(narrowSet) : ({} as TExtra);

        return { ...base, ...extra } as FullState;
      },
      {
        name: storeName,
        version,
        partialize: (s) => ({ byAsociatie: s.byAsociatie }),
        migrate: (persisted) =>
          ({ byAsociatie: migrate(persisted) }) as unknown as FullState,
      },
    ),
  );

  function useAsociatieItems(): TItem[] {
    const asociatieId = useAuthStore((s) => s.currentAsociatieId);
    return useStore((s) => selector(s.byAsociatie, asociatieId));
  }

  return [useStore, useAsociatieItems];
}
