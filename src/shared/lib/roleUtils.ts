import type { Role } from '../types/domain';

/** Roles that can govern the asociatie's content and operations. */
export const GOVERNANCE_ROLES: ReadonlySet<string> = new Set(['admin', 'presedinte', 'comitet']);

/**
 * Wider oversight tier: governance roles plus auditor and platform superadmin.
 * Used by functions that allow read access to sensitive data (e.g. profiles).
 */
export const BOARD_ROLES: ReadonlySet<string> = new Set([
  'admin',
  'presedinte',
  'comitet',
  'cenzor',
  'super_admin',
]);

/** True when the role may create, edit, or delete governed content. */
export function isGovernanceRole(role: Role | string | null): boolean {
  return role !== null && GOVERNANCE_ROLES.has(role);
}

/** True when the role has broader oversight access (governance + cenzor + super_admin). */
export function isBoardRole(role: Role | string | null): boolean {
  return role !== null && BOARD_ROLES.has(role);
}
