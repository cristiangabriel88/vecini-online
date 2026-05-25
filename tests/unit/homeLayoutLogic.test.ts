import { describe, expect, it } from 'vitest';
import type { FeatureFlags } from '@/shared/features/featureFlagsLogic';
import {
  type HomeCard,
  DEFAULT_VISIBLE_COUNT,
  cycleCardSize,
  defaultLayout,
  homeCardCatalog,
  isDefaultLayout,
  layoutForKey,
  layoutStorageKey,
  moveCard,
  moveCardTo,
  moveCardToInsertion,
  reconcileLayout,
  toggleCardVisible,
  visibleCards,
} from '@/features/home/homeLayoutLogic';

// Enable a known set of features (registry order is F01, F02, ... so the catalog
// comes back in that order). Twelve enabled features so the default split between
// visible (first DEFAULT_VISIBLE_COUNT) and hidden is exercised.
function flagsFor(...keys: string[]): FeatureFlags {
  return Object.fromEntries(keys.map((k) => [k, true]));
}

const TWELVE = ['F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08', 'F09', 'F10', 'F11', 'F12'];

describe('homeLayoutLogic — F67 customizable home (T12)', () => {
  it('homeCardCatalog returns enabled, routed features in registry order', () => {
    const catalog = homeCardCatalog(flagsFor('F03', 'F01', 'F02'));
    // Registry order, not the flags-map order.
    expect(catalog).toEqual(['F01', 'F02', 'F03']);
  });

  it('homeCardCatalog excludes disabled features', () => {
    const catalog = homeCardCatalog(flagsFor('F01', 'F09'));
    expect(catalog).toEqual(['F01', 'F09']);
    expect(catalog).not.toContain('F02');
  });

  it('defaultLayout shows the first DEFAULT_VISIBLE_COUNT and hides the rest, all compact', () => {
    const layout = defaultLayout(flagsFor(...TWELVE));
    expect(layout).toHaveLength(12);
    expect(layout.every((c) => c.size === 'compact')).toBe(true);
    expect(visibleCards(layout)).toHaveLength(DEFAULT_VISIBLE_COUNT);
    expect(layout.slice(0, DEFAULT_VISIBLE_COUNT).every((c) => c.visible)).toBe(true);
    expect(layout.slice(DEFAULT_VISIBLE_COUNT).every((c) => !c.visible)).toBe(true);
    expect(layout.map((c) => c.key)).toEqual(TWELVE);
  });

  it('reconcileLayout returns the default when there is no saved layout', () => {
    const flags = flagsFor('F01', 'F02', 'F09');
    expect(reconcileLayout(undefined, flags)).toEqual(defaultLayout(flags));
    expect(reconcileLayout([], flags)).toEqual(defaultLayout(flags));
  });

  it('reconcileLayout keeps saved order/visibility/size, drops disabled, appends newly enabled', () => {
    const saved: HomeCard[] = [
      { key: 'F09', visible: true, size: 'expanded' }, // moved to front, expanded
      { key: 'F01', visible: false, size: 'compact' }, // hidden by the resident
      { key: 'F88', visible: true, size: 'compact' }, // no longer enabled -> dropped
    ];
    // F02 is newly enabled and absent from the saved layout -> appended, shown.
    const reconciled = reconcileLayout(saved, flagsFor('F01', 'F02', 'F09'));
    expect(reconciled).toEqual([
      { key: 'F09', visible: true, size: 'expanded' },
      { key: 'F01', visible: false, size: 'compact' },
      { key: 'F02', visible: true, size: 'compact' },
    ]);
  });

  it('toggleCardVisible flips one card without mutating the input', () => {
    const layout: HomeCard[] = [
      { key: 'F01', visible: true, size: 'compact' },
      { key: 'F02', visible: true, size: 'compact' },
    ];
    const next = toggleCardVisible(layout, 'F01');
    expect(next).not.toBe(layout);
    expect(next[0].visible).toBe(false);
    expect(next[1].visible).toBe(true);
    expect(layout[0].visible).toBe(true); // original untouched
  });

  it('cycleCardSize toggles compact <-> expanded without mutating the input', () => {
    const layout: HomeCard[] = [{ key: 'F01', visible: true, size: 'compact' }];
    const expanded = cycleCardSize(layout, 'F01');
    expect(expanded[0].size).toBe('expanded');
    expect(cycleCardSize(expanded, 'F01')[0].size).toBe('compact');
    expect(layout[0].size).toBe('compact');
  });

  it('moveCard reorders by delta and clamps at the ends without mutating', () => {
    const layout: HomeCard[] = [
      { key: 'F01', visible: true, size: 'compact' },
      { key: 'F02', visible: true, size: 'compact' },
      { key: 'F03', visible: true, size: 'compact' },
    ];
    expect(moveCard(layout, 0, 1).map((c) => c.key)).toEqual(['F02', 'F01', 'F03']);
    expect(moveCard(layout, 2, -1).map((c) => c.key)).toEqual(['F01', 'F03', 'F02']);
    // Out-of-range moves are no-ops returning the same reference.
    expect(moveCard(layout, 0, -1)).toBe(layout);
    expect(moveCard(layout, 2, 1)).toBe(layout);
    expect(layout.map((c) => c.key)).toEqual(['F01', 'F02', 'F03']); // untouched
  });

  it('moveCardTo drags a card to an index, no-op for unknown/out-of-range/unchanged', () => {
    const layout: HomeCard[] = [
      { key: 'F01', visible: true, size: 'compact' },
      { key: 'F02', visible: true, size: 'compact' },
      { key: 'F03', visible: true, size: 'compact' },
    ];
    expect(moveCardTo(layout, 'F03', 0).map((c) => c.key)).toEqual(['F03', 'F01', 'F02']);
    expect(moveCardTo(layout, 'F404', 0)).toBe(layout); // unknown key
    expect(moveCardTo(layout, 'F01', 9)).toBe(layout); // out of range
    expect(moveCardTo(layout, 'F01', 0)).toBe(layout); // unchanged position
  });

  it('moveCardToInsertion drops a card into a between-cards gap, accounting for the shift', () => {
    const layout: HomeCard[] = [
      { key: 'F01', visible: true, size: 'compact' },
      { key: 'F02', visible: true, size: 'compact' },
      { key: 'F03', visible: true, size: 'compact' },
    ];
    // Drop F01 into the trailing gap (slot 3) -> lands last.
    expect(moveCardToInsertion(layout, 'F01', 3).map((c) => c.key)).toEqual(['F02', 'F03', 'F01']);
    // Drop F03 into the leading gap (slot 0) -> lands first.
    expect(moveCardToInsertion(layout, 'F03', 0).map((c) => c.key)).toEqual(['F03', 'F01', 'F02']);
    // Drop F02 before F01 (slot 0).
    expect(moveCardToInsertion(layout, 'F02', 0).map((c) => c.key)).toEqual(['F02', 'F01', 'F03']);
    // Gaps on either side of a card's own position are no-ops (same reference).
    expect(moveCardToInsertion(layout, 'F01', 0)).toBe(layout);
    expect(moveCardToInsertion(layout, 'F01', 1)).toBe(layout);
    // Unknown key and out-of-range slot (clamped) behave sanely.
    expect(moveCardToInsertion(layout, 'F404', 1)).toBe(layout);
    expect(moveCardToInsertion(layout, 'F01', 99).map((c) => c.key)).toEqual(['F02', 'F03', 'F01']);
    expect(layout.map((c) => c.key)).toEqual(['F01', 'F02', 'F03']); // untouched
  });

  it('isDefaultLayout recognises the default and any deviation', () => {
    const flags = flagsFor(...TWELVE);
    const def = defaultLayout(flags);
    expect(isDefaultLayout(def, flags)).toBe(true);
    expect(isDefaultLayout(toggleCardVisible(def, 'F01'), flags)).toBe(false);
    expect(isDefaultLayout(moveCard(def, 0, 1), flags)).toBe(false);
    expect(isDefaultLayout(def.slice(1), flags)).toBe(false); // length mismatch
  });

  it('layoutForKey returns a stable frozen empty array for null/missing keys', () => {
    const empty = layoutForKey({}, null);
    expect(empty).toEqual([]);
    // Same shared reference each call, so selectors do not churn.
    expect(layoutForKey({}, null)).toBe(empty);
    expect(layoutForKey({}, 'u::a')).toBe(empty);
    const stored: HomeCard[] = [{ key: 'F01', visible: true, size: 'compact' }];
    expect(layoutForKey({ 'u::a': stored }, 'u::a')).toBe(stored);
  });

  it('layoutStorageKey composes resident + asociație', () => {
    expect(layoutStorageKey('u-res', 'demo-asoc')).toBe('u-res::demo-asoc');
  });
});
