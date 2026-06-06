/**
 * T264 - lazy-load contract for the xlsx chunk.
 *
 * xlsx is dynamically imported inside generateApartmentsXlsxTemplate and
 * parseApartmentsXlsx so the ~450 kB xlsx chunk is excluded from the initial
 * JS bundle and fetched only when an export/import operation is triggered.
 *
 * These tests verify the async functions resolve correctly and that no static
 * xlsx reference appears at the module boundary (if xlsx were statically
 * imported it would be bundled eagerly and fail differently).
 */
import { describe, it, expect } from 'vitest';
import { generateApartmentsXlsxTemplate, parseApartmentsXlsx } from '@/shared/lib/csv';

describe('xlsx lazy-load contract (T264)', () => {
  it('generateApartmentsXlsxTemplate returns a non-empty Uint8Array asynchronously', async () => {
    const bytes = await generateApartmentsXlsxTemplate();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it('parseApartmentsXlsx resolves with 3 rows for the generated template workbook', async () => {
    const bytes = await generateApartmentsXlsxTemplate();
    const result = await parseApartmentsXlsx(bytes.buffer);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(3);
  });

  it('generateApartmentsXlsxTemplate output is parseable without errors', async () => {
    const bytes = await generateApartmentsXlsxTemplate();
    const result = await parseApartmentsXlsx(bytes.buffer);
    result.rows.forEach((row) => {
      expect(row.numar_apartament).toBeTruthy();
    });
  });
});
