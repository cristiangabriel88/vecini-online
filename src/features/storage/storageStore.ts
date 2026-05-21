import { create } from 'zustand';
import type { StorageUnit } from '@/shared/types/domain';
import { DEMO_STORAGE_UNITS } from '@/shared/demo/demoData';

interface NewStorageUnit {
  label: string;
  apartment_label: string;
  notes: string;
}

interface StorageState {
  units: StorageUnit[];
  add: (input: NewStorageUnit) => void;
}

export const useStorageStore = create<StorageState>((set) => ({
  units: [...DEMO_STORAGE_UNITS],
  add: ({ label, apartment_label, notes }) =>
    set((s) => {
      const apt = apartment_label.trim();
      return {
        units: [
          {
            id: `su-${Date.now()}`,
            asociatie_id: 'demo-asoc',
            label: label.trim(),
            apartment_id: apt ? `ap-${apt}` : null,
            apartment_label: apt || null,
            notes: notes.trim() || null,
          },
          ...s.units,
        ],
      };
    }),
}));
