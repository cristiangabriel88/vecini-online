import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PrivateMessage, PrivateSender, PrivateThread } from '@/shared/types/domain';
import { DEMO_PRIVATE_THREADS } from '@/shared/demo/demoData';
import { useAuthStore } from '@/shared/store/authStore';
import { counterpartOf, toggledStatus } from './adminChatLogic';

export type ThreadsByAsociatie = Record<string, PrivateThread[]>;

/** Shared frozen empty list so selectors keep a stable reference (no churn). */
const EMPTY: PrivateThread[] = Object.freeze([] as PrivateThread[]) as PrivateThread[];

/** Seed the demo asociație so the offline inbox is populated and explorable. */
function seedThreads(): ThreadsByAsociatie {
  const byAsociatie: ThreadsByAsociatie = {};
  for (const th of DEMO_PRIVATE_THREADS) {
    (byAsociatie[th.asociatie_id] ??= []).push(th);
  }
  return byAsociatie;
}

function listFor(byAsociatie: ThreadsByAsociatie, asociatieId: string | null): PrivateThread[] {
  if (!asociatieId) return EMPTY;
  return byAsociatie[asociatieId] ?? EMPTY;
}

/** Who/what a new thread is opened about. The resident party is recorded on the
 *  thread either way: a resident opens about themselves; an administrator opens
 *  about the apartment they picked. */
export interface NewThreadInput {
  subject: string;
  body: string;
  residentUserId: string;
  residentName: string;
  apartmentLabel?: string;
}

interface AdminChatState {
  /** Private threads per asociație, keyed by asociație id. */
  byAsociatie: ThreadsByAsociatie;
  /** Replace the whole list for an asociație (used to hydrate from the backend). */
  replaceAll: (asociatieId: string, threads: PrivateThread[]) => void;
  /** Open a new thread, authored by `sender`. Returns the created thread. */
  startThread: (asociatieId: string, sender: PrivateSender, input: NewThreadInput) => PrivateThread;
  /** Append a reply to a thread, authored by `sender`, and reopen it. */
  reply: (
    asociatieId: string,
    threadId: string,
    sender: PrivateSender,
    senderName: string,
    body: string,
  ) => void;
  /** Mark the other party's messages as read, from `viewer`'s perspective. */
  markRead: (asociatieId: string, threadId: string, viewer: PrivateSender) => void;
  toggleStatus: (asociatieId: string, threadId: string) => void;
  forAsociatie: (asociatieId: string | null) => PrivateThread[];
}

function mapThread(
  byAsociatie: ThreadsByAsociatie,
  asociatieId: string,
  threadId: string,
  fn: (thread: PrivateThread) => PrivateThread,
): ThreadsByAsociatie {
  return {
    ...byAsociatie,
    [asociatieId]: (byAsociatie[asociatieId] ?? []).map((th) => (th.id === threadId ? fn(th) : th)),
  };
}

/**
 * Private messaging store (F04), the synchronous source of truth the role-aware
 * inbox reads. The demo asociație is seeded so the offline app is populated, and
 * it is persisted so a conversation started offline survives a reload. With a
 * backend present, the dual-mode repository in `adminChatApi.ts` mirrors writes
 * to the `private_threads` / `private_messages` tables and hydrates reads back
 * into this store. RLS keeps a resident's threads private to them and the
 * administrator; this store does not itself filter by role, the page does.
 */
export const useAdminChatStore = create<AdminChatState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedThreads(),
      replaceAll: (asociatieId, threads) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: threads } })),
      startThread: (asociatieId, sender, input) => {
        const id = `pt-${Date.now()}`;
        const now = new Date().toISOString();
        const thread: PrivateThread = {
          id,
          asociatie_id: asociatieId,
          resident_user_id: input.residentUserId,
          resident_name: input.residentName,
          apartment_label: input.apartmentLabel,
          subject: input.subject.trim(),
          status: 'open',
          created_at: now,
          messages: [
            {
              id: `pm-${Date.now()}`,
              thread_id: id,
              sender,
              sender_name: sender === 'admin' ? 'Administrator' : input.residentName,
              body: input.body.trim(),
              created_at: now,
              // The author has read their own message; the recipient has not yet.
              read: false,
            },
          ],
        };
        set((s) => ({
          byAsociatie: { ...s.byAsociatie, [asociatieId]: [thread, ...(s.byAsociatie[asociatieId] ?? [])] },
        }));
        return thread;
      },
      reply: (asociatieId, threadId, sender, senderName, body) =>
        set((s) => ({
          byAsociatie: mapThread(s.byAsociatie, asociatieId, threadId, (th) => {
            const message: PrivateMessage = {
              id: `pm-${Date.now()}`,
              thread_id: threadId,
              sender,
              sender_name: senderName,
              body: body.trim(),
              created_at: new Date().toISOString(),
              read: false,
            };
            return { ...th, status: 'open', messages: [...th.messages, message] };
          }),
        })),
      markRead: (asociatieId, threadId, viewer) =>
        set((s) => ({
          byAsociatie: mapThread(s.byAsociatie, asociatieId, threadId, (th) => {
            const from = counterpartOf(viewer);
            return {
              ...th,
              messages: th.messages.map((m) => (m.sender === from ? { ...m, read: true } : m)),
            };
          }),
        })),
      toggleStatus: (asociatieId, threadId) =>
        set((s) => ({
          byAsociatie: mapThread(s.byAsociatie, asociatieId, threadId, (th) => ({
            ...th,
            status: toggledStatus(th.status),
          })),
        })),
      forAsociatie: (asociatieId) => listFor(get().byAsociatie, asociatieId),
    }),
    { name: 'vecini.adminchat', version: 1 },
  ),
);

/** Hook: the private threads for the currently active asociație (stable empty). */
export function useAsociatieThreads(): PrivateThread[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useAdminChatStore((s) => listFor(s.byAsociatie, asociatieId));
}
