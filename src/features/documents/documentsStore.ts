import { create } from 'zustand';
import type { DocumentRecord } from '@/shared/types/domain';
import { DEMO_DOCUMENTS } from '@/shared/demo/demoData';

interface NewDocument {
  title: string;
  category: string;
  content_text: string;
}

interface DocumentsState {
  documents: DocumentRecord[];
  add: (input: NewDocument) => void;
}

export const useDocumentsStore = create<DocumentsState>((set) => ({
  documents: [...DEMO_DOCUMENTS],
  add: ({ title, category, content_text }) =>
    set((s) => ({
      documents: [
        {
          id: `doc-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          category,
          title: title.trim(),
          storage_path: null,
          version: 1,
          content_text: content_text.trim() || null,
          created_at: new Date().toISOString(),
        },
        ...s.documents,
      ],
    })),
}));
