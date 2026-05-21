import { create } from 'zustand';
import type { ParkingSpot } from '@/shared/types/domain';
import { DEMO_PARKING } from '@/shared/demo/demoData';

interface NewSpot {
  label: string;
  zone: string;
  isVisitor: boolean;
  apartmentLabel: string;
  licensePlate: string;
}

interface ParkingState {
  spots: ParkingSpot[];
  add: (input: NewSpot) => void;
}

export const useParkingStore = create<ParkingState>((set) => ({
  spots: [...DEMO_PARKING],
  add: ({ label, zone, isVisitor, apartmentLabel, licensePlate }) =>
    set((s) => ({
      spots: [
        {
          id: `pk-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          label: label.trim(),
          zone: zone.trim() || null,
          is_visitor: isVisitor,
          apartment_label: apartmentLabel.trim() || null,
          license_plate: licensePlate.trim() || null,
        },
        ...s.spots,
      ],
    })),
}));
