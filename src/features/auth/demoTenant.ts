import type { Membership, Role } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';

/**
 * Display title seeded alongside each demo role so the chrome shows a sensible
 * label. These mirror the Romanian role names used across the app.
 */
const DEMO_ROLE_TITLE: Record<Role, string> = {
  super_admin: 'Superadmin platformă',
  admin: 'Administrator',
  presedinte: 'Președinte',
  comitet: 'Comitet',
  cenzor: 'Cenzor',
  proprietar: 'Proprietar',
  chirias: 'Chiriaș',
};

/**
 * Build the single offline membership for a demo session in a given role. Demo
 * entry has no backend to hydrate from, so the app needs a real active asociație
 * + role to scope by; seeding the chosen role lets the login screen preview the
 * app exactly as that user (admin, superadmin, or a plain locatar) would see it.
 */
export function demoMembershipForRole(role: Role): Membership {
  return {
    id: 'mem-demo',
    user_id: DEMO_CURRENT_USER_ID,
    asociatie_id: DEMO_ASOCIATIE.id,
    role,
    title: DEMO_ROLE_TITLE[role],
    joined_at: DEMO_ASOCIATIE.created_at,
    ended_at: null,
  };
}

/**
 * The default demo membership keeps the `admin` persona, so a single offline
 * session can still drive both the admin and resident halves of the MVP loop.
 */
export const DEMO_MEMBERSHIP: Membership = demoMembershipForRole('admin');

export interface TenantContext {
  currentAsociatieId: string | null;
  memberships: Membership[];
}

/** The seeded local tenant context applied when entering demo mode as `role`. */
export function demoTenantContext(role: Role = 'admin'): TenantContext {
  // A platform superadmin is not an association member — their authority lives in
  // `platform_admins` (server-side), surfaced as `authStore.isPlatformSuperAdmin`.
  // So the superadmin preview carries no membership, proving the superadmin path
  // works without a (fake) association membership, exactly as it must live.
  if (role === 'super_admin') {
    return { currentAsociatieId: null, memberships: [] };
  }
  return {
    currentAsociatieId: DEMO_ASOCIATIE.id,
    memberships: [demoMembershipForRole(role)],
  };
}
