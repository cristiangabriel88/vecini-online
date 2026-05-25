import { describe, expect, it } from 'vitest';
import { insertionFromPoint, type ReorderRect } from '@/features/home/reorderGeometry';

/** Build a rect from x/y/size so the cases below read clearly. */
function r(index: number, left: number, top: number, w = 100, h = 50): ReorderRect {
  return { index, rect: { left, top, right: left + w, bottom: top + h, width: w, height: h } };
}

// A 2-column grid, two rows, 12px gutters:
//   [0]  [1]      (row y 0..50, x 0..100 and 112..212)
//   [2]  [3]      (row y 62..112)
const GRID: ReorderRect[] = [r(0, 0, 0), r(1, 112, 0), r(2, 0, 62), r(3, 112, 62)];

describe('reorderGeometry — insertionFromPoint (F67 pointer reorder)', () => {
  it('returns slot 0 for an empty grid', () => {
    expect(insertionFromPoint([], 10, 10)).toBe(0);
  });

  it('picks before/after a card from the pointer side of its centre', () => {
    expect(insertionFromPoint(GRID, 10, 25)).toBe(0); // left half of card 0
    expect(insertionFromPoint(GRID, 90, 25)).toBe(1); // right half of card 0
    expect(insertionFromPoint(GRID, 120, 25)).toBe(1); // left half of card 1
    expect(insertionFromPoint(GRID, 205, 25)).toBe(2); // right half of card 1
  });

  it('resolves a gutter between two cards to the slot between them', () => {
    // x=106 sits in the gutter between card 0 (centre 50) and card 1 (centre 162);
    // nearer card 0, on its right side -> slot 1 (between 0 and 1).
    expect(insertionFromPoint(GRID, 106, 25)).toBe(1);
  });

  it('uses the row under the pointer, not a nearer card in another row', () => {
    // Pointer on row 2, left card -> slot 2 (before card 2), never card 0/1.
    expect(insertionFromPoint(GRID, 10, 85)).toBe(2);
    expect(insertionFromPoint(GRID, 90, 85)).toBe(3); // right of card 2
  });

  it('falls back to the nearest card when the pointer is below every row', () => {
    // Far below: nearest is card 2 (left) -> its right edge gives the end slots.
    expect(insertionFromPoint(GRID, 90, 300)).toBe(3); // right of card 2
    expect(insertionFromPoint(GRID, 205, 300)).toBe(4); // right of card 3 -> append
  });
});
