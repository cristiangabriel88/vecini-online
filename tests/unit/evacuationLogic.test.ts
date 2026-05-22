import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_KINDS,
  countByKind,
  equipmentIcon,
  isValidPetMarker,
  isValidPlan,
  markersForApartment,
  petApartmentCount,
  sortPlans,
} from '@/features/evacuation/evacuationLogic';
import type { EvacuationPlan, PetMarker } from '@/shared/types/domain';

const plan = (scara: string): EvacuationPlan => ({
  id: `ev-${scara}`,
  asociatie_id: 'a',
  scara,
  route: 'Ieșire pe casa scării principale, punct de adunare în fața blocului.',
  equipment: [
    { id: 'e1', kind: 'stingator', location: 'palier 1' },
    { id: 'e2', kind: 'stingator', location: 'palier 2' },
    { id: 'e3', kind: 'hidrant', location: 'parter' },
  ],
  updated_at: '2026-01-01',
});

const marker = (id: string, apartmentId: string): PetMarker => ({
  id,
  asociatie_id: 'a',
  apartment_id: apartmentId,
  apartment_label: apartmentId,
  species: '1 pisică',
  user_id: 'u',
});

describe('equipmentIcon', () => {
  it('maps every kind to a registered icon name', () => {
    expect(equipmentIcon('stingator')).toBe('FireExtinguisher');
    expect(equipmentIcon('hidrant')).toBe('Droplet');
    expect(equipmentIcon('iesire')).toBe('DoorOpen');
    expect(equipmentIcon('tablou_electric')).toBe('Zap');
    expect(EQUIPMENT_KINDS).toHaveLength(4);
  });
});

describe('isValidPlan', () => {
  it('needs a stairwell and a 10+ char route', () => {
    expect(isValidPlan('A', 'Ieșire pe scara principală.')).toBe(true);
    expect(isValidPlan('', 'Ieșire pe scara principală.')).toBe(false);
    expect(isValidPlan('A', 'scurt')).toBe(false);
  });
});

describe('isValidPetMarker', () => {
  it('needs an apartment and a 2+ char species note', () => {
    expect(isValidPetMarker('ap-2', '1 pisică')).toBe(true);
    expect(isValidPetMarker('', '1 pisică')).toBe(false);
    expect(isValidPetMarker('ap-2', 'x')).toBe(false);
  });
});

describe('sortPlans', () => {
  it('orders by stairwell label without mutating', () => {
    const input = [plan('C'), plan('A'), plan('B')];
    expect(sortPlans(input).map((p) => p.scara)).toEqual(['A', 'B', 'C']);
    expect(input[0].scara).toBe('C');
  });
});

describe('countByKind', () => {
  it('counts fixtures of a given kind', () => {
    const p = plan('A');
    expect(countByKind(p, 'stingator')).toBe(2);
    expect(countByKind(p, 'hidrant')).toBe(1);
    expect(countByKind(p, 'iesire')).toBe(0);
  });
});

describe('pet markers', () => {
  const markers = [marker('1', 'ap-3'), marker('2', 'ap-5'), marker('3', 'ap-3')];

  it('filters markers for an apartment', () => {
    expect(markersForApartment(markers, 'ap-3').map((m) => m.id)).toEqual(['1', '3']);
  });

  it('counts distinct apartments with pets', () => {
    expect(petApartmentCount(markers)).toBe(2);
  });
});
