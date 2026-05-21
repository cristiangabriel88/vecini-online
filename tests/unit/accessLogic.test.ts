import { describe, expect, it } from 'vitest';
import {
  expiryFrom,
  generateCode,
  isActive,
  minutesLeft,
  sortedCodes,
} from '@/features/access/accessLogic';
import type { AccessCode } from '@/shared/types/domain';

const base = { asociatie_id: 'a', generated_by: 'u', used_at: null };
const NOW = '2026-05-22T09:00:00Z';

const codes: AccessCode[] = [
  { ...base, id: 'active', code: '111111', expires_at: '2026-05-22T09:20:00Z', created_at: '2026-05-22T08:55:00Z' },
  { ...base, id: 'expired', code: '222222', expires_at: '2026-05-22T08:30:00Z', created_at: '2026-05-22T08:00:00Z' },
  { ...base, id: 'used', code: '333333', expires_at: '2026-05-22T09:30:00Z', created_at: '2026-05-22T08:58:00Z', used_at: '2026-05-22T09:01:00Z' },
];

describe('generateCode', () => {
  it('produces a 6-digit zero-padded code', () => {
    expect(generateCode(() => 0)).toBe('000000');
    expect(generateCode(() => 0.123456)).toHaveLength(6);
    expect(generateCode(() => 0.999999)).toMatch(/^\d{6}$/);
  });
});

describe('expiryFrom', () => {
  it('sets expiry 30 minutes out', () => {
    expect(expiryFrom('2026-05-22T09:00:00Z')).toBe('2026-05-22T09:30:00.000Z');
  });
});

describe('isActive', () => {
  it('is true only for unused, unexpired codes', () => {
    expect(isActive(codes[0], NOW)).toBe(true);
    expect(isActive(codes[1], NOW)).toBe(false);
    expect(isActive(codes[2], NOW)).toBe(false);
  });
});

describe('minutesLeft', () => {
  it('rounds up remaining minutes and floors at 0', () => {
    expect(minutesLeft(codes[0], NOW)).toBe(20);
    expect(minutesLeft(codes[1], NOW)).toBe(0);
  });
});

describe('sortedCodes', () => {
  it('orders newest first', () => {
    expect(sortedCodes(codes).map((c) => c.id)).toEqual(['used', 'active', 'expired']);
  });
});
