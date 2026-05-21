import { describe, expect, it } from 'vitest';
import { formatLei, formatDate, isValidRoPhone, formatRoPhone } from '@/shared/lib/format';

describe('format', () => {
  it('formats RON with Romanian grouping', () => {
    expect(formatLei(1234.56)).toBe('1.234,56 lei');
    expect(formatLei(0)).toBe('0,00 lei');
  });

  it('formats dates as DD.MM.YYYY', () => {
    expect(formatDate('2026-05-21T10:00:00Z')).toBe('21.05.2026');
  });

  it('validates Romanian mobile numbers', () => {
    expect(isValidRoPhone('+40 721 234 567')).toBe(true);
    expect(isValidRoPhone('+40721234567')).toBe(true);
    expect(isValidRoPhone('0721234567')).toBe(false);
  });

  it('normalises phone numbers', () => {
    expect(formatRoPhone('0721234567')).toBe('+40 721 234 567');
    expect(formatRoPhone('+40721234567')).toBe('+40 721 234 567');
  });
});
