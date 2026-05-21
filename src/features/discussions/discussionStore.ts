import { create } from 'zustand';
import type { DiscussionThread } from '@/shared/types/domain';
import { DEMO_DISCUSSIONS } from '@/shared/demo/demoData';

/** Demo identity of the signed-in resident (a vetted moderator for the demo). */
export const DEMO_USER = { id: 'u-res', name: 'Popescu Andrei' };

interface DiscussionState {
  threads: DiscussionThread[];
  addThread: (title: string, topic: string) => void;
  postMessage: (threadId: string, body: string) => void;
  togglePin: (threadId: string) => void;
  deleteMessage: (threadId: string, messageId: string) => void;
}

export const useDiscussionStore = create<DiscussionState>((set) => ({
  threads: [...DEMO_DISCUSSIONS],
  addThread: (title, topic) =>
    set((s) => ({
      threads: [
        {
          id: `dt-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          topic: topic.trim() || '#general',
          title: title.trim(),
          pinned: false,
          created_at: new Date().toISOString(),
          messages: [],
        },
        ...s.threads,
      ],
    })),
  postMessage: (threadId, body) =>
    set((s) => ({
      threads: s.threads.map((th) =>
        th.id === threadId
          ? {
              ...th,
              messages: [
                ...th.messages,
                {
                  id: `dm-${Date.now()}`,
                  thread_id: threadId,
                  author_user_id: DEMO_USER.id,
                  author_name: DEMO_USER.name,
                  body: body.trim(),
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : th,
      ),
    })),
  togglePin: (threadId) =>
    set((s) => ({
      threads: s.threads.map((th) => (th.id === threadId ? { ...th, pinned: !th.pinned } : th)),
    })),
  deleteMessage: (threadId, messageId) =>
    set((s) => ({
      threads: s.threads.map((th) =>
        th.id === threadId
          ? { ...th, messages: th.messages.filter((m) => m.id !== messageId) }
          : th,
      ),
    })),
}));
