import { describe, expect, it } from 'vitest';
import { isValidThankYou, formatApartmentLabel } from '@/features/thankyous/thankYouLogic';

describe('isValidThankYou', () => {
  it('requires a target and a non-trivial message', () => {
    expect(isValidThankYou('Mulțumesc mult!', '13')).toBe(true);
    expect(isValidThankYou('Mulțumesc mult!', '   ')).toBe(false);
    expect(isValidThankYou('hi', '13')).toBe(false);
    expect(isValidThankYou('   ', '13')).toBe(false);
  });
});

describe('formatApartmentLabel', () => {
  it('normalises plain numbers and existing labels', () => {
    expect(formatApartmentLabel('13')).toBe('Ap. 13');
    expect(formatApartmentLabel('ap 5')).toBe('Ap. 5');
    expect(formatApartmentLabel('Ap. 9')).toBe('Ap. 9');
    expect(formatApartmentLabel('Scara B, parter')).toBe('Scara B, parter');
  });
});
