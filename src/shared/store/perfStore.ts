import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isDev } from '@/shared/lib/env';

export type PerfTier = 'full' | 'lite';
export type PerfPref = PerfTier | null; // null = auto

interface PerfState {
  pref: PerfPref;
  autoSuggested: boolean;
  lowEndDetected: boolean;
  setPref: (next: PerfPref) => void;
  markSuggested: () => void;
  apply: () => void;
}

export interface LowEndSignals {
  deviceMemory: number | null;
  cpuCores: number;
  saveData: boolean;
  effectiveType: string | null;
}

// Pure detection helper -- testable via explicit signal overrides.
export function detectLowEnd(overrides?: Partial<LowEndSignals>): boolean {
  const nav = navigator as Navigator & Record<string, unknown>;
  const conn = nav.connection as { saveData?: boolean; effectiveType?: string } | undefined;

  const mem =
    overrides?.deviceMemory !== undefined
      ? overrides.deviceMemory
      : ((nav.deviceMemory as number | undefined) ?? null);
  const cores = overrides?.cpuCores ?? nav.hardwareConcurrency ?? 4;
  const saveData = overrides?.saveData ?? conn?.saveData === true;
  const effectiveType = overrides?.effectiveType ?? conn?.effectiveType ?? null;

  if (saveData) return true;
  if (effectiveType === '2g' || effectiveType === 'slow-2g') return true;
  if (mem !== null && mem < 2) return true;
  if (cores <= 2) return true;
  return false;
}

// Pure helper exposed for unit tests.
// Resolution priority: URL param > stored user pref > prefers-reduced-motion > low-end auto > stage default.
export function resolvePerf(
  pref: PerfPref,
  prefersReducedMotion: boolean,
  isDevStage: boolean,
  urlParam: string | null,
  lowEnd = false,
): PerfTier {
  if (urlParam === 'lite' || urlParam === 'full') return urlParam;
  if (pref === 'lite' || pref === 'full') return pref;
  if (prefersReducedMotion) return 'lite';
  if (lowEnd) return 'lite';
  return isDevStage ? 'lite' : 'full';
}

export const usePerfStore = create<PerfState>()(
  persist(
    (set, get) => ({
      pref: null,
      autoSuggested: false,
      lowEndDetected: false,
      setPref: (next) => {
        set({ pref: next });
        get().apply();
      },
      markSuggested: () => set({ autoSuggested: true }),
      apply: () => {
        const urlParam = new URLSearchParams(window.location.search).get('perf');
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const lowEnd = detectLowEnd();
        set({ lowEndDetected: lowEnd });
        const tier = resolvePerf(get().pref, prefersReducedMotion, isDev(), urlParam, lowEnd);
        document.documentElement.dataset.perf = tier;
      },
    }),
    {
      name: 'vecini.perf',
      partialize: (state) => ({ pref: state.pref, autoSuggested: state.autoSuggested }),
    },
  ),
);
