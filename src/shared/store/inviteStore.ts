import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type CreateInviteInput,
  type InviteCode,
  type InviteStatus,
  consumeInvite,
  createInvite,
  findByCode,
  findByToken,
  markInviteEmailDelivered,
  markInviteEmailSent,
  revokeInvite,
  validateInvite,
} from '@/features/invites/inviteLogic';
import { DEMO_INVITES } from '@/shared/demo/demoData';

interface ConsumeResult {
  status: InviteStatus;
  /** The consumed code when `status === 'ok'`, otherwise null. */
  invite: InviteCode | null;
}

interface InviteState {
  /** Every issued code across asociații; filter by asociație with `forAsociatie`. */
  invites: InviteCode[];
  /** Issue (mint) a new code for an asociație and persist it. Returns the code. */
  issue: (input: CreateInviteInput) => InviteCode;
  /** Revoke a code so it can no longer be redeemed (kept for the audit trail). */
  revoke: (id: string) => void;
  /** Stamp a code as having had its invitation email dispatched (T147). */
  markEmailSent: (id: string, at?: number) => void;
  /** Stamp a code as having its invitation email confirmed delivered (T149). */
  markEmailDelivered: (id: string, at?: number) => void;
  /**
   * Atomically validate and consume a code for `userId`. Re-validates inside the
   * state update so a single-use code cannot be double-spent under a race (the
   * replay guard T42 builds the live join flow on). Membership creation is the
   * caller's concern (T42), not this store's.
   */
  consume: (code: string, userId: string) => ConsumeResult;
  /**
   * Same atomic, replay-safe consumption as `consume`, but matched by the opaque
   * onboarding-link token rather than the short code (T123). The redeem-by-link
   * landing (T124) builds on this.
   */
  consumeByToken: (token: string, userId: string) => ConsumeResult;
  /** Codes issued for one asociație, newest first. */
  forAsociatie: (asociatieId: string) => InviteCode[];
}

/**
 * Atomically validate and consume an already-matched code. Re-validates the
 * match inside the state update so a single-use code cannot be double-spent
 * under a race, regardless of whether it was looked up by code or by token.
 */
function consumeMatched(
  target: InviteCode | undefined,
  userId: string,
  get: () => InviteState,
  set: (partial: Partial<InviteState>) => void,
): ConsumeResult {
  const status = validateInvite(target);
  if (status !== 'ok' || !target) return { status, invite: null };
  const consumed = consumeInvite(target, userId);
  set({
    invites: get().invites.map((invite) => (invite.id === target.id ? consumed : invite)),
  });
  return { status: 'ok', invite: consumed };
}

export const useInviteStore = create<InviteState>()(
  persist(
    (set, get) => ({
      // Seeded from demo so the offline app shows both onboarding states; a
      // persisted store (returning user) replaces this on rehydrate.
      invites: [...DEMO_INVITES],

      issue: (input) => {
        const existing = get().invites.map((i) => i.code);
        const invite = createInvite(input, existing);
        set({ invites: [...get().invites, invite] });
        return invite;
      },

      revoke: (id) =>
        set({
          invites: get().invites.map((invite) =>
            invite.id === id && invite.revokedAt === null ? revokeInvite(invite) : invite,
          ),
        }),

      markEmailSent: (id, at = Date.now()) =>
        set({
          invites: get().invites.map((invite) =>
            invite.id === id ? markInviteEmailSent(invite, at) : invite,
          ),
        }),

      markEmailDelivered: (id, at = Date.now()) =>
        set({
          invites: get().invites.map((invite) =>
            invite.id === id ? markInviteEmailDelivered(invite, at) : invite,
          ),
        }),

      consume: (code, userId) =>
        consumeMatched(findByCode(get().invites, code), userId, get, set),

      consumeByToken: (token, userId) =>
        consumeMatched(findByToken(get().invites, token), userId, get, set),

      forAsociatie: (asociatieId) =>
        get()
          .invites.filter((invite) => invite.asociatieId === asociatieId)
          .sort((a, b) => b.createdAt - a.createdAt),
    }),
    { name: 'vecini.invites' },
  ),
);
