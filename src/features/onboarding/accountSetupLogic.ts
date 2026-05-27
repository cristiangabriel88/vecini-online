import type { Role } from '@/shared/types/domain';
import {
  type InviteCode,
  type InviteStatus,
  findByCode,
  findByToken,
  validateInvite,
} from '@/features/invites/inviteLogic';
import { normalizeInviteCode, normalizeInviteToken } from '@/shared/lib/inviteCode';
import { isValidEmail } from '@/features/auth/authLogic';
import { type PasswordAssessment, evaluatePassword } from '@/features/auth/passwordPolicy';

/**
 * Pure logic for the account-creation-on-redemption landing (T124).
 *
 * The landing is reached two ways: an onboarding deep link carrying an opaque
 * token, or the short fallback code typed by hand. Both resolve to one of two
 * onboarding kinds:
 *
 * - a **locatar invite** (minted in the invite lifecycle, T41/T42): the invitee
 *   joins the code's asociație with the role + apartment the code grants; or
 * - an **admin setup link** (minted by the platform operator when provisioning a
 *   new asociație, T94/T123): the invitee becomes that asociație's administrator.
 *
 * This module is side-effect-free so it unit-tests in isolation and runs
 * identically offline and live. It takes already-fetched store data (the invite
 * list + a structural view of the setup provisions) and returns a descriptor;
 * consuming the token and activating the membership are the stores' concern.
 */

/** Which onboarding flow a token/code resolves to. */
export type OnboardingKind = 'invite' | 'setup';

/**
 * A structural, store-agnostic view of one admin setup provision, so this pure
 * module never imports the platform store. The platform store maps its records
 * into this shape (resolving the asociație's display name).
 */
export interface SetupProvisionLike {
  asociatieId: string;
  asociatieName: string;
  /** Opaque high-entropy token backing the secure setup link (T123). */
  setupToken: string;
  /** Short manual-entry fallback code handed to the admin. */
  setupCode: string;
  /** Epoch ms the setup link/code expires (24h from provisioning). */
  expiresAt: number;
  /** When the setup was redeemed (single-use), or null. */
  redeemedAt: number | null;
}

/** The resolved onboarding target for display before the invitee submits. */
export interface ResolvedOnboarding {
  kind: OnboardingKind;
  /** Redeemability of the matched token/code; `ok` means it can be consumed. */
  status: InviteStatus;
  asociatieId: string;
  /** The asociație's display name when known (always for setup, null for an invite). */
  asociatieName: string | null;
  /** Role the invitee gets: the code's role for an invite, `admin` for a setup link. */
  role: Role;
}

/**
 * Validate an admin setup provision the same way `validateInvite` validates a
 * code: an unknown record is `unknown`, an already-redeemed one is `used`, an
 * expired one is `expired`, otherwise `ok`. Order matters so a redeemed link
 * reads as `used` even past expiry.
 */
export function setupProvisionStatus(
  record: SetupProvisionLike | undefined,
  now: number = Date.now(),
): InviteStatus {
  if (!record) return 'unknown';
  if (record.redeemedAt !== null) return 'used';
  if (now >= record.expiresAt) return 'expired';
  return 'ok';
}

/**
 * Resolve an onboarding value (an opaque token from a link, or the short manual
 * code) against the invite list and the setup provisions. The invite lifecycle
 * is checked first; a setup link is matched only when no invite matches. Returns
 * null when the value matches nothing at all.
 */
export function resolveOnboarding(
  value: string,
  invites: InviteCode[],
  provisions: SetupProvisionLike[],
  now: number = Date.now(),
): ResolvedOnboarding | null {
  const invite = findByToken(invites, value) ?? findByCode(invites, value);
  if (invite) {
    return {
      kind: 'invite',
      status: validateInvite(invite, now),
      asociatieId: invite.asociatieId,
      asociatieName: null,
      role: invite.role,
    };
  }
  const token = normalizeInviteToken(value);
  const code = normalizeInviteCode(value);
  const provision = provisions.find(
    (p) => p.setupToken === token || (code.length > 0 && p.setupCode === code),
  );
  if (provision) {
    return {
      kind: 'setup',
      status: setupProvisionStatus(provision, now),
      asociatieId: provision.asociatieId,
      asociatieName: provision.asociatieName,
      role: 'admin',
    };
  }
  return null;
}

/** The invitee's account-creation form fields. */
export interface AccountForm {
  /** The invitee's display name, seeded into their profile on redemption (T146). */
  name: string;
  email: string;
  password: string;
  confirm: string;
}

/** The evaluated form: per-field validity plus the password meter assessment. */
export interface AccountFormResult {
  /** True only when every field is valid and safe to submit. */
  ok: boolean;
  /** True when the name is present but too short/long (for an inline error). */
  nameInvalid: boolean;
  /** True when the email is present but malformed (for an inline error). */
  emailInvalid: boolean;
  /** The password policy assessment, backing the strength meter + first issue. */
  assessment: PasswordAssessment;
  /** True when the confirmation is non-empty and differs from the password. */
  mismatch: boolean;
}

/** Bounds for the invitee's display name (a real human name, not a handle). */
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 80;

/**
 * A display name is acceptable when, trimmed, it falls within the length bounds.
 * Romanian names carry diacritics, hyphens and spaces, so no character class is
 * imposed beyond a sane length. Pure so the submit gate is unit-testable.
 */
export function isValidName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= NAME_MIN_LENGTH && trimmed.length <= NAME_MAX_LENGTH;
}

/**
 * Returns the post-setup navigation target for a successfully consumed
 * onboarding token.
 *
 * - `'setup'` tokens (admin provisioning links) redirect to the onboarding
 *   wizard so the admin configures their asociatie before landing in the app.
 * - `'invite'` tokens (locatar invites) land directly in the app.
 *
 * Extracted as a pure function so the branching rule is unit-testable
 * independently of the React page.
 */
export function postSetupRoute(kind: OnboardingKind): string {
  return kind === 'setup' ? '/onboarding' : '/app';
}

/**
 * Evaluate the account-creation form: a valid email, a password that clears the
 * full policy (`passwordPolicy.evaluatePassword`), and a matching confirmation.
 * Pure so the page's submit gate is unit-testable.
 */
export function evaluateAccountForm(form: AccountForm): AccountFormResult {
  const email = form.email.trim();
  const emailValid = isValidEmail(email);
  const nameValid = isValidName(form.name);
  const assessment = evaluatePassword(form.password, email);
  const mismatch = form.confirm.length > 0 && form.password !== form.confirm;
  const ok =
    nameValid &&
    emailValid &&
    assessment.ok &&
    form.confirm.length > 0 &&
    form.password === form.confirm;
  return {
    ok,
    nameInvalid: form.name.trim().length > 0 && !nameValid,
    emailInvalid: email.length > 0 && !emailValid,
    assessment,
    mismatch,
  };
}
