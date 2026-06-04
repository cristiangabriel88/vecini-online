import { create } from 'zustand';
import type { SupportMessage, SupportSender, SupportThread } from '@/shared/types/domain';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_ASOCIATIE, DEMO_CURRENT_USER_ID, DEMO_CURRENT_USER_NAME } from '@/shared/demo/demoData';
import { DEMO_PLATFORM_ASOCIATII } from './demoPlatform';

async function callSupportAdmin(
  action: 'reply' | 'toggle-status',
  threadId: string,
  body?: string,
): Promise<void> {
  const session = useAuthStore.getState().session;
  const token = session?.access_token;
  if (!token) return;
  try {
    await fetch('/.netlify/functions/support-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, thread_id: threadId, body }),
    });
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'platformMessengerStore.callSupportAdmin',
    });
  }
}

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
        read: true,
      },
    ],
  },
  {
    id: 'st-demo-2',
    asociatie_id: DEMO_PLATFORM_ASOCIATII[1].id,
    asociatie_name: DEMO_PLATFORM_ASOCIATII[1].name,
    admin_user_id: 'u-admin-2',
    admin_name: 'Ionescu Maria',
    subject: 'Acces la funcționalitati premium',
    status: 'open',
    created_at: '2026-06-02T08:45:00Z',
    messages: [
      {
        id: 'sm-demo-2-1',
        thread_id: 'st-demo-2',
        sender: 'admin',
        sender_name: 'Ionescu Maria',
        body: 'Buna ziua! Am dori sa activam modulul de facturare si votul prin aplicatie. Ce pasi trebuie urmati?',
        created_at: '2026-06-02T08:45:00Z',
        read: true,
      },
    ],
  },
  {
    id: 'st-demo-3',
    asociatie_id: DEMO_PLATFORM_ASOCIATII[2].id,
    asociatie_name: DEMO_PLATFORM_ASOCIATII[2].name,
    admin_user_id: 'u-admin-3',
    admin_name: 'Dumitrescu Vasile',
    subject: 'Intrebare despre importul locatarilor',
    status: 'resolved',
    created_at: '2026-05-28T14:00:00Z',
    messages: [
      {
        id: 'sm-demo-3-1',
        thread_id: 'st-demo-3',
        sender: 'admin',
        sender_name: 'Dumitrescu Vasile',
        body: 'Exista o modalitate de a importa lista locatarilor dintr-un fisier Excel?',
        created_at: '2026-05-28T14:00:00Z',
        read: true,
      },
      {
        id: 'sm-demo-3-2',
        thread_id: 'st-demo-3',
        sender: 'superadmin',
        sender_name: 'Platformă vecini.online',
        body: 'Da, importul CSV este disponibil in Admin > Apartamente. Template-ul se descarca din acelasi ecran. Faceti import, apoi invitati locatarii prin cod.',
        created_at: '2026-05-28T15:20:00Z',
        read: true,
      },
      {
        id: 'sm-demo-3-3',
        thread_id: 'st-demo-3',
        sender: 'admin',
        sender_name: 'Dumitrescu Vasile',
        body: 'Multumesc, a functionat perfect!',
        created_at: '2026-05-28T16:05:00Z',
        read: true,
      },
    ],
  },
];

function mapThread(
  byAsociatie: Record<string, SupportThread[]>,
  threadId: string,
  fn: (t: SupportThread) => SupportThread,
): Record<string, SupportThread[]> {
  const next: Record<string, SupportThread[]> = {};
  for (const [id, list] of Object.entries(byAsociatie)) {
    next[id] = list.map((t) => (t.id === threadId ? fn(t) : t));
  }
  return next;
}

function seedByAsociatie(): Record<string, SupportThread[]> {
  const out: Record<string, SupportThread[]> = {};
  for (const t of DEMO_THREADS) {
    (out[t.asociatie_id] ??= []).push(t);
  }
  return out;
}

interface PlatformMessengerState {
  byAsociatie: Record<string, SupportThread[]>;
  fetchError: string | null;
  replaceAll: (asociatieId: string, threads: SupportThread[]) => void;
  setFetchError: (error: string | null) => void;
  reply: (asociatieId: string, threadId: string, senderName: string, body: string) => void;
  markRead: (asociatieId: string, threadId: string, viewer: SupportSender) => void;
  toggleStatus: (asociatieId: string, threadId: string) => void;
  allThreads: () => SupportThread[];
}

export const usePlatformMessengerStore = create<PlatformMessengerState>()((set, get) => ({
  byAsociatie: seedByAsociatie(),
  fetchError: null,
  replaceAll: (asociatieId, threads) =>
    set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: threads } })),
  setFetchError: (error) => set({ fetchError: error }),
  reply: (_asociatieId, threadId, senderName, body) => {
    set((s) => ({
      byAsociatie: mapThread(s.byAsociatie, threadId, (t) => {
        const message: SupportMessage = {
          id: `sm-${Date.now()}`,
          thread_id: threadId,
          sender: 'superadmin',
          sender_name: senderName,
          body: body.trim(),
          created_at: new Date().toISOString(),
          read: false,
        };
        return { ...t, status: 'open', messages: [...t.messages, message] };
      }),
    }));
    if (isSupabaseConfigured) void callSupportAdmin('reply', threadId, body.trim());
  },
  markRead: (_asociatieId, threadId, viewer) =>
    set((s) => ({
      byAsociatie: mapThread(s.byAsociatie, threadId, (t) => ({
        ...t,
        messages: t.messages.map((m) => (m.sender !== viewer ? { ...m, read: true } : m)),
      })),
    })),
  toggleStatus: (_asociatieId, threadId) => {
    set((s) => ({
      byAsociatie: mapThread(s.byAsociatie, threadId, (t) => ({
        ...t,
        status: t.status === 'open' ? 'resolved' : 'open',
      })),
    }));
    if (isSupabaseConfigured) void callSupportAdmin('toggle-status', threadId);
  },
  allThreads: () => Object.values(get().byAsociatie).flat(),
}));
