import { DEMO_ASOCIATIE, DEMO_APARTMENTS } from '@/shared/demo/demoData';

/**
 * Offline demo dataset for the platform console (T93). The platform app must run
 * fully offline like the main app, so the shell's overview is fed from a small,
 * representative set of asociație summaries. Live cross-tenant reads (the real
 * asociații list, members, audit, metrics) are layered on by the console pages
 * T94/T95/T97 behind `isSupabaseConfigured`; this seed keeps the demo complete.
 */
export interface PlatformAsociatieSummary {
  id: string;
  name: string;
  city: string;
  /** Active members (residents + management) registered for the asociație. */
  members: number;
  /** Apartments configured in the asociație's registry. */
  apartments: number;
  /** ISO date of the most recent admin sign-in, or null if the admin has never
   *  signed in yet (a freshly provisioned asociație). Drives the dormant signal. */
  lastAdminSignInAt: string | null;
}

/** The signed-in demo platform operator (a fictional SaaS owner account). */
export const DEMO_PLATFORM_ADMIN = {
  id: 'pa-demo',
  name: 'Operator platformă',
  email: 'operator@vecini.online',
} as const;

export const DEMO_PLATFORM_ASOCIATII: PlatformAsociatieSummary[] = [
  {
    id: DEMO_ASOCIATIE.id,
    name: DEMO_ASOCIATIE.name,
    city: 'București',
    members: 42,
    apartments: DEMO_APARTMENTS.length,
    lastAdminSignInAt: '2026-05-24T19:30:00Z',
  },
  {
    id: 'demo-asoc-2',
    name: 'Asociația de Proprietari Bloc 7, Aleea Crinului',
    city: 'Cluj-Napoca',
    members: 28,
    apartments: 24,
    lastAdminSignInAt: '2026-05-22T08:10:00Z',
  },
  {
    id: 'demo-asoc-3',
    name: 'Asociația de Proprietari Str. Mihai Viteazul 3',
    city: 'Timișoara',
    members: 16,
    apartments: 18,
    lastAdminSignInAt: '2026-04-30T14:05:00Z',
  },
];

export interface PlatformTotals {
  asociatii: number;
  members: number;
  apartments: number;
}

/** Aggregate the headline platform totals from the asociație summaries. */
export function platformTotals(rows: PlatformAsociatieSummary[]): PlatformTotals {
  return rows.reduce<PlatformTotals>(
    (acc, r) => ({
      asociatii: acc.asociatii + 1,
      members: acc.members + r.members,
      apartments: acc.apartments + r.apartments,
    }),
    { asociatii: 0, members: 0, apartments: 0 },
  );
}
