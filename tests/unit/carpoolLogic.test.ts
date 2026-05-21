import { describe, expect, it } from 'vitest';
import { isValidProfile, searchProfiles } from '@/features/carpool/carpoolLogic';
import type { CarpoolProfile } from '@/shared/types/domain';

const base = { asociatie_id: 'a' };
const profiles: CarpoolProfile[] = [
  { ...base, id: '1', user_id: 'u1', user_name: 'Popescu Andrei', destination: 'Pipera', schedule: 'L–V 08:00' },
  { ...base, id: '2', user_id: 'u2', user_name: 'Georgescu Elena', destination: 'Centru — Universitate', schedule: 'L–V 07:30' },
  { ...base, id: '3', user_id: 'u3', user_name: 'Ionescu Radu', destination: 'Băneasa', schedule: 'L–S 09:00' },
];

describe('isValidProfile', () => {
  it('requires a destination of at least two chars', () => {
    expect(isValidProfile('Pipera')).toBe(true);
    expect(isValidProfile(' a ')).toBe(false);
    expect(isValidProfile('   ')).toBe(false);
  });
});

describe('searchProfiles', () => {
  it('sorts alphabetically by destination', () => {
    expect(searchProfiles(profiles).map((p) => p.id)).toEqual(['3', '2', '1']);
  });

  it('matches free text over destination, schedule and name ignoring diacritics', () => {
    expect(searchProfiles(profiles, 'universitate').map((p) => p.id)).toEqual(['2']);
    expect(searchProfiles(profiles, 'baneasa').map((p) => p.id)).toEqual(['3']);
    expect(searchProfiles(profiles, 'andrei').map((p) => p.id)).toEqual(['1']);
  });
});
