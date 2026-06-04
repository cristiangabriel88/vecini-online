import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'src', 'styles', 'primitives.css'), 'utf8');
const tsx = readFileSync(join(process.cwd(), 'src', 'shared', 'components', 'DatePicker.tsx'), 'utf8');

describe('DatePicker bottom-sheet variant (T232)', () => {
  it('dp-sheet-overlay uses position: fixed', () => {
    const idx = css.indexOf('.dp-sheet-overlay {');
    expect(idx).toBeGreaterThan(-1);
    const block = css.slice(idx, idx + 200);
    expect(block).toContain('position: fixed');
  });

  it('dp-popover--sheet has env(safe-area-inset-bottom) padding', () => {
    expect(css).toContain('safe-area-inset-bottom');
  });

  it('dp-popover--sheet has drag-handle ::before rule', () => {
    expect(css).toContain('.dp-popover--sheet::before');
  });

  it('iv-dp-sheet-in keyframe is defined', () => {
    expect(css).toContain('@keyframes iv-dp-sheet-in');
  });

  it('iv-dp-sheet-out keyframe is defined', () => {
    expect(css).toContain('@keyframes iv-dp-sheet-out');
  });

  it('reduced-motion block disables sheet animation', () => {
    const dpIdx = css.indexOf('.dp-popover {');
    const dpSection = css.slice(dpIdx);
    const rmIdx = dpSection.indexOf('@media (prefers-reduced-motion: reduce)');
    const block = dpSection.slice(rmIdx);
    expect(block).toContain('.dp-popover--sheet');
    expect(block).toContain('.dp-sheet-overlay');
  });

  it('DatePicker renders dp-sheet-overlay class on mobile', () => {
    expect(tsx).toContain('dp-sheet-overlay');
    expect(tsx).toContain('dp-popover--sheet');
    expect(tsx).toContain('isMobile');
  });
});
