import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isDev } from '@/shared/lib/env';

export type PerfTier = 'full' | 'lite';
export type PerfPref = PerfTier | null; // null = auto

interface PerfState {
  pref: PerfPref;
  setPref: (next: PerfPref) => void;
  apply: () => void;
}

// Pure helper exposed for unit tests.
// Resolution priority: URL param > stored user pref > prefers-reduced-motion > stage default.
export function resolvePerf(
  pref: PerfPref,
  prefersReducedMotion: boolean,
  isDevStage: boolean,
  urlParam: string | null,
): PerfTier {
  if (urlParam === 'lite' || urlParam === 'full') return urlParam;
  if (pref === 'lite' || pref === 'full') return pref;
  if (prefersReducedMotion) return 'lite';
  return isDevStage ? 'lite' : 'full';
}

export const usePerfStore = create<PerfState>()(
  persist(
    (set, get) => ({
      pref: null,
      setPref: (next) => {
        set({ pref: next });
        get().apply();
      },
      apply: () => {
        const urlParam = new URLSearchParams(window.location.search).get('perf');
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const tier = resolvePerf(get().pref, prefersReducedMotion, isDev(), urlParam);
        document.documentElement.dataset.perf = tier;
      },
    }),
    { name: 'vecini.perf' },
  ),
);
