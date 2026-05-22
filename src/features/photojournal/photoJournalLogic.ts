import type { ProjectPhoto } from '@/shared/types/domain';

/** Gradient swatches cycled through as image stand-ins in demo mode. */
export const PHOTO_SWATCHES = [
  'from-amber-400 to-orange-500',
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
];

/** Pick a swatch deterministically from a seed (e.g. the entry count). */
export function swatchForIndex(index: number): string {
  return PHOTO_SWATCHES[Math.abs(index) % PHOTO_SWATCHES.length];
}

/** A journal entry needs a 3+ char caption and a date. */
export function isValidPhoto(caption: string, date: string): boolean {
  return caption.trim().length >= 3 && date.trim().length > 0;
}

/** Photos for one project ('all' returns every photo). */
export function filterByProject(photos: ProjectPhoto[], projectId: string): ProjectPhoto[] {
  return projectId === 'all' ? photos : photos.filter((p) => p.project_id === projectId);
}

/**
 * Group photos by day, newest day first; within a day the most recently added
 * entry comes first — a reverse-chronological time-lapse.
 */
export function groupByDate(photos: ProjectPhoto[]): { date: string; photos: ProjectPhoto[] }[] {
  const byDate = new Map<string, ProjectPhoto[]>();
  for (const p of photos) {
    const arr = byDate.get(p.date) ?? [];
    arr.push(p);
    byDate.set(p.date, arr);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([date, list]) => ({
      date,
      photos: [...list].sort((a, b) =>
        a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
      ),
    }));
}
