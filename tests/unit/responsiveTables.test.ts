import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const legalCss = readFileSync(join(process.cwd(), 'src', 'styles', 'legal.css'), 'utf8');
const primitivesCss = readFileSync(join(process.cwd(), 'src', 'styles', 'primitives.css'), 'utf8');

describe('Responsive data tables (T231)', () => {
  it('GDPR retention table has a max-width:600px media block', () => {
    expect(legalCss).toContain('max-width: 600px');
  });

  it('GDPR table container gets overflow-x: auto on phones', () => {
    const block = legalCss.slice(legalCss.indexOf('max-width: 600px'));
    expect(block).toContain('.gdpr-table');
    expect(block).toContain('overflow-x: auto');
  });

  it('GDPR table rows get a min-width so content does not squish', () => {
    const block = legalCss.slice(legalCss.indexOf('max-width: 600px'));
    expect(block).toContain('.gdpr-table__row');
    expect(block).toContain('min-width:');
  });

  it('billing-invoices-table has a max-width:600px media block', () => {
    const idx = primitivesCss.indexOf('.billing-invoices-table');
    const block = primitivesCss.slice(idx);
    expect(block).toContain('max-width: 600px');
  });

  it('billing-invoices-table becomes display:block + overflow-x:auto on phones', () => {
    const idx = primitivesCss.indexOf('.billing-invoices-table');
    const block = primitivesCss.slice(idx);
    const mediaIdx = block.indexOf('max-width: 600px');
    const mediaBlock = block.slice(mediaIdx);
    expect(mediaBlock).toContain('display: block');
    expect(mediaBlock).toContain('overflow-x: auto');
  });
});
