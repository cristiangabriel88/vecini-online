import { create } from 'zustand';
import type { AnonymousMessage, AnonymousStatus } from '@/shared/types/domain';
import { DEMO_ANONYMOUS_MESSAGES } from '@/shared/demo/demoData';
import { toggledStatus } from './anonymousLogic';

interface AnonymousState {
  messages: AnonymousMessage[];
  /** Offline demo path: prepend a new message with demo-scoped ids. */
  add: (body: string) => void;
  /** Offline demo path: toggle between 'nou' and 'rezolvat'. */
  toggleStatus: (id: string) => void;
  /** Live path: replace the entire list after a hydration read. */
  replaceAll: (messages: AnonymousMessage[]) => void;
  /** Live path: set a specific status (not toggle) on a message. */
  setStatus: (id: string, status: AnonymousStatus) => void;
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
  replaceAll: (messages) => set({ messages }),
  setStatus: (id, status) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, status } : m)),
    })),
}));
