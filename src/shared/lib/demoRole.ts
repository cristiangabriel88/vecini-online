import type { Role } from '@/shared/types/domain';

/** Roles a demo session can preview as (every tenant role plus the platform tier). */
export const DEMO_ROLES: Role[] = [
  'admin',
  'presedinte',
  'comitet',
  'cenzor',
  'proprietar',
  'locatar',
  'super_admin',
];

/** localStorage key the demo entry persists the chosen persona under (T174). */
export const DEMO_ROLE_STORAGE_KEY = 'iv.demo.role';

/** Read the persisted demo role from localStorage; fall back to 'admin'. */
export function readLastDemoRole(): Role {
  try {
    const stored = localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
    if (stored && (DEMO_ROLES as string[]).includes(stored)) return stored as Role;
  } catch { /* storage unavailable */ }
  return 'admin';
}
