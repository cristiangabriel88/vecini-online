import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* The selectable accent tints. Each maps to a [data-palette="…"] block in
   tokens.css that overrides --accent-hue / --accent-chroma; everything that
   reads --primary/--accent-* (buttons, nav, links, rings) recolours with it.
   The warm beige atmosphere is deliberately independent and never changes. */
export type Tint = 'sage' | 'terracotta' | 'ocean' | 'indigo' | 'plum';

interface TintState {
  tint: Tint;
  setTint: (next: Tint) => void;
  apply: () => void;
}

export const useTintStore = create<TintState>()(
  persist(
    (set, get) => ({
      tint: 'sage',
      setTint: (next) => {
        set({ tint: next });
        get().apply();
      },
      apply: () => {
        document.documentElement.setAttribute('data-palette', get().tint);
      },
    }),
    { name: 'vecini.tint' },
  ),
);
