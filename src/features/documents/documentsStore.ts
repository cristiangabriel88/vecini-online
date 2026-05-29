import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DocumentRecord } from '@/shared/types/domain';
import { DEMO_DOCUMENTS } from '@/shared/demo/demoData';

export interface NewDocument {
  title: string;
  category: string;
  content_text: string;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  file_data_url?: string | null;
}

interface DocumentsState {
  documents: DocumentRecord[];
  add: (asociatieId: string, input: NewDocument) => void;
  addRecord: (record: DocumentRecord) => void;
  remove: (id: string) => void;
  replaceForAsociatie: (asociatieId: string, records: DocumentRecord[]) => void;
}

export const useDocumentsStore = create<DocumentsState>()(
  persist(
    (set) => ({
      documents: [...DEMO_DOCUMENTS],
      add: (asociatieId, { title, category, content_text, file_name, file_size, file_type, file_data_url }) =>
        set((s) => ({
          documents: [
            {
              id: `doc-${Date.now()}`,
              asociatie_id: asociatieId,
              category,
              title: title.trim(),
              storage_path: null,
              file_name: file_name ?? null,
              file_size: file_size ?? null,
              file_type: file_type ?? null,
              file_data_url: file_data_url ?? null,
              version: 1,
              content_text: content_text.trim() || null,
              created_at: new Date().toISOString(),
            },
            ...s.documents,
          ],
        })),
      addRecord: (record) =>
        set((s) => ({ documents: [record, ...s.documents] })),
      remove: (id) =>
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
      replaceForAsociatie: (asociatieId, records) =>
        set((s) => ({
          documents: [
            ...records,
            ...s.documents.filter((d) => d.asociatie_id !== asociatieId),
          ],
        })),
    }),
    {
      name: 'vecini.documents',
      version: 1,
      migrate(old: unknown, version: number) {
        if (version === 0) {
          const state = old as { documents: DocumentRecord[] };
          return {
            ...state,
            documents: state.documents.map((d) => ({
              ...d,
              file_name: (d as DocumentRecord).file_name ?? null,
              file_size: (d as DocumentRecord).file_size ?? null,
              file_type: (d as DocumentRecord).file_type ?? null,
              file_data_url: (d as DocumentRecord).file_data_url ?? null,
            })),
          };
        }
        return old as DocumentsState;
      },
    },
  ),
);
