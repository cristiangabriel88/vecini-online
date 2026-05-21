import { describe, expect, it } from 'vitest';
import { isValidPet, searchPets } from '@/features/pets/petLogic';
import type { Pet } from '@/shared/types/domain';

const base = { asociatie_id: 'a', owner_user_id: 'u', photo_path: null, emergency_contact: null };

const pets: Pet[] = [
  { ...base, id: '1', owner_name: 'Andrei', name: 'Rex', species: 'caine', lost: false, created_at: '2026-03-01T09:00:00Z' },
  { ...base, id: '2', owner_name: 'Elena', name: 'Miru', species: 'pisica', lost: true, created_at: '2026-02-10T09:00:00Z' },
  { ...base, id: '3', owner_name: 'Gabriela', name: 'Coco', species: 'papagal', lost: false, created_at: '2026-01-20T09:00:00Z' },
];

describe('isValidPet', () => {
  it('requires a name and species', () => {
    expect(isValidPet('Rex', 'caine')).toBe(true);
    expect(isValidPet('', 'caine')).toBe(false);
    expect(isValidPet('Rex', '')).toBe(false);
  });
});

describe('searchPets', () => {
  it('floats lost pets to the top, then sorts by name', () => {
    expect(searchPets(pets, '').map((p) => p.id)).toEqual(['2', '3', '1']);
  });

  it('filters by species', () => {
    expect(searchPets(pets, '', 'pisica').map((p) => p.id)).toEqual(['2']);
  });

  it('matches name or owner ignoring diacritics', () => {
    expect(searchPets(pets, 'miru').map((p) => p.id)).toEqual(['2']);
    expect(searchPets(pets, 'gabriela').map((p) => p.id)).toEqual(['3']);
  });
});
