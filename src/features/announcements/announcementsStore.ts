import { create } from 'zustand';
import type { Announcement, AnnouncementCategory } from '@/shared/types/domain';
import { DEMO_ANNOUNCEMENTS } from '@/shared/demo/demoData';

interface AnnouncementsState {
  items: Announcement[];
  reads: Record<string, boolean>;
  add: (input: { title: string; body_html: string; category: AnnouncementCategory }) => void;
  markRead: (id: string) => void;
}

export const useAnnouncementsStore = create<AnnouncementsState>((set) => ({
  items: [...DEMO_ANNOUNCEMENTS],
  reads: {},
  add: ({ title, body_html, category }) =>
    set((s) => ({
      items: [
        {
          id: `an-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          author_user_id: 'u-admin',
          title,
          body_html,
          category,
          audience: { type: 'all' },
          scheduled_at: null,
          published_at: new Date().toISOString(),
          expires_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...s.items,
      ],
    })),
  markRead: (id) => set((s) => ({ reads: { ...s.reads, [id]: true } })),
}));
