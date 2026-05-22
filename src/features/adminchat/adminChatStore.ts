import { create } from 'zustand';
import type { PrivateThread } from '@/shared/types/domain';
import { DEMO_PRIVATE_THREADS } from '@/shared/demo/demoData';
import { toggledStatus } from './adminChatLogic';

/** Demo identity of the signed-in resident. */
export const DEMO_USER = { id: 'u-res', name: 'Popescu Andrei' };

interface AdminChatState {
  threads: PrivateThread[];
  startThread: (subject: string, body: string) => void;
  reply: (threadId: string, body: string) => void;
  markRead: (threadId: string) => void;
  toggleStatus: (threadId: string) => void;
}

export const useAdminChatStore = create<AdminChatState>((set) => ({
  threads: [...DEMO_PRIVATE_THREADS],
  startThread: (subject, body) =>
    set((s) => {
      const id = `pt-${Date.now()}`;
      const now = new Date().toISOString();
      const thread: PrivateThread = {
        id,
        asociatie_id: 'demo-asoc',
        resident_user_id: DEMO_USER.id,
        resident_name: DEMO_USER.name,
        subject: subject.trim(),
        status: 'open',
        created_at: now,
        messages: [
          {
            id: `pm-${Date.now()}`,
            thread_id: id,
            sender: 'resident',
            sender_name: DEMO_USER.name,
            body: body.trim(),
            created_at: now,
            read: true,
          },
        ],
      };
      return { threads: [thread, ...s.threads] };
    }),
  reply: (threadId, body) =>
    set((s) => ({
      threads: s.threads.map((th) =>
        th.id === threadId
          ? {
              ...th,
              status: 'open',
              messages: [
                ...th.messages,
                {
                  id: `pm-${Date.now()}`,
                  thread_id: threadId,
                  sender: 'resident',
                  sender_name: DEMO_USER.name,
                  body: body.trim(),
                  created_at: new Date().toISOString(),
                  read: true,
                },
              ],
            }
          : th,
      ),
    })),
  markRead: (threadId) =>
    set((s) => ({
      threads: s.threads.map((th) =>
        th.id === threadId
          ? {
              ...th,
              messages: th.messages.map((m) =>
                m.sender === 'admin' ? { ...m, read: true } : m,
              ),
            }
          : th,
      ),
    })),
  toggleStatus: (threadId) =>
    set((s) => ({
      threads: s.threads.map((th) =>
        th.id === threadId ? { ...th, status: toggledStatus(th.status) } : th,
      ),
    })),
}));
