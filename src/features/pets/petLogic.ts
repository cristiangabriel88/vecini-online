import type { Pet } from '@/shared/types/domain';
import { normalizeSearch } from '@/features/faq/faqLogic';

/** Known species used for the add form and filter; `altele` covers the rest. */
export const PET_SPECIES = ['caine', 'pisica', 'papagal', 'rozator', 'altele'] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];

/** A pet profile needs a name and a species. */
export function isValidPet(name: string, species: string): boolean {
  return name.trim().length > 0 && species.trim().length > 0;
}

/** Filter pets by free-text query (name + owner) and optional species; lost
 *  pets float to the top so the lost & found is visible first. */
export function searchPets(
  pets: Pet[],
  query: string,
  species: PetSpecies | 'all' = 'all',
): Pet[] {
  const q = normalizeSearch(query.trim());
  return pets
    .filter((p) => {
      if (species !== 'all' && p.species !== species) return false;
      if (!q) return true;
      return normalizeSearch(`${p.name} ${p.owner_name}`).includes(q);
    })
    .sort((a, b) => {
      if (a.lost !== b.lost) return a.lost ? -1 : 1;
      return a.name.localeCompare(b.name, 'ro');
    });
}
