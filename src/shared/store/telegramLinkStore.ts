import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type CreateLinkCodeInput,
  type TelegramLink,
  type TelegramLinkCode,
  type TelegramStartOutcome,
  type TelegramUserInfo,
  consumeLinkCode,
  createLinkCode,
  resolveTelegramStart,
} from '@/features/telegram/telegramLinkLogic';
import { useInviteStore } from './inviteStore';

interface TelegramLinkState {
  /** Per-user link codes minted by residents to bind their Telegram chat. */
  linkCodes: TelegramLinkCode[];
  /** Established Telegram links, keyed in spirit by `telegramUserId`. */
  links: TelegramLink[];
  /** Mint a new per-user link code and persist it. Returns the code. */
  issueLinkCode: (input: CreateLinkCodeInput) => TelegramLinkCode;
  /** The established link for a Telegram user, or null. */
  linkFor: (telegramUserId: number) => TelegramLink | null;
  /**
   * The local/mock linking path. Resolves a `/start` payload against this
   * store's per-user link codes and the invite store's codes, then:
   *  - for the per-user link-code path, atomically consumes the code (re-validated
   *    inside the update so it cannot be double-spent) and records the link;
   *  - for the invite-code path it returns the resolved (validated) outcome but
   *    records nothing, because the joining app user is provisioned server-side
   *    in the live join RPC (T58) which then writes the `telegram_users` row.
   */
  linkByPayload: (payload: string | null, telegramUser: TelegramUserInfo) => TelegramStartOutcome;
  /** Remove a Telegram user's established link (the `/uita` unlink flow). */
  unlink: (telegramUserId: number) => void;
}

export const useTelegramLinkStore = create<TelegramLinkState>()(
  persist(
    (set, get) => ({
      linkCodes: [],
      links: [],

      issueLinkCode: (input) => {
        const existing = [
          ...get().linkCodes.map((c) => c.code),
          ...useInviteStore.getState().invites.map((i) => i.code),
        ];
        const linkCode = createLinkCode(input, existing);
        set({ linkCodes: [...get().linkCodes, linkCode] });
        return linkCode;
      },

      linkFor: (telegramUserId) =>
        get().links.find((l) => l.telegramUserId === telegramUserId) ?? null,

      linkByPayload: (payload, telegramUser) => {
        const outcome = resolveTelegramStart({
          payload,
          telegramUser,
          existingLink: get().linkFor(telegramUser.telegramUserId),
          linkCodes: get().linkCodes,
          inviteCodes: useInviteStore.getState().invites,
        });
        if (outcome.status !== 'linked' || !outcome.link) return outcome;

        // Only the per-user link-code path is recorded offline; the invite path's
        // association is written live once the app user is provisioned (T58).
        if (outcome.linkCodeId) {
          set((state) => ({
            linkCodes: state.linkCodes.map((c) =>
              c.id === outcome.linkCodeId && c.consumedAt === null
                ? consumeLinkCode(c, telegramUser.telegramUserId, outcome.link!.linkedAt)
                : c,
            ),
            links: [
              ...state.links.filter((l) => l.telegramUserId !== telegramUser.telegramUserId),
              outcome.link!,
            ],
          }));
        }
        return outcome;
      },

      unlink: (telegramUserId) =>
        set((state) => ({
          links: state.links.filter((l) => l.telegramUserId !== telegramUserId),
        })),
    }),
    { name: 'intrevecini.telegram' },
  ),
);
