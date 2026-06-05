import { DEMO_ASOCIATIE, DEMO_APARTMENTS } from '@/shared/demo/demoData';

/**
 * Offline demo dataset for the platform console (T93). The platform app must run
 * fully offline like the main app, so the shell's overview is fed from a small,
 * representative set of asociație summaries. Live cross-tenant reads (the real
 * asociații list, members, audit, metrics) are layered on by the console pages
 * T94/T95/T97 behind `isSupabaseConfigured`; this seed keeps the demo complete.
 */
/** Lifecycle status of an asociație on the platform (T249). */
export type AsociatieStatus = 'active' | 'suspended' | 'archived';

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
  /** Asociație identity captured at provisioning (T122). Optional: an operator may
   *  provision with only the core fields and the admin completes them later in
   *  building settings. Empty string when not captured. */
  address?: string;
  /** Fiscal code (CUI/CIF). */
  cui?: string;
  /** Official registration number. */
  registrationNumber?: string;
  /** Bank account (IBAN) the asociație collects into. */
  iban?: string;
  /** Public contact phone. */
  contactPhone?: string;
  /** Public contact email. */
  contactEmail?: string;
  /** Lifecycle status (T249). Defaults to 'active' when absent. */
  status?: AsociatieStatus;
  /** Operator-supplied reason for a lifecycle status change. */
  statusReason?: string;
  /** ISO instant the status was last changed. */
  statusChangedAt?: string;
}

/** A member of the platform operator team (T251). */
export interface PlatformTeamAdmin {
  userId: string;
  name: string;
  email: string;
  grantedAt: string;
  lastSignInAt: string | null;
}

/** A pending invitation to join the platform operator team (T251). */
export interface PlatformTeamInvite {
  id: string;
  name: string;
  email: string;
  invitedAt: string;
}

/** The signed-in demo platform operator (a fictional SaaS owner account). */
export const DEMO_PLATFORM_ADMIN = {
  id: 'pa-demo',
  name: 'Operator platformă',
  email: 'operator@vecini.online',
} as const;

/** The two-member demo platform operator roster (T251). */
export const DEMO_PLATFORM_TEAM: PlatformTeamAdmin[] = [
  {
    userId: 'pa-demo',
    name: 'Operator platformă',
    email: 'operator@vecini.online',
    grantedAt: '2026-01-15T09:00:00Z',
    lastSignInAt: '2026-06-05T10:00:00Z',
  },
  {
    userId: 'pa-demo-2',
    name: 'Ana Georgescu',
    email: 'ana.georgescu@vecini.online',
    grantedAt: '2026-03-10T14:30:00Z',
    lastSignInAt: '2026-06-03T16:45:00Z',
  },
];

export const DEMO_PLATFORM_ASOCIATII: PlatformAsociatieSummary[] = [
  {
    id: DEMO_ASOCIATIE.id,
    name: DEMO_ASOCIATIE.name,
    city: 'București',
    members: 42,
    apartments: DEMO_APARTMENTS.length,
    lastAdminSignInAt: '2026-05-24T19:30:00Z',
    address: 'Str. Aleea Teilor nr. 12, Sector 4, București',
    cui: '12345678',
    registrationNumber: '4521/2019',
    iban: 'RO49AAAA1B31007593840000',
    contactPhone: '+40 21 555 0123',
    contactEmail: 'contact@bloc12.ro',
    status: 'active' as AsociatieStatus,
  },
  {
    id: 'demo-asoc-2',
    name: 'Asociația de Proprietari Bloc 7, Aleea Crinului',
    city: 'Cluj-Napoca',
    members: 28,
    apartments: 24,
    lastAdminSignInAt: '2026-05-22T08:10:00Z',
    address: 'Aleea Crinului nr. 7, Cluj-Napoca',
    cui: '23456789',
    registrationNumber: '1187/2020',
    iban: 'RO12BTRL0130120100000001',
    contactPhone: '+40 264 555 210',
    contactEmail: 'contact@bloc7crinului.ro',
    status: 'active' as AsociatieStatus,
  },
  {
    id: 'demo-asoc-3',
    name: 'Asociația de Proprietari Str. Mihai Viteazul 3',
    city: 'Timișoara',
    members: 16,
    apartments: 18,
    lastAdminSignInAt: '2026-04-30T14:05:00Z',
    address: 'Str. Mihai Viteazul nr. 3, Timișoara',
    cui: '34567890',
    registrationNumber: '902/2018',
    iban: 'RO98RNCB0072000000010001',
    contactPhone: '+40 256 555 330',
    contactEmail: 'contact@mihaiviteazul3.ro',
    status: 'suspended' as AsociatieStatus,
    statusReason: 'Sold restant mai mult de 3 luni',
    statusChangedAt: '2026-06-01T10:00:00Z',
  },
];

/** A platform-wide broadcast / maintenance notice (T253). */
export interface PlatformBroadcast {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  target: 'all' | 'admin';
  startsAt: string;
  endsAt: string | null;
  createdBy: string;
  createdAt: string;
  expiredAt: string | null;
}

/** Demo seeded broadcasts (T253). One active info notice, one expired warning. */
export const DEMO_PLATFORM_BROADCASTS: PlatformBroadcast[] = [
  {
    id: 'pb-demo-1',
    title: 'Mentenanță programată',
    body: 'Duminică, 08 iunie 2026, între orele 02:00 si 06:00, serverele vor fi in mentenanță. Aplicatia nu va fi disponibila in acest interval.',
    severity: 'info',
    target: 'all',
    startsAt: '2026-06-06T00:00:00Z',
    endsAt: '2026-06-08T06:00:00Z',
    createdBy: 'pa-demo',
    createdAt: '2026-06-06T09:00:00Z',
    expiredAt: null,
  },
  {
    id: 'pb-demo-2',
    title: 'Incident rezolvat',
    body: 'Incidentul care a afectat modulul de anunturi in data de 04 iunie a fost rezolvat. Multumim pentru rabdare.',
    severity: 'warning',
    target: 'all',
    startsAt: '2026-06-04T14:00:00Z',
    endsAt: '2026-06-05T23:59:00Z',
    createdBy: 'pa-demo',
    createdAt: '2026-06-04T14:00:00Z',
    expiredAt: '2026-06-05T12:00:00Z',
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
