import { create } from 'zustand';
import type { KeyRecord } from '@/shared/types/domain';
import { DEMO_KEYS } from '@/shared/demo/demoData';

interface NewKey {
  space: string;
  holder: string;
  notes: string;
}

interface KeysState {
  keys: KeyRecord[];
  add: (input: NewKey) => void;
  /** Record a handover by updating the holder of a key. */
  handover: (id: string, newHolder: string) => void;
}

export const useKeysStore = create<KeysState>((set) => ({
  keys: [...DEMO_KEYS],
  add: ({ space, holder, notes }) =>
    set((s) => ({
      keys: [
        {
          id: `key-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          space: space.trim(),
          holder_name: holder.trim(),
          notes: notes.trim() || null,
        },
        ...s.keys,
      ],
    })),
  handover: (id, newHolder) =>
    set((s) => ({
      keys: s.keys.map((k) => (k.id === id ? { ...k, holder_name: newHolder.trim() } : k)),
    })),
}));
