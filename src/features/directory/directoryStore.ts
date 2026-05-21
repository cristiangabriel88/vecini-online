import { create } from 'zustand';
import type { DirectoryEntry } from '@/shared/types/domain';
import { DEMO_DIRECTORY, DEMO_MY_DIRECTORY } from '@/shared/demo/demoData';

type ConsentField = 'show_name' | 'show_apartment' | 'show_phone' | 'show_email';

interface DirectoryState {
  entries: DirectoryEntry[];
  myId: string;
  toggle: (field: ConsentField) => void;
}

export const useDirectoryStore = create<DirectoryState>((set) => ({
  entries: [...DEMO_DIRECTORY],
  myId: DEMO_MY_DIRECTORY.id,
  toggle: (field) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === s.myId ? { ...e, [field]: !e[field] } : e,
      ),
    })),
}));
