import { create } from 'zustand';
import type { Idea } from '@/shared/types/domain';
import { DEMO_IDEAS } from '@/shared/demo/demoData';

interface IdeasState {
  items: Idea[];
  myVotes: Record<string, boolean>; // ideaId -> voted (one per apartament)
  add: (input: { title: string; body: string }) => void;
  toggleVote: (id: string) => void;
}

export const useIdeasStore = create<IdeasState>((set, get) => ({
  items: [...DEMO_IDEAS],
  myVotes: {},
  add: ({ title, body }) =>
    set((s) => ({
      items: [
        {
          id: `idea-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          author_user_id: 'u-res',
          author_name: 'Popescu Andrei',
          title,
          body,
          status: 'in_discutie',
          votes: 1,
          created_at: new Date().toISOString(),
        },
        ...s.items,
      ],
      myVotes: { ...s.myVotes },
    })),
  toggleVote: (id) => {
    const voted = get().myVotes[id];
    set((s) => ({
      myVotes: { ...s.myVotes, [id]: !voted },
      items: s.items.map((i) =>
        i.id === id ? { ...i, votes: i.votes + (voted ? -1 : 1) } : i,
      ),
    }));
  },
}));
