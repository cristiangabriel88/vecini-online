import { create } from 'zustand';
import type { EvacuationPlan, PetMarker } from '@/shared/types/domain';
import { DEMO_APARTMENTS, DEMO_EVACUATION_PLANS, DEMO_PET_MARKERS } from '@/shared/demo/demoData';

/** The demo resident lives in ap-2 (Popescu Andrei, Ap. 5). */
const CURRENT_APARTMENT_ID = 'ap-2';
const CURRENT_USER_ID = 'u-res';

function apartmentLabel(id: string): string {
  const ap = DEMO_APARTMENTS.find((a) => a.id === id);
  return ap ? `Ap. ${ap.numar_apartament} (et. ${ap.etaj})` : id;
}

interface EvacuationState {
  plans: EvacuationPlan[];
  markers: PetMarker[];
  currentApartmentId: string;
  /** Add or replace this apartment's pet marker. */
  setMyMarker: (species: string) => void;
  /** Remove this apartment's pet marker. */
  clearMyMarker: () => void;
}

export const useEvacuationStore = create<EvacuationState>((set) => ({
  plans: DEMO_EVACUATION_PLANS.map((p) => ({ ...p, equipment: p.equipment.map((e) => ({ ...e })) })),
  markers: DEMO_PET_MARKERS.map((m) => ({ ...m })),
  currentApartmentId: CURRENT_APARTMENT_ID,
  setMyMarker: (species) =>
    set((s) => {
      const without = s.markers.filter((m) => m.apartment_id !== CURRENT_APARTMENT_ID);
      return {
        markers: [
          ...without,
          {
            id: `pm-${Date.now()}`,
            asociatie_id: 'demo-asoc',
            apartment_id: CURRENT_APARTMENT_ID,
            apartment_label: apartmentLabel(CURRENT_APARTMENT_ID),
            species,
            user_id: CURRENT_USER_ID,
          },
        ],
      };
    }),
  clearMyMarker: () =>
    set((s) => ({ markers: s.markers.filter((m) => m.apartment_id !== CURRENT_APARTMENT_ID) })),
}));
