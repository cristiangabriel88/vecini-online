import type { Membership, Role } from '@/shared/types/domain';
import {
  buildOnboardingLink,
  generateInviteCode,
  generateInviteToken,
  normalizeInviteCode,
  normalizeInviteToken,
} from '@/shared/lib/inviteCode';

/**
 * One asociație invite code and its full lifecycle state. The shape mirrors the
 * `invite_codes` table (see `supabase/migrations/..._init_core.sql`) so the
 * offline store and the future live persistence (T55) stay aligned; timestamps
 * are kept as epoch ms here for cheap comparison and persistence. The live
 * table gained matching `role` + `single_use` columns in T60.
 */
export interface InviteCode {
  id: string;
  asociatieId: string;
  code: string;
  /**
   * Opaque high-entropy token carried by the onboarding deep link (T123). The
   * short `code` above stays as a manual-entry fallback; the token is the
   * primary, unguessable identifier the link resolves against. Hashing it at
   * rest on the live backend is the separate concern T128.
   */
  token: string;
  /** Role granted to whoever joins with this code. */
  role: Role;
  /** Apartment this code pre-links the joiner to, or null for none. */
  apartmentId: string | null;
  /** Epoch ms after which the code stops validating; null = never expires. */
  expiresAt: number | null;
  /** When true, the first consumption marks the code used; false = reusable. */
  singleUse: boolean;
  /** When the code was consumed (the latest consumption), or null. */
  consumedAt: number | null;
  /** The user who consumed it (the latest), or null. */
  consumedByUserId: string | null;
  /** When an admin revoked the code, or null. */
  revokedAt: number | null;
  createdAt: number;
  createdBy: string | null;
  /** Recipient the code was minted for, captured from the apartment surface so the
   *  invite can later be delivered by email (T147). Null for standing codes. */
  inviteeName: string | null;
  inviteeEmail: string | null;
  /** When the invitation email was dispatched (epoch ms), or null if never sent.
   *  Offline this is stamped the moment delivery is triggered; live it is set on
   *  a confirmed send by the `invite-email` function (T147). */
  emailSentAt: number | null;
  /** When the provider confirmed delivery (epoch ms), or null. Set only on the
   *  live path from a Resend delivery webhook; always null offline. */
  emailDeliveredAt: number | null;
}

/** Roles an admin may grant via an invite code (founder/platform roles excluded). */
export const INVITABLE_ROLES: Role[] = [
  'proprietar',
  'locatar',
  'comitet',
  'cenzor',
  'presedinte',
];

/** The outcome of validating a code before it can be consumed. */
export type InviteStatus = 'ok' | 'expired' | 'used' | 'revoked' | 'unknown';

export interface CreateInviteInput {
  asociatieId: string;
  role?: Role;
  apartmentId?: string | null;
  /** Epoch ms expiry, or null for a code that never expires. */
  expiresAt?: number | null;
  singleUse?: boolean;
  createdBy?: string | null;
  /** Optional recipient captured when inviting a specific apartment occupant. */
  inviteeName?: string | null;
  inviteeEmail?: string | null;
}

/** Common expiry presets (ms) offered by the admin surface. */
export const EXPIRY_PRESETS_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
} as const;

export type ExpiryPreset = keyof typeof EXPIRY_PRESETS_MS | 'never';

/**
 * Onboarding links (the admin setup link and the locatar invite link) are fixed
 * to a tight 24h window so a leaked link is short-lived (T123). Apartment-less
 * standing invites issued from the admin surface may still pick a longer preset.
 */
export const ONBOARDING_LINK_TTL_MS = EXPIRY_PRESETS_MS['24h'];

/** Resolve an expiry preset to an absolute epoch-ms instant (null = never). */
export function expiryFromPreset(preset: ExpiryPreset, now: number = Date.now()): number | null {
  return preset === 'never' ? null : now + EXPIRY_PRESETS_MS[preset];
}

/** Absolute expiry for an onboarding link issued now (24h from `now`). */
export function onboardingExpiry(now: number = Date.now()): number {
  return now + ONBOARDING_LINK_TTL_MS;
}

/**
 * Mint a new invite code for an asociație. The code is generated with the
 * shared unambiguous generator and regenerated on the rare chance it collides
 * with one already issued, so codes stay unique within the store. Pure: the
 * caller supplies the existing codes, the clock and the RNG.
 */
export function createInvite(
  input: CreateInviteInput,
  existingCodes: Iterable<string> = [],
  now: number = Date.now(),
  rng: () => number = Math.random,
): InviteCode {
  const taken = new Set(existingCodes);
  let code = generateInviteCode(rng);
  while (taken.has(code)) code = generateInviteCode(rng);
  return {
    id: `inv-${crypto.randomUUID()}`,
    asociatieId: input.asociatieId,
    code,
    token: generateInviteToken(),
    role: input.role ?? 'proprietar',
    apartmentId: input.apartmentId ?? null,
    expiresAt: input.expiresAt ?? null,
    singleUse: input.singleUse ?? true,
    consumedAt: null,
    consumedByUserId: null,
    revokedAt: null,
    createdAt: now,
    createdBy: input.createdBy ?? null,
    inviteeName: input.inviteeName ?? null,
    inviteeEmail: input.inviteeEmail ?? null,
    emailSentAt: null,
    emailDeliveredAt: null,
  };
}

/** Return a copy of the code marked as having had its invitation email sent. */
export function markInviteEmailSent(invite: InviteCode, now: number = Date.now()): InviteCode {
  return { ...invite, emailSentAt: now };
}

/** Return a copy of the code marked as having its invitation email confirmed delivered (T149). */
export function markInviteEmailDelivered(invite: InviteCode, now: number = Date.now()): InviteCode {
  return { ...invite, emailDeliveredAt: now };
}

/** Whether the invite has a recipient address it can be emailed to. */
export function canEmailInvite(invite: InviteCode): boolean {
  return Boolean(invite.inviteeEmail && invite.inviteeEmail.trim());
}

/** Look up a code by its (user-entered) value, normalising the input first. */
export function findByCode(invites: InviteCode[], code: string): InviteCode | undefined {
  const normalised = normalizeInviteCode(code);
  if (!normalised) return undefined;
  return invites.find((invite) => invite.code === normalised);
}

/** Look up a code by the opaque token carried in an onboarding link's query. */
export function findByToken(invites: InviteCode[], token: string): InviteCode | undefined {
  const normalised = normalizeInviteToken(token);
  if (!normalised) return undefined;
  return invites.find((invite) => invite.token === normalised);
}

/**
 * Build the locatar invite deep link for a code: an absolute URL carrying the
 * code's opaque token (T123). `baseUrl` is the app origin (callers pass
 * `env.appUrl`). Pure wrapper over the shared `buildOnboardingLink` so the
 * link-building rules live in one place.
 */
export function buildInviteLink(invite: InviteCode, baseUrl: string): string {
  return buildOnboardingLink(baseUrl, invite.token);
}

/**
 * Decide whether a code may currently be consumed. Order matters: an
 * unknown/revoked code is reported as such regardless of expiry, and a
 * single-use code that was already consumed reads as `used` even past expiry.
 */
export function validateInvite(
  invite: InviteCode | undefined,
  now: number = Date.now(),
): InviteStatus {
  if (!invite) return 'unknown';
  if (invite.revokedAt !== null) return 'revoked';
  if (invite.singleUse && invite.consumedAt !== null) return 'used';
  if (invite.expiresAt !== null && now >= invite.expiresAt) return 'expired';
  return 'ok';
}

/** True when a code can still be redeemed right now. */
export function isRedeemable(invite: InviteCode | undefined, now: number = Date.now()): boolean {
  return validateInvite(invite, now) === 'ok';
}

/**
 * Whether an apartment has an account holder yet, derived from the invite trail:
 * true when at least one (non-revoked) code linked to the apartment has been
 * redeemed. This is the offline signal the apartment surface uses for the
 * "registered" status until live account-to-apartment linking lands.
 */
export function isApartmentRegistered(apartmentId: string, invites: InviteCode[]): boolean {
  return invites.some(
    (invite) =>
      invite.apartmentId === apartmentId &&
      invite.revokedAt === null &&
      invite.consumedAt !== null,
  );
}

/**
 * Return a copy of the code marked consumed by `userId`. Pure; the store wraps
 * this with a re-validation guard so a single-use code cannot be double-spent.
 */
export function consumeInvite(
  invite: InviteCode,
  userId: string,
  now: number = Date.now(),
): InviteCode {
  return { ...invite, consumedAt: now, consumedByUserId: userId };
}

/** Return a copy of the code marked revoked. */
export function revokeInvite(invite: InviteCode, now: number = Date.now()): InviteCode {
  return { ...invite, revokedAt: now };
}

/**
 * Build the membership a joiner gets when they redeem an invite code: they enter
 * the code's asociație with the role the code grants. Pure and side-effect-free
 * so the join flow's effect on tenant state is unit-testable; the caller is
 * responsible for consuming the code first (the replay-safe gate). The code's
 * `apartmentId` rides along to the live join RPC (T55) where the apartment
 * ownership link is written server-side; the offline membership model carries
 * only the role and asociație. A granted founder/platform `admin` is never
 * issuable (see `INVITABLE_ROLES`), so a joined membership is always a member
 * role, never the founder.
 */
export function buildMembershipFromInvite(
  userId: string,
  invite: InviteCode,
  now: string = new Date().toISOString(),
): Membership {
  return {
    id: `mem-${crypto.randomUUID()}`,
    user_id: userId,
    asociatie_id: invite.asociatieId,
    role: invite.role,
    title: null,
    joined_at: now,
    ended_at: null,
  };
}
