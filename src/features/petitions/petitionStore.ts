import { create } from 'zustand';
import type { Petition } from '@/shared/types/domain';
import { DEMO_PETITIONS } from '@/shared/demo/demoData';
import { isThresholdReached } from './petitionLogic';

const CURRENT_USER_ID = 'u-res';
const CURRENT_USER_NAME = 'Popescu Andrei';
const DEMO_APARTMENT_COUNT = 5;

interface NewPetition {
  title: string;
  body: string;
}

interface PetitionState {
  petitions: Petition[];
  signed: string[];
  create: (input: NewPetition) => void;
  /** Add the current user's signature once; flips status when threshold is met. */
  sign: (id: string) => void;
}

export const usePetitionStore = create<PetitionState>((set, get) => ({
  petitions: [...DEMO_PETITIONS],
  signed: [],
  create: ({ title, body }) => {
    const id = `pt-${Date.now()}`;
    set((s) => ({
      petitions: [
        {
          id,
          asociatie_id: 'demo-asoc',
          author_user_id: CURRENT_USER_ID,
          author_name: CURRENT_USER_NAME,
          title: title.trim(),
          body: body.trim(),
          threshold_percent: 25,
          status: 'deschisa',
          created_at: new Date().toISOString(),
          signatures: 1,
          total_apartments: DEMO_APARTMENT_COUNT,
        },
        ...s.petitions,
      ],
      signed: [...s.signed, id],
    }));
  },
  sign: (id) => {
    if (get().signed.includes(id)) return;
    set((s) => ({
      signed: [...s.signed, id],
      petitions: s.petitions.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, signatures: p.signatures + 1 };
        return { ...updated, status: isThresholdReached(updated) ? 'inaintata' : updated.status };
      }),
    }));
  },
}));
