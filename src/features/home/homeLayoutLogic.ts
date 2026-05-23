import { FEATURES, type FeatureKey } from '@/shared/features/registry';
import type { FeatureFlags } from '@/shared/features/featureFlagsLogic';

/**
 * F67 — Acasă personalizabil. Pure, backend-free logic for the per-resident home
 * layout: which feature cards a resident sees on the home screen, in what order,
 * each shown/hidden and sized. The card catalog is exactly the asociație's
 * admin-enabled features (a resident can never surface a disabled feature), so a
 * saved layout is always reconciled against the current enabled set before use.
 *
 * The shape mirrors the `home_layouts` table (resident_id, asociatie_id, an
 * ordered list of {card_key, visible, size}); the offline store is the source of
 * truth and live persistence under owner RLS is a documented follow-up.
 */

/** A card's display size on the home grid. */
export type CardSize = 'compact' | 'expanded';

/** One card in a resident's home layout. */
export interface HomeCard {
  /** The feature whose home shortcut this card is. */
  key: FeatureKey;
  /** Whether the resident shows this card. */
  visible: boolean;
  /** Compact (single cell) or expanded (spans two columns). */
  size: CardSize;
}

/** Saved layouts keyed by `${residentId}::${asociatieId}`. */
export type LayoutByKey = Record<string, HomeCard[]>;

/**
 * Number of cards visible in the default layout. The home stays clean out of the
 * box (the first few enabled features, in registry order) and the resident can
 * reveal the rest in edit mode, matching today's six-shortcut home.
 */
export const DEFAULT_VISIBLE_COUNT = 6;

/**
 * Shared frozen empty layout returned for an unknown key so React selectors keep
 * a constant reference (a fresh `[]` per call would force needless re-renders).
 * Never mutate it; the ops below always build a new array.
 */
const EMPTY_LAYOUT: HomeCard[] = Object.freeze([]) as unknown as HomeCard[];

/** The storage key for one resident's layout in one asociație. */
export function layoutStorageKey(residentId: string, asociatieId: string): string {
  return `${residentId}::${asociatieId}`;
}

/**
 * The feature keys eligible to appear on the home, in registry order: every
 * enabled feature that has a dedicated page (a card links to its route). This is
 * the single source for the card catalog, so a disabled feature is never offered.
 */
export function homeCardCatalog(flags: FeatureFlags): FeatureKey[] {
  return FEATURES.filter((f) => f.path && flags[f.key]).map((f) => f.key);
}

/**
 * The default layout: every enabled, routed feature in registry order, sized
 * compact, with only the first `DEFAULT_VISIBLE_COUNT` shown. Used when a
 * resident has no saved layout and to restore "Resetează la implicit".
 */
export function defaultLayout(flags: FeatureFlags): HomeCard[] {
  return homeCardCatalog(flags).map((key, i) => ({
    key,
    visible: i < DEFAULT_VISIBLE_COUNT,
    size: 'compact' as CardSize,
  }));
}

/**
 * Reconcile a saved layout against the current enabled catalog so the layout can
 * never reference a feature the admin has since disabled and always offers a
 * newly enabled one:
 *  - keep the saved order / visibility / size for keys still in the catalog,
 *  - drop saved keys that are no longer enabled,
 *  - append newly enabled keys (absent from the saved layout) at the end, shown.
 * With no saved layout it returns the default. Non-mutating.
 */
export function reconcileLayout(
  saved: HomeCard[] | undefined,
  flags: FeatureFlags,
): HomeCard[] {
  if (!saved || saved.length === 0) return defaultLayout(flags);
  const catalog = homeCardCatalog(flags);
  const catalogSet = new Set<string>(catalog);
  const savedKeys = new Set(saved.map((c) => c.key));
  const kept = saved.filter((c) => catalogSet.has(c.key)).map((c) => ({ ...c }));
  const added = catalog
    .filter((key) => !savedKeys.has(key))
    .map((key) => ({ key, visible: true, size: 'compact' as CardSize }));
  return [...kept, ...added];
}

/** The cards a resident actually sees, in order (visible only). */
export function visibleCards(layout: HomeCard[]): HomeCard[] {
  return layout.filter((c) => c.visible);
}

/** Toggle a card's visibility; non-mutating. */
export function toggleCardVisible(layout: HomeCard[], key: string): HomeCard[] {
  return layout.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c));
}

/** Toggle a card between compact and expanded; non-mutating. */
export function cycleCardSize(layout: HomeCard[], key: string): HomeCard[] {
  return layout.map((c) =>
    c.key === key ? { ...c, size: c.size === 'compact' ? 'expanded' : 'compact' } : c,
  );
}

/**
 * Move the card at `index` by `delta` (-1 up, +1 down). Clamped: a move past
 * either end is a no-op returning the same array. Non-mutating.
 */
export function moveCard(layout: HomeCard[], index: number, delta: number): HomeCard[] {
  const to = index + delta;
  if (index < 0 || index >= layout.length || to < 0 || to >= layout.length) return layout;
  const next = layout.map((c) => ({ ...c }));
  const [moved] = next.splice(index, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Move the card with `key` to position `toIndex` (for drag-and-drop reorder).
 * No-op for an unknown key or an out-of-range / unchanged target. Non-mutating.
 */
export function moveCardTo(layout: HomeCard[], key: string, toIndex: number): HomeCard[] {
  const from = layout.findIndex((c) => c.key === key);
  if (from === -1 || toIndex < 0 || toIndex >= layout.length || from === toIndex) return layout;
  const next = layout.map((c) => ({ ...c }));
  const [moved] = next.splice(from, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Whether a layout already matches the default for the current catalog, so the
 * "Resetează la implicit" action can be disabled when there is nothing to reset.
 */
export function isDefaultLayout(layout: HomeCard[], flags: FeatureFlags): boolean {
  const def = defaultLayout(flags);
  if (layout.length !== def.length) return false;
  return layout.every(
    (c, i) => c.key === def[i].key && c.visible === def[i].visible && c.size === def[i].size,
  );
}

/** The stored layout for a key, or a shared frozen empty array. */
export function layoutForKey(byKey: LayoutByKey, key: string | null): HomeCard[] {
  if (!key) return EMPTY_LAYOUT;
  return byKey[key] ?? EMPTY_LAYOUT;
}
