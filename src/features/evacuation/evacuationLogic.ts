import type {
  EvacuationEquipmentKind,
  EvacuationPlan,
  PetMarker,
} from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_EVACUATION_PLANS, DEMO_PET_MARKERS } from '@/shared/demo/demoData';

/** All fixture kinds, in the order shown in the picker. */
export const EQUIPMENT_KINDS: EvacuationEquipmentKind[] = [
  'stingator',
  'hidrant',
  'iesire',
  'tablou_electric',
];

/** lucide-react icon name per fixture kind. */
export function equipmentIcon(kind: EvacuationEquipmentKind): string {
  switch (kind) {
    case 'stingator':
      return 'FireExtinguisher';
    case 'hidrant':
      return 'Droplet';
    case 'iesire':
      return 'DoorOpen';
    default:
      return 'Zap';
  }
}

/** A plan needs a stairwell label and a 10+ char route description. */
export function isValidPlan(scara: string, route: string): boolean {
  return scara.trim().length >= 1 && route.trim().length >= 10;
}

/** A fixture needs a kind and a 2+ char location. */
export function isValidEquipment(location: string): boolean {
  return location.trim().length >= 2;
}

/** A pet marker needs an apartment and a 2+ char species note. */
export function isValidPetMarker(apartmentId: string, species: string): boolean {
  return apartmentId.trim().length > 0 && species.trim().length >= 2;
}

/** Plans sorted by stairwell label (natural order). */
export function sortPlans(plans: EvacuationPlan[]): EvacuationPlan[] {
  return [...plans].sort((a, b) => a.scara.localeCompare(b.scara, 'ro', { numeric: true }));
}

/** How many fixtures of a given kind a plan lists. */
export function countByKind(plan: EvacuationPlan, kind: EvacuationEquipmentKind): number {
  return plan.equipment.filter((e) => e.kind === kind).length;
}

/** Pet markers for a given apartment. */
export function markersForApartment(markers: PetMarker[], apartmentId: string): PetMarker[] {
  return markers.filter((m) => m.apartment_id === apartmentId);
}

/** Total number of apartments flagged as having pets (distinct apartments). */
export function petApartmentCount(markers: PetMarker[]): number {
  return new Set(markers.map((m) => m.apartment_id)).size;
}

// ── Per-asociatie evacuation data catalog ────────────────────────────────────

export interface EvacuationData {
  plans: EvacuationPlan[];
  markers: PetMarker[];
}

export type EvacuationByAsociatie = Record<string, EvacuationData>;

const EMPTY_DATA: EvacuationData = { plans: [], markers: [] };

export function evacuationForAsociatie(map: EvacuationByAsociatie, asociatieId: string | null): EvacuationData {
  if (!asociatieId) return EMPTY_DATA;
  return map[asociatieId] ?? EMPTY_DATA;
}

export function seedEvacuation(): EvacuationByAsociatie {
  return {
    [DEMO_ASOCIATIE.id]: {
      plans: DEMO_EVACUATION_PLANS.map((p) => ({ ...p, equipment: p.equipment.map((e) => ({ ...e })) })),
      markers: DEMO_PET_MARKERS.map((m) => ({ ...m })),
    },
  };
}

export function addPlanIn(map: EvacuationByAsociatie, asociatieId: string, plan: EvacuationPlan): EvacuationByAsociatie {
  const current = evacuationForAsociatie(map, asociatieId);
  return { ...map, [asociatieId]: { ...current, plans: [...current.plans, plan] } };
}

export function setMarkerIn(map: EvacuationByAsociatie, asociatieId: string, marker: PetMarker): EvacuationByAsociatie {
  const current = evacuationForAsociatie(map, asociatieId);
  const without = current.markers.filter((m) => !(m.user_id === marker.user_id && m.apartment_id === marker.apartment_id));
  return { ...map, [asociatieId]: { ...current, markers: [...without, marker] } };
}

export function clearMarkerIn(map: EvacuationByAsociatie, asociatieId: string, userId: string, apartmentId: string): EvacuationByAsociatie {
  const current = evacuationForAsociatie(map, asociatieId);
  return { ...map, [asociatieId]: { ...current, markers: current.markers.filter((m) => !(m.user_id === userId && m.apartment_id === apartmentId)) } };
}

export function migrateEvacuationState(persisted: unknown): EvacuationByAsociatie {
  const p = persisted as { byAsociatie?: EvacuationByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return {
    ...existing,
    [DEMO_ASOCIATIE.id]: {
      plans: DEMO_EVACUATION_PLANS.map((pl) => ({ ...pl, equipment: pl.equipment.map((e) => ({ ...e })) })),
      markers: DEMO_PET_MARKERS.map((m) => ({ ...m })),
    },
  };
}
