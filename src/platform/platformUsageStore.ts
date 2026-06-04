import { create } from 'zustand';
import { DEMO_PLATFORM_ASOCIATII } from './demoPlatform';

export type HealthStatus = 'active' | 'moderate' | 'dormant';

export interface AssocUsageMetric {
  asociatie_id: string;
  name: string;
  city: string;
  members: number;
  apartments: number;
  lastAdminSignInAt: string | null;
  recentAnnouncements: number;
  recentTickets: number;
  recentVotes: number;
  healthStatus: HealthStatus;
}

export interface UsageRollup {
  total: number;
  active: number;
  moderate: number;
  dormant: number;
  totalMembers: number;
  totalApartments: number;
}

const ACTIVE_THRESHOLD_DAYS = 14;
const DORMANT_THRESHOLD_DAYS = 60;

export function deriveHealthStatus(
  lastSignInAt: string | null,
  now = Date.now(),
): HealthStatus {
  if (!lastSignInAt) return 'dormant';
  const diffDays = (now - new Date(lastSignInAt).getTime()) / 86400000;
  if (diffDays < ACTIVE_THRESHOLD_DAYS) return 'active';
  if (diffDays < DORMANT_THRESHOLD_DAYS) return 'moderate';
  return 'dormant';
}

export function computeRollup(metrics: AssocUsageMetric[]): UsageRollup {
  return metrics.reduce<UsageRollup>(
    (acc, m) => ({
      total: acc.total + 1,
      active: acc.active + (m.healthStatus === 'active' ? 1 : 0),
      moderate: acc.moderate + (m.healthStatus === 'moderate' ? 1 : 0),
      dormant: acc.dormant + (m.healthStatus === 'dormant' ? 1 : 0),
      totalMembers: acc.totalMembers + m.members,
      totalApartments: acc.totalApartments + m.apartments,
    }),
    { total: 0, active: 0, moderate: 0, dormant: 0, totalMembers: 0, totalApartments: 0 },
  );
}

// Demo seed -- T0 = 2026-06-04T00:00:00Z (1780531200000)
// Bloc 12 (Bucuresti): last sign-in 2026-05-24 (~11 days) -> active
// Bloc 7 (Cluj-Napoca): last sign-in 2026-05-22 (~13 days) -> active
// Mihai Viteazul (Timisoara): last sign-in 2026-04-30 (~35 days) -> moderate
const DEMO_T0 = 1780531200000;
const DEMO_ACTIVITY = [
  { ann: 12, tickets: 8, votes: 3 },
  { ann: 7, tickets: 5, votes: 1 },
  { ann: 2, tickets: 3, votes: 0 },
];

const DEMO_METRICS: AssocUsageMetric[] = DEMO_PLATFORM_ASOCIATII.map((a, i) => ({
  asociatie_id: a.id,
  name: a.name,
  city: a.city,
  members: a.members,
  apartments: a.apartments,
  lastAdminSignInAt: a.lastAdminSignInAt,
  recentAnnouncements: DEMO_ACTIVITY[i]?.ann ?? 0,
  recentTickets: DEMO_ACTIVITY[i]?.tickets ?? 0,
  recentVotes: DEMO_ACTIVITY[i]?.votes ?? 0,
  healthStatus: deriveHealthStatus(a.lastAdminSignInAt, DEMO_T0),
}));

interface PlatformUsageState {
  metrics: AssocUsageMetric[];
  fetchError: string | null;
  setMetrics: (metrics: AssocUsageMetric[]) => void;
  setFetchError: (err: string | null) => void;
}

export const usePlatformUsageStore = create<PlatformUsageState>()((set) => ({
  metrics: DEMO_METRICS,
  fetchError: null,
  setMetrics: (metrics) => set({ metrics, fetchError: null }),
  setFetchError: (fetchError) => set({ fetchError }),
}));
