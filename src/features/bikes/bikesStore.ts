import { create } from 'zustand';
import type { Bike } from '@/shared/types/domain';
import { DEMO_BIKES } from '@/shared/demo/demoData';

interface BikesState {
  bikes: Bike[];
  add: (input: { description: string; serial: string }) => void;
  toggleAbandoned: (id: string) => void;
}

export const useBikesStore = create<BikesState>((set) => ({
  bikes: [...DEMO_BIKES],
  add: ({ description, serial }) =>
    set((s) => ({
      bikes: [
        {
          id: `bk-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          owner_user_id: 'u-res',
          owner_name: 'Popescu Andrei',
          description: description.trim(),
          serial: serial.trim() || null,
          photo_path: null,
          abandoned: false,
          created_at: new Date().toISOString(),
        },
        ...s.bikes,
      ],
    })),
  toggleAbandoned: (id) =>
    set((s) => ({
      bikes: s.bikes.map((b) => (b.id === id ? { ...b, abandoned: !b.abandoned } : b)),
    })),
}));
