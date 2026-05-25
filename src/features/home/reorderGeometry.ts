/**
 * F67 — pure geometry for the pointer-driven home reorder. Given the on-screen
 * rectangles of the cards and the pointer position, it resolves the insertion
 * slot the drop caret should sit in. Kept backend-free and DOM-free so it can be
 * unit-tested without a browser.
 */

/** The slice of `DOMRect` the geometry needs (so tests can pass plain objects). */
export interface RectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

/** A laid-out reorder item: its model index and current on-screen rectangle. */
export interface ReorderRect {
  index: number;
  rect: RectLike;
}

/**
 * The insertion slot in 0..count that a pointer at (x, y) targets within a
 * wrapping grid. It prefers the items whose vertical band contains the pointer
 * (the row being hovered); failing that (the pointer is above, below or beside
 * every card) it falls back to the nearest item by centre distance. Within the
 * chosen item, the pointer's side of its horizontal centre decides before (its
 * index) or after (index + 1).
 *
 * Crucially this resolves to a sensible slot even when the pointer sits in the
 * gutter between cards, which is what lets a drop feel permitted everywhere on
 * the grid rather than only when squarely over a card.
 */
export function insertionFromPoint(items: ReorderRect[], x: number, y: number): number {
  if (items.length === 0) return 0;
  const inRow = items.filter((it) => y >= it.rect.top && y <= it.rect.bottom);
  const pool = inRow.length > 0 ? inRow : items;

  let best = pool[0];
  let bestDist = Infinity;
  for (const it of pool) {
    const cx = it.rect.left + it.rect.width / 2;
    const cy = it.rect.top + it.rect.height / 2;
    const dx = x - cx;
    // When we already constrained to a row, ignore the vertical axis so the
    // nearest pick follows the pointer horizontally along that row.
    const dy = inRow.length > 0 ? 0 : y - cy;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = it;
    }
  }

  const cx = best.rect.left + best.rect.width / 2;
  return x < cx ? best.index : best.index + 1;
}
