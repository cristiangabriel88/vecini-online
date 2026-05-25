/* Pure helpers for the building's entrances (scări). Entrances are configured as
   an interval the admin picks by its first and last value, in one of two modes:
   capital letters (A, B, C ...) or numbers (1, 2, 3 ...). The generated list is
   stored in the flexible `Asociatie.settings.scari` bag and drives the entrance
   selector on the apartment forms. No UI or store imports so it stays testable. */

export type EntranceMode = 'letters' | 'numbers';

/** A, B, ... Z. */
export const ENTRANCE_LETTERS: string[] = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i),
);

/** "1" .. "50" — a generous upper bound for numbered entrances. */
export const ENTRANCE_NUMBERS: string[] = Array.from({ length: 50 }, (_, i) => String(i + 1));

/** The full ordered option list for a mode. */
export function entranceOptions(mode: EntranceMode): string[] {
  return mode === 'letters' ? ENTRANCE_LETTERS : ENTRANCE_NUMBERS;
}

/** The position of a value within its mode's option list, or -1. */
function indexOf(mode: EntranceMode, value: string): number {
  return entranceOptions(mode).indexOf(value);
}

/**
 * The inclusive interval between `first` and `last` in the given mode, ordered.
 * Tolerates a reversed pair (first after last) by swapping. Returns an empty
 * list when either bound is unknown for the mode.
 */
export function entranceInterval(mode: EntranceMode, first: string, last: string): string[] {
  const options = entranceOptions(mode);
  const a = indexOf(mode, first);
  const b = indexOf(mode, last);
  if (a < 0 || b < 0) return [];
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return options.slice(lo, hi + 1);
}

/** The stored entrances list from the settings bag (strings only). */
export function scariList(settings: Record<string, unknown> | undefined): string[] {
  const value = settings?.scari;
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === 'string' && s.trim() !== '');
}

export interface EntranceConfig {
  mode: EntranceMode;
  first: string;
  last: string;
}

/**
 * Recover the {mode, first, last} interval from a stored entrances list so the
 * picker can be re-seeded. Numbers win only when every entry is numeric;
 * otherwise we treat the list as letters. Falls back to a single "A" when the
 * list is empty or unrecognised.
 */
export function detectEntranceConfig(scari: string[]): EntranceConfig {
  if (scari.length === 0) return { mode: 'letters', first: 'A', last: 'A' };
  const allNumbers = scari.every((s) => ENTRANCE_NUMBERS.includes(s));
  const mode: EntranceMode = allNumbers ? 'numbers' : 'letters';
  const known = scari.filter((s) => indexOf(mode, s) >= 0);
  if (known.length === 0) return { mode: 'letters', first: 'A', last: 'A' };
  const sorted = [...known].sort((x, y) => indexOf(mode, x) - indexOf(mode, y));
  return { mode, first: sorted[0], last: sorted[sorted.length - 1] };
}
