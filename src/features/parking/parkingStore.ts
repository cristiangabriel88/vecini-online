import type { ParkingSpot } from '@/shared/types/domain';
import { createAsociatieStore } from '@/shared/store/createAsociatieStore';
import {
  seedParking,
  parkingForAsociatie,
  addParkingIn,
  migrateParkingState,
} from './parkingLogic';

const [useParkingStore, useAsociatieParking] = createAsociatieStore<
  ParkingSpot,
  {
    addSpot: (asociatieId: string, spot: ParkingSpot) => void;
  }
>({
  storeName: 'vecini.parking',
  version: 1,
  seed: seedParking,
  migrate: migrateParkingState,
  selector: parkingForAsociatie,
  extraActions: (set) => ({
    addSpot: (asociatieId, spot) =>
      set((s) => ({ byAsociatie: addParkingIn(s.byAsociatie, asociatieId, spot) })),
  }),
});

export { useParkingStore, useAsociatieParking };
