import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const primitivesCss = readFileSync(join(process.cwd(), 'src', 'styles', 'primitives.css'), 'utf8');
const shellCss = readFileSync(join(process.cwd(), 'src', 'styles', 'shell.css'), 'utf8');

const mobileBlock = (() => {
  const idx = primitivesCss.indexOf('Touch targets: 44 px minimum');
  return primitivesCss.slice(idx);
})();

describe('Touch targets: 44px minimum on mobile (T233)', () => {
  it('.row-action-btn class is defined in primitives.css', () => {
    expect(primitivesCss).toContain('.row-action-btn');
  });

  it('.row-action-btn gets 44px on mobile', () => {
    expect(mobileBlock).toContain('.row-action-btn');
    const afterRowAction = mobileBlock.slice(mobileBlock.indexOf('.row-action-btn'));
    expect(afterRowAction).toMatch(/width:\s*44px/);
    expect(afterRowAction).toMatch(/height:\s*44px/);
  });

  it('.btn--sm reaches 44px on mobile (not 38px)', () => {
    const idx = mobileBlock.indexOf('.btn--sm');
    const snippet = mobileBlock.slice(idx, idx + 60);
    expect(snippet).toContain('44px');
    expect(snippet).not.toContain('38px');
  });

  it('.iconbtn gets 44px touch target on mobile', () => {
    expect(mobileBlock).toContain('.iconbtn');
    const afterIconbtn = mobileBlock.slice(mobileBlock.indexOf('.iconbtn'));
    expect(afterIconbtn).toMatch(/width:\s*44px/);
    expect(afterIconbtn).toMatch(/height:\s*44px/);
  });

  it('.iconbtn base definition is in shell.css', () => {
    expect(shellCss).toContain('.iconbtn');
  });
});
