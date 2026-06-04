import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupportMessage, SupportSender, SupportThread } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_CURRENT_USER_ID, DEMO_CURRENT_USER_NAME } from '@/shared/demo/demoData';
import { useAuthStore } from '@/shared/store/authStore';

const DEMO_THREADS: SupportThread[] = [
  {
    id: 'st-demo-1',
    asociatie_id: DEMO_ASOCIATIE.id,
    asociatie_name: DEMO_ASOCIATIE.name,
    admin_user_id: DEMO_CURRENT_USER_ID,
    admin_name: DEMO_CURRENT_USER_NAME,
    subject: 'Eroare la activarea funcționalității de sesizări',
    status: 'open',
    created_at: '2026-06-01T10:00:00Z',
    messages: [
      {
        id: 'sm-demo-1-1',
        thread_id: 'st-demo-1',
        sender: 'admin',
        sender_name: DEMO_CURRENT_USER_NAME,
        body: 'Bună ziua! Încerc să activez funcționalitatea de sesizări, dar primesc o eroare de configurare. Cum procedez?',
        created_at: '2026-06-01T10:00:00Z',
        read: true,
      },
      {
        id: 'sm-demo-1-2',
        thread_id: 'st-demo-1',
        sender: 'superadmin',
        sender_name: 'Platformă vecini.online',
        body: 'Bună ziua! Funcționalitatea poate fi activată din Admin > Funcționalități. Dacă eroarea persistă, vă rugăm să ne trimiteți mai multe detalii.',
        created_at: '2026-06-01T11:30:00Z',
        read: false,
      },
    ],
  },
];

function mapThread(
  threads: SupportThread[],
  id: string,
  fn: (t: SupportThread) => SupportThread,
): SupportThread[] {
  return threads.map((t) => (t.id === id ? fn(t) : t));
}

interface SupportState {
  threads: SupportThread[];
  replaceAll: (threads: SupportThread[]) => void;
  startThread: (asociatieId: string, asociatieName: string, adminUserId: string, adminName: string, subject: string, body: string) => SupportThread;
  reply: (threadId: string, sender: SupportSender, senderName: string, body: string) => void;
  markRead: (threadId: string, viewer: SupportSender) => void;
  toggleStatus: (threadId: string) => void;
}

export const useSupportStore = create<SupportState>()(
  persist(
    (set) => ({
      threads: DEMO_THREADS,
      replaceAll: (threads) => set({ threads }),
      startThread: (asociatieId, asociatieName, adminUserId, adminName, subject, body) => {
        const now = new Date().toISOString();
        const id = `st-${Date.now()}`;
        const thread: SupportThread = {
          id,
          asociatie_id: asociatieId,
          asociatie_name: asociatieName,
          admin_user_id: adminUserId,
          admin_name: adminName,
          subject: subject.trim(),
          status: 'open',
          created_at: now,
          messages: [
            {
              id: `sm-${Date.now()}`,
              thread_id: id,
              sender: 'admin',
              sender_name: adminName,
              body: body.trim(),
              created_at: now,
              read: false,
            },
          ],
        };
        set((s) => ({ threads: [thread, ...s.threads] }));
        return thread;
      },
      reply: (threadId, sender, senderName, body) =>
        set((s) => ({
          threads: mapThread(s.threads, threadId, (t) => {
            const message: SupportMessage = {
              id: `sm-${Date.now()}`,
              thread_id: threadId,
              sender,
              sender_name: senderName,
              body: body.trim(),
              created_at: new Date().toISOString(),
              read: false,
            };
            return { ...t, status: 'open', messages: [...t.messages, message] };
          }),
        })),
      markRead: (threadId, viewer) =>
        set((s) => ({
          threads: mapThread(s.threads, threadId, (t) => ({
            ...t,
            messages: t.messages.map((m) =>
              m.sender !== viewer ? { ...m, read: true } : m,
            ),
          })),
        })),
      toggleStatus: (threadId) =>
        set((s) => ({
          threads: mapThread(s.threads, threadId, (t) => ({
            ...t,
            status: t.status === 'open' ? 'resolved' : 'open',
          })),
        })),
    }),
    { name: 'vecini.support', version: 1 },
  ),
);

/** Hook: threads for the currently active asociație only. */
export function useAsociatieSupportThreads(): SupportThread[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useSupportStore((s) =>
    asociatieId ? s.threads.filter((t) => t.asociatie_id === asociatieId) : [],
  );
}

