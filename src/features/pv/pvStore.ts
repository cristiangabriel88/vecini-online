import { create } from 'zustand';
import type { PvDocument } from '@/shared/types/domain';
import { DEMO_PV_DOCUMENTS } from '@/shared/demo/demoData';

interface PvState {
  docs: PvDocument[];
  add: (input: { title: string; doc_date: string; category: string; content_text: string }) => void;
}

export const usePvStore = create<PvState>((set) => ({
  docs: [...DEMO_PV_DOCUMENTS],
  add: ({ title, doc_date, category, content_text }) =>
    set((s) => ({
      docs: [
        {
          id: `pv-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          title: title.trim(),
          doc_date,
          category: category.trim() || 'Altele',
          content_text: content_text.trim(),
          storage_path: null,
          created_at: new Date().toISOString(),
        },
        ...s.docs,
      ],
    })),
}));
