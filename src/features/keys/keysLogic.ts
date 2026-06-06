import type { KeyRecord } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';
import { DEMO_ASOCIATIE, DEMO_KEYS } from '@/shared/demo/demoData';
import { emptyArray } from '@/shared/lib/emptyArray';

/** A key record needs a space name and a holder. */
export function isValidKey(space: string, holder: string): boolean {
  return space.trim().length > 0 && holder.trim().length > 0;
}

/** A handover needs a new holder distinct from nothing (non-empty). */
export function isValidHandover(newHolder: string): boolean {
  return newHolder.trim().length > 0;
}

/** Search by space, holder or notes (accent-insensitive). */
export function searchKeys(keys: KeyRecord[], query: string): KeyRecord[] {
  const q = normalizeSearch(query.trim());
  if (!q) return keys;
  return keys.filter((k) =>
    normalizeSearch(`${k.space} ${k.holder_name} ${k.notes ?? ''}`).includes(q),
  );
}

/** Sort key records alphabetically by space. */
export function sortKeys(keys: KeyRecord[]): KeyRecord[] {
  return [...keys].sort((a, b) => a.space.localeCompare(b.space, 'ro'));
}

// ── Per-asociatie key registry catalog ──────────────────────────────────────

export type KeysByAsociatie = Record<string, KeyRecord[]>;

const EMPTY_KEYS = emptyArray<KeyRecord>();

export function keysForAsociatie(map: KeysByAsociatie, asociatieId: string | null): KeyRecord[] {
  if (!asociatieId) return EMPTY_KEYS;
  return map[asociatieId] ?? EMPTY_KEYS;
}

export function seedKeys(): KeysByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_KEYS] };
}

export function addKeyIn(map: KeysByAsociatie, asociatieId: string, key: KeyRecord): KeysByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [key, ...current] };
}

export function handoverKeyIn(map: KeysByAsociatie, asociatieId: string, id: string, newHolder: string): KeysByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: current.map((k) => (k.id === id ? { ...k, holder_name: newHolder.trim() } : k)) };
}

export function migrateKeysState(persisted: unknown): KeysByAsociatie {
  const p = persisted as { byAsociatie?: KeysByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_KEYS] };
}
