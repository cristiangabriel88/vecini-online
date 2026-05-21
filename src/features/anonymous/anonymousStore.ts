import { create } from 'zustand';
import type { AnonymousMessage } from '@/shared/types/domain';
import { DEMO_ANONYMOUS_MESSAGES } from '@/shared/demo/demoData';
import { toggledStatus } from './anonymousLogic';

interface AnonymousState {
  messages: AnonymousMessage[];
  add: (body: string) => void;
  toggleStatus: (id: string) => void;
}

export const useAnonymousStore = create<AnonymousState>((set) => ({
  messages: [...DEMO_ANONYMOUS_MESSAGES],
  add: (body) =>
    set((s) => ({
      messages: [
        {
          id: `an-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          sender_user_id: 'u-res',
          body: body.trim(),
          status: 'nou',
          created_at: new Date().toISOString(),
        },
        ...s.messages,
      ],
    })),
  toggleStatus: (id) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, status: toggledStatus(m.status) } : m,
      ),
    })),
}));
