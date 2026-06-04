import { create } from 'zustand';
import { type AuditEntry, buildDemoAuditChain } from '@/features/audit/auditLogic';
import { DEMO_PLATFORM_ASOCIATII } from './demoPlatform';

const DEMO_ACTORS = [
  { id: 'demo-admin-1', name: 'Andrei Popescu' },
  { id: 'demo-admin-2', name: 'Maria Ionescu' },
  { id: 'demo-admin-3', name: 'Radu Mihai' },
];

function seedDemoChains(): Record<string, AuditEntry[]> {
  const result: Record<string, AuditEntry[]> = {};
  DEMO_PLATFORM_ASOCIATII.forEach((asoc, idx) => {
    const actor = DEMO_ACTORS[idx] ?? DEMO_ACTORS[0];
    result[asoc.id] = buildDemoAuditChain(asoc.id, actor.id, actor.name);
  });
  return result;
}

interface PlatformAuditState {
  /** Cross-tenant audit chains keyed by asociatie_id. Not persisted; re-fetched on mount. */
  chains: Record<string, AuditEntry[]>;
  fetchError: string | null;
  setChains: (chains: Record<string, AuditEntry[]>) => void;
  setFetchError: (err: string | null) => void;
}

export const usePlatformAuditStore = create<PlatformAuditState>()((set) => ({
  chains: seedDemoChains(),
  fetchError: null,
  setChains: (chains) => set({ chains, fetchError: null }),
  setFetchError: (fetchError) => set({ fetchError }),
}));
