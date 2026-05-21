import { create } from 'zustand';
import type { WikiPage } from '@/shared/types/domain';
import { DEMO_WIKI } from '@/shared/demo/demoData';
import { slugify } from './wikiLogic';

interface WikiState {
  pages: WikiPage[];
  add: (title: string, body: string) => void;
  update: (id: string, title: string, body: string) => void;
}

export const useWikiStore = create<WikiState>((set) => ({
  pages: [...DEMO_WIKI],
  add: (title, body) =>
    set((s) => ({
      pages: [
        {
          id: `wk-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          slug: slugify(title),
          title: title.trim(),
          body_md: body.trim(),
          updated_at: new Date().toISOString(),
        },
        ...s.pages,
      ],
    })),
  update: (id, title, body) =>
    set((s) => ({
      pages: s.pages.map((p) =>
        p.id === id
          ? { ...p, title: title.trim(), body_md: body.trim(), updated_at: new Date().toISOString() }
          : p,
      ),
    })),
}));
