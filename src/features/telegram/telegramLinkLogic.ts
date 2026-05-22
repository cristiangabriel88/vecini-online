import type { Role } from '@/shared/types/domain';
import { generateInviteCode, normalizeInviteCode } from '@/shared/lib/inviteCode';
import {
  type InviteCode,
  findByCode,
  validateInvite,
} from '@/features/invites/inviteLogic';
import type { TelegramStartStatus } from '@/shared/lib/telegramStart';

/**
 * Pure logic for the Telegram `/start CODE` linking flow (T50). Two code spaces
 * arrive through the same deep link:
 *
 *  1. an **invite code** (T41/T42) — grants a *new* joiner membership in an
 *     asociație; the resulting app user is created/linked server-side in the
 *     live join RPC (T58), so the offline link carries a null `userId`;
 *  2. a **per-user link code** — minted by an *already-registered* resident so
 *     they can bind their Telegram chat to their existing account and receive
 *     notifications there; this resolves to a concrete `userId` offline.
 *
 * The resolver re-uses the invite-code lifecycle from `inviteLogic` rather than
 * duplicating it, and keeps its own minimal lifecycle for link codes.
 */

/** Minimal Telegram user identity carried by an update. */
export interface TelegramUserInfo {
  telegramUserId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
}

/**
 * A per-user Telegram link code. Single-use by construction (consumed on first
 * redeem). Binds an existing app user + their active asociație to whoever
 * redeems the code from Telegram.
 */
export interface TelegramLinkCode {
  id: string;
  code: string;
  userId: string;
  asociatieId: string;
  role: Role;
  /** Epoch ms expiry, or null to never expire. */
  expiresAt: number | null;
  consumedAt: number | null;
  consumedByTelegramId: number | null;
  createdAt: number;
}

/** Validation outcome of a link code (no revoke concept; always single-use). */
export type LinkCodeStatus = 'ok' | 'expired' | 'used' | 'unknown';

/**
 * The `telegram_users`-shaped association to persist once a code resolves. The
 * asociație/role/apartment context is derived from the code; in the live path it
 * maps onto a `telegram_users` row plus (for the invite path) a membership.
 */
export interface TelegramLink {
  telegramUserId: number;
  /** App user the chat is bound to; null on the invite path until provisioned live (T58). */
  userId: string | null;
  asociatieId: string;
  role: Role;
  /** Apartment the invite pre-links, or null. */
  apartmentId: string | null;
  username: string | null;
  firstName: string | null;
  linkedAt: number;
  source: 'link-code' | 'invite';
}

export interface CreateLinkCodeInput {
  userId: string;
  asociatieId: string;
  role: Role;
  /** Epoch ms expiry, or null for a code that never expires. */
  expiresAt?: number | null;
}

/**
 * Mint a per-user link code, regenerating on the rare chance it collides with an
 * already-issued code so codes stay unique. Pure: the caller supplies the
 * existing codes, clock and RNG.
 */
export function createLinkCode(
  input: CreateLinkCodeInput,
  existingCodes: Iterable<string> = [],
  now: number = Date.now(),
  rng: () => number = Math.random,
): TelegramLinkCode {
  const taken = new Set(existingCodes);
  let code = generateInviteCode(rng);
  while (taken.has(code)) code = generateInviteCode(rng);
  return {
    id: `tlc-${crypto.randomUUID()}`,
    code,
    userId: input.userId,
    asociatieId: input.asociatieId,
    role: input.role,
    expiresAt: input.expiresAt ?? null,
    consumedAt: null,
    consumedByTelegramId: null,
    createdAt: now,
  };
}

/** Look up a link code by its (user-entered) value, normalising the input first. */
export function findLinkByCode(
  codes: TelegramLinkCode[],
  code: string,
): TelegramLinkCode | undefined {
  const normalised = normalizeInviteCode(code);
  if (!normalised) return undefined;
  return codes.find((c) => c.code === normalised);
}

/** Decide whether a link code may currently be consumed. */
export function validateLinkCode(
  linkCode: TelegramLinkCode | undefined,
  now: number = Date.now(),
): LinkCodeStatus {
  if (!linkCode) return 'unknown';
  if (linkCode.consumedAt !== null) return 'used';
  if (linkCode.expiresAt !== null && now >= linkCode.expiresAt) return 'expired';
  return 'ok';
}

/** Return a copy of the link code marked consumed by a Telegram user. */
export function consumeLinkCode(
  linkCode: TelegramLinkCode,
  telegramUserId: number,
  now: number = Date.now(),
): TelegramLinkCode {
  return { ...linkCode, consumedAt: now, consumedByTelegramId: telegramUserId };
}

/** Build the association for the per-user link-code path (concrete `userId`). */
export function buildLinkFromLinkCode(
  linkCode: TelegramLinkCode,
  user: TelegramUserInfo,
  now: number = Date.now(),
): TelegramLink {
  return {
    telegramUserId: user.telegramUserId,
    userId: linkCode.userId,
    asociatieId: linkCode.asociatieId,
    role: linkCode.role,
    apartmentId: null,
    username: user.username ?? null,
    firstName: user.firstName ?? null,
    linkedAt: now,
    source: 'link-code',
  };
}

/**
 * Build the association for the invite-code path. `userId` is null because the
 * joining app user is created/linked server-side by the live join RPC (T58);
 * the role + apartment the invite grants ride along so that step has them.
 */
export function buildLinkFromInvite(
  invite: InviteCode,
  user: TelegramUserInfo,
  now: number = Date.now(),
): TelegramLink {
  return {
    telegramUserId: user.telegramUserId,
    userId: null,
    asociatieId: invite.asociatieId,
    role: invite.role,
    apartmentId: invite.apartmentId,
    username: user.username ?? null,
    firstName: user.firstName ?? null,
    linkedAt: now,
    source: 'invite',
  };
}

export interface ResolveStartInput {
  /** The deep-link payload after `/start`, or null when none was sent. */
  payload: string | null;
  telegramUser: TelegramUserInfo;
  /** An already-established link for this Telegram user, if any. */
  existingLink?: TelegramLink | null;
  /** Per-user link codes to validate against (checked first). */
  linkCodes?: TelegramLinkCode[];
  /** Invite codes to validate against (checked when no link code matches). */
  inviteCodes?: InviteCode[];
  now?: number;
}

export interface TelegramStartOutcome {
  status: TelegramStartStatus;
  /** The association to persist when `status === 'linked'`, else null. */
  link: TelegramLink | null;
  /** The matched link code to consume (link-code path), else null. */
  linkCodeId: string | null;
  /** The matched invite to consume (invite path), else null. */
  inviteId: string | null;
}

const NO_LINK: Omit<TelegramStartOutcome, 'status'> = {
  link: null,
  linkCodeId: null,
  inviteId: null,
};

/**
 * Resolve a `/start [payload]` into the linking outcome. Precedence: no payload
 * → ask for a code; an already-linked Telegram user is told so; otherwise the
 * payload is matched against per-user link codes first, then invite codes; an
 * unmatched payload is unknown. A code found but not redeemable reports its own
 * status (expired/used/revoked) rather than falling through to the other space.
 * Pure: the caller supplies the code collections and the established link; the
 * caller is responsible for consuming the matched code (the replay-safe gate).
 */
export function resolveTelegramStart(input: ResolveStartInput): TelegramStartOutcome {
  const now = input.now ?? Date.now();

  if (!input.payload) return { status: 'no-code', ...NO_LINK };

  if (input.existingLink) {
    return { status: 'already-linked', ...NO_LINK, link: input.existingLink };
  }

  const linkCode = findLinkByCode(input.linkCodes ?? [], input.payload);
  if (linkCode) {
    const status = validateLinkCode(linkCode, now);
    if (status !== 'ok') return { status, ...NO_LINK };
    return {
      status: 'linked',
      link: buildLinkFromLinkCode(linkCode, input.telegramUser, now),
      linkCodeId: linkCode.id,
      inviteId: null,
    };
  }

  const invite = findByCode(input.inviteCodes ?? [], input.payload);
  if (invite) {
    const status = validateInvite(invite, now);
    if (status !== 'ok') return { status, ...NO_LINK };
    return {
      status: 'linked',
      link: buildLinkFromInvite(invite, input.telegramUser, now),
      linkCodeId: null,
      inviteId: invite.id,
    };
  }

  return { status: 'unknown', ...NO_LINK };
}
