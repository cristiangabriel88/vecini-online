import { create } from 'zustand';
import type { Pet } from '@/shared/types/domain';
import { DEMO_PETS } from '@/shared/demo/demoData';

interface PetsState {
  pets: Pet[];
  add: (input: { name: string; species: string; emergencyContact: string }) => void;
  toggleLost: (id: string) => void;
}

export const usePetsStore = create<PetsState>((set) => ({
  pets: [...DEMO_PETS],
  add: ({ name, species, emergencyContact }) =>
    set((s) => ({
      pets: [
        {
          id: `pet-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          owner_user_id: 'u-res',
          owner_name: 'Popescu Andrei',
          name: name.trim(),
          species: species.trim(),
          photo_path: null,
          emergency_contact: emergencyContact.trim() || null,
          lost: false,
          created_at: new Date().toISOString(),
        },
        ...s.pets,
      ],
    })),
  toggleLost: (id) =>
    set((s) => ({ pets: s.pets.map((p) => (p.id === id ? { ...p, lost: !p.lost } : p)) })),
}));
