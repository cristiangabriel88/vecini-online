import { create } from 'zustand';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useAuthStore } from '@/shared/store/authStore';
import { type PlatformBroadcast, DEMO_PLATFORM_BROADCASTS } from './demoPlatform';

async function callBroadcastFn(
  action: 'publish' | 'expire',
  payload: Record<string, unknown>,
): Promise<void> {
  const session = useAuthStore.getState().session;
  const token = session?.access_token;
  if (!token) return;
  try {
    await fetch('/.netlify/functions/platform-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: 'platformBroadcastStore.callBroadcastFn',
    });
  }
}

export interface BroadcastDraft {
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  target: 'all' | 'admin';
  endsAt: string | null;
}

interface PlatformBroadcastState {
  broadcasts: PlatformBroadcast[];
  fetchError: string | null;
  replace: (broadcasts: PlatformBroadcast[]) => void;
  setFetchError: (error: string | null) => void;
  publish: (draft: BroadcastDraft, operatorId: string) => PlatformBroadcast;
  expire: (id: string) => void;
  active: () => PlatformBroadcast[];
  past: () => PlatformBroadcast[];
}

function isActive(b: PlatformBroadcast): boolean {
  if (b.expiredAt) return false;
  const now = Date.now();
  if (new Date(b.startsAt).getTime() > now) return false;
  if (b.endsAt && new Date(b.endsAt).getTime() <= now) return false;
  return true;
}

export const usePlatformBroadcastStore = create<PlatformBroadcastState>()((set, get) => ({
  broadcasts: DEMO_PLATFORM_BROADCASTS.map((b) => ({ ...b })),
  fetchError: null,

  replace: (broadcasts) => set({ broadcasts }),
  setFetchError: (error) => set({ fetchError: error }),

  publish: (draft, operatorId) => {
    const broadcast: PlatformBroadcast = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pb-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: draft.title.trim(),
      body: draft.body.trim(),
      severity: draft.severity,
      target: draft.target,
      startsAt: new Date().toISOString(),
      endsAt: draft.endsAt,
      createdBy: operatorId,
      createdAt: new Date().toISOString(),
      expiredAt: null,
    };
    set((s) => ({ broadcasts: [broadcast, ...s.broadcasts] }));
    if (isSupabaseConfigured) {
      void callBroadcastFn('publish', {
        title: broadcast.title,
        body: broadcast.body,
        severity: broadcast.severity,
        target: broadcast.target,
        endsAt: broadcast.endsAt,
      });
    }
    return broadcast;
  },

  expire: (id) => {
    set((s) => ({
      broadcasts: s.broadcasts.map((b) =>
        b.id === id ? { ...b, expiredAt: new Date().toISOString() } : b,
      ),
    }));
    if (isSupabaseConfigured) void callBroadcastFn('expire', { id });
  },

  active: () => get().broadcasts.filter(isActive),
  past: () => get().broadcasts.filter((b) => !isActive(b)),
}));
