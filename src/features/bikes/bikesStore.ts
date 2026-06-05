import type { Bike } from '@/shared/types/domain';
import { createAsociatieStore } from '@/shared/store/createAsociatieStore';
import {
  seedBikes,
  bikesForAsociatie,
  addBikeIn,
  toggleAbandonedIn,
  migrateBikesState,
} from './bikeLogic';

const [useBikesStore, useAsociatieBikes] = createAsociatieStore<
  Bike,
  {
    addBike: (asociatieId: string, bike: Bike) => void;
    toggleAbandoned: (asociatieId: string, id: string) => void;
  }
>({
  storeName: 'vecini.bikes',
  version: 1,
  seed: seedBikes,
  migrate: migrateBikesState,
  selector: bikesForAsociatie,
  extraActions: (set) => ({
    addBike: (asociatieId, bike) =>
      set((s) => ({ byAsociatie: addBikeIn(s.byAsociatie, asociatieId, bike) })),
    toggleAbandoned: (asociatieId, id) =>
      set((s) => ({ byAsociatie: toggleAbandonedIn(s.byAsociatie, asociatieId, id) })),
  }),
});

export { useBikesStore, useAsociatieBikes };
