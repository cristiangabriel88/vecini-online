import { describe, expect, it } from 'vitest';
import { hmacCanonical } from '@/features/audit/auditLogic';

const ASOC = 'asoc-abc-123';
const HASH = 'abcdef1234567890';

describe('hmacCanonical', () => {
  it('is deterministic', () => {
    expect(hmacCanonical(ASOC, HASH)).toBe(hmacCanonical(ASOC, HASH));
  });

  it('includes the v1 version prefix', () => {
    expect(hmacCanonical(ASOC, HASH)).toMatch(/^v1:/);
  });

  it('includes the asociatieId', () => {
    expect(hmacCanonical(ASOC, HASH)).toContain(ASOC);
  });

  it('includes the tailHash', () => {
    expect(hmacCanonical(ASOC, HASH)).toContain(HASH);
  });

  it('different asociatieId produces different canonical', () => {
    expect(hmacCanonical('asoc-1', HASH)).not.toBe(hmacCanonical('asoc-2', HASH));
  });

  it('different tailHash produces different canonical', () => {
    expect(hmacCanonical(ASOC, '0000000000000000')).not.toBe(
      hmacCanonical(ASOC, 'ffffffffffffffff'),
    );
  });
});
