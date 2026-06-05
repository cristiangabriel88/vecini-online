import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';

export interface ActiveBroadcast {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  target: 'all' | 'admin';
  startsAt: string;
  endsAt: string | null;
}

/** Seeded active broadcast in demo mode so the banner renders offline. */
const DEMO_ACTIVE_BROADCAST: ActiveBroadcast = {
  id: 'pb-demo-1',
  title: 'Mentenanță programată',
  body: 'Duminică, 08 iunie 2026, între orele 02:00 si 06:00, serverele vor fi in mentenanță. Aplicatia nu va fi disponibila in acest interval.',
  severity: 'info',
  target: 'all',
  startsAt: '2026-06-06T00:00:00Z',
  endsAt: '2026-06-08T06:00:00Z',
};

const DISMISSED_KEY = 'iv.broadcast.dismissed';

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable */
  }
}

interface BroadcastState {
  broadcasts: ActiveBroadcast[];
  dismissed: Set<string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  dismiss: (id: string) => void;
  visible: () => ActiveBroadcast[];
}

export const useBroadcastStore = create<BroadcastState>()((set, get) => ({
  broadcasts: [DEMO_ACTIVE_BROADCAST],
  dismissed: loadDismissed(),
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    if (!isSupabaseConfigured) {
      set({ hydrated: true });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('platform_broadcasts')
        .select('id, title, body, severity, target, starts_at, ends_at')
        .is('expired_at', null)
        .lte('starts_at', new Date().toISOString())
        .or('ends_at.is.null,ends_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) {
        reportError(new Error(error.message), { source: 'broadcastStore.hydrate' });
        set({ hydrated: true });
        return;
      }
      const rows: ActiveBroadcast[] = (data ?? []).map((r) => ({
        id: r.id as string,
        title: r.title as string,
        body: r.body as string,
        severity: r.severity as 'info' | 'warning' | 'critical',
        target: r.target as 'all' | 'admin',
        startsAt: r.starts_at as string,
        endsAt: (r.ends_at as string | null) ?? null,
      }));
      set({ broadcasts: rows, hydrated: true });
    } catch (err) {
      reportError(err instanceof Error ? err : new Error(String(err)), {
        source: 'broadcastStore.hydrate',
      });
      set({ hydrated: true });
    }
  },

  dismiss: (id) => {
    set((s) => {
      const next = new Set(s.dismissed);
      next.add(id);
      saveDismissed(next);
      return { dismissed: next };
    });
  },

  visible: () => {
    const { broadcasts, dismissed } = get();
    return broadcasts.filter((b) => !dismissed.has(b.id));
  },
}));
