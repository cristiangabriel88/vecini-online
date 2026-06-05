import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from '@/shared/store/auditStore';
import { useAuthStore } from '@/shared/store/authStore';
import {
  DEMO_PLATFORM_ADMIN,
  DEMO_PLATFORM_ASOCIATII,
  type AsociatieStatus,
  type PlatformAsociatieSummary,
} from './demoPlatform';
import {
  buildSetupLink,
  provisionAsociatie,
  sortAsociatii,
  type ProvisionInput,
  type ProvisionResult,
} from './platformProvisioningLogic';
import { ONBOARDING_LINK_TTL_MS, type InviteStatus } from '@/features/invites/inviteLogic';
import { generateInviteToken, normalizeInviteCode, normalizeInviteToken } from '@/shared/lib/inviteCode';
import {
  type SetupProvisionLike,
  setupProvisionStatus,
} from '@/features/onboarding/accountSetupLogic';

/**
 * Platform asociații + admin provisioning store (T94), offline/local path.
 *
 * Seeded from the demo platform dataset (T93) so the console runs fully offline
 * like the rest of the app. The operator lists every asociație and provisions a
 * new one with its first admin; the admin then onboards their own residents
 * through the existing invite lifecycle (T41/T42).
 *
 * The privileged live write (creating the asociație + the admin's auth account
 * across tenants) runs only in the T92 service-role Netlify function, which
 * re-verifies super_admin server-side — never in the browser. This store is the
 * offline source of truth; the live cross-tenant list read (T91 RLS) + the
 * server-mediated provision are wired in T120/T92. Persisted so a provisioned
 * asociație survives a reload in the local loop.
 */

/**
 * A pending admin invitation created by the "Add Association" page (T152).
 * Unlike an old-style `AdminProvisionRecord`, this has no asociatie yet -- the
 * administrator enters the asociație's identity during the onboarding wizard
 * (T154) after accepting the invite.
 */
export interface PendingAdminInvite {
  /** Unique id for this invite (UUID). */
  id: string;
  adminName: string;
  adminEmail: string;
  /** Opaque 64-hex token that backs the secure setup link (T123). */
  setupToken: string;
  /** Epoch ms the setup link expires (24h from invite). */
  expiresAt: number;
  /** ISO instant the invite was created. */
  invitedAt: string;
  /** Epoch ms the invitation email was marked as sent; null while unsent. */
  emailSentAt: number | null;
}

/** The admin a platform operator provisioned for an asociație (offline record). */
export interface AdminProvisionRecord {
  asociatieId: string;
  name: string;
  email: string;
  /** One-time setup code handed to the admin to complete sign-up (manual fallback). */
  setupCode: string;
  /** Opaque token backing the secure setup link (T123). */
  setupToken: string;
  /** Epoch ms the setup link/code expires (24h from provisioning, T123). */
  expiresAt: number;
  /** Epoch ms the admin redeemed the setup link/code (single-use), or null (T124). */
  redeemedAt: number | null;
  /** ISO instant the provisioning happened. */
  provisionedAt: string;
  /** Epoch ms access was revoked by the platform operator (T250), or null when active. */
  revokedAt?: number | null;
}

/** The outcome of consuming a setup token/code: status + the activated asociație. */
export interface ConsumeSetupResult {
  status: InviteStatus;
  asociatieId: string | null;
  asociatieName: string | null;
}

/** Filter applied to the asociații list in the platform console (T249). */
export type AsociatiiListFilter = 'all' | 'active' | 'suspended' | 'archived';

interface PlatformAsociatiiState {
  /** Every asociație the platform knows about (seeded + provisioned), sorted. */
  asociatii: PlatformAsociatieSummary[];
  /** Provisioned-admin records keyed by asociație id. */
  provisions: Record<string, AdminProvisionRecord>;
  /**
   * Pending admin invitations sent from the new "Add Association" page (T152).
   * Each invite has no asociație yet -- the admin enters the asociație identity
   * during the onboarding wizard (T154) after accepting.
   */
  pendingInvites: PendingAdminInvite[];
  /** IDs of pending invites that have been revoked (T250). */
  revokedInviteIds: string[];
  /**
   * Additional admins provisioned for an existing asociație (T250), keyed by
   * asociatieId. Each list entry is an AdminProvisionRecord; revokedAt !== null
   * means the operator has revoked that admin's access.
   */
  additionalAdmins: Record<string, AdminProvisionRecord[]>;
  /** Set by the live hydration path when a fetch fails; null when healthy. */
  fetchError: string | null;
  /** Active filter on the list page (T249). */
  listFilter: AsociatiiListFilter;
  /** Replace the asociatii list with live data from the DB (T120 live read). */
  replaceAsociatii: (rows: PlatformAsociatieSummary[]) => void;
  /** Set or clear the fetch error (called by platformApi). */
  setFetchError: (err: string | null) => void;
  /** Set the active list filter (T249). */
  setListFilter: (filter: AsociatiiListFilter) => void;
  /**
   * Apply a lifecycle status change to one asociație in the local store (T249).
   * Called after a successful asociatie-lifecycle Netlify function response, or
   * directly in demo mode where there is no backend.
   */
  updateLifecycle: (id: string, status: AsociatieStatus, reason?: string) => void;
  /** Provision a new asociație + its first admin (offline path). */
  provision: (input: ProvisionInput) => ProvisionResult;
  /**
   * Create a pending admin invite (T152 new simplified flow). The operator
   * supplies only the admin's name and email; the invite token backs the setup
   * link emailed to the admin. The asociație identity is entered by the admin
   * during the onboarding wizard. No asociație row is created at this point.
   */
  inviteAdmin: (adminName: string, adminEmail: string) => PendingAdminInvite;
  /** Stamp `emailSentAt` once the invitation email was successfully dispatched. */
  markAdminEmailSent: (inviteId: string) => void;
  /**
   * Consume an admin setup token (from the secure link) or its short fallback
   * code, single-use and replay-safe: it re-validates inside the state update so
   * a setup link cannot be redeemed twice under a race (T124). The membership
   * activation is the caller's concern (`authStore.activateProvisionedAdmin`).
   * The live cross-tenant equivalent runs in the T92 service-role function.
   */
  consumeSetup: (value: string) => ConsumeSetupResult;
  /**
   * Revoke a pending invite (T250). The invite is removed from the active list
   * and its id is recorded so the link cannot be redeemed. Audits
   * `admin.invite_revoked` on the invite's email.
   */
  revokeInvite: (inviteId: string) => void;
  /**
   * Re-mint the setup token for a pending invite and reset its expiry (T250).
   * Returns the updated invite so the caller can send the new link.
   * Audits nothing -- the email-sent event is tracked by `markAdminEmailSent`.
   */
  resendInvite: (inviteId: string) => PendingAdminInvite | null;
  /**
   * Provision an additional admin for an existing asociație (T250). Adds a new
   * AdminProvisionRecord to `additionalAdmins[asociatieId]`. Audits
   * `admin.provisioned`.
   */
  provisionAdditionalAdmin: (
    asociatieId: string,
    adminName: string,
    adminEmail: string,
  ) => AdminProvisionRecord;
  /**
   * Revoke an active admin's access to an asociație (T250). Sets `revokedAt` on
   * the matching AdminProvisionRecord. Audits `admin.access_revoked`.
   */
  revokeAdminAccess: (asociatieId: string, adminEmail: string) => void;
}

/** Resolve the acting operator: the live session user, or the demo operator. */
function actingOperator(): { id: string; name: string } {
  const auth = useAuthStore.getState();
  return {
    id: auth.session?.user?.id ?? DEMO_PLATFORM_ADMIN.id,
    name: auth.profile?.full_name ?? DEMO_PLATFORM_ADMIN.name,
  };
}

export const usePlatformAsociatiiStore = create<PlatformAsociatiiState>()(
  persist(
    (set, get) => ({
      asociatii: sortAsociatii(DEMO_PLATFORM_ASOCIATII),
      provisions: {},
      pendingInvites: [],
      revokedInviteIds: [],
      additionalAdmins: {},
      fetchError: null,
      listFilter: 'all',

      replaceAsociatii: (rows) => {
        set(() => ({ asociatii: rows }));
      },

      setFetchError: (err) => {
        set(() => ({ fetchError: err }));
      },

      setListFilter: (filter) => {
        set(() => ({ listFilter: filter }));
      },

      updateLifecycle: (id, status, reason) => {
        const now = new Date().toISOString();
        set((s) => ({
          asociatii: s.asociatii.map((a) =>
            a.id === id
              ? { ...a, status, statusReason: reason ?? a.statusReason, statusChangedAt: now }
              : a,
          ),
        }));
        const a = get().asociatii.find((x) => x.id === id);
        if (!a) return;
        const operator = actingOperator();
        const actionMap: Record<AsociatieStatus, 'asociatie.suspended' | 'asociatie.reactivated' | 'asociatie.archived'> = {
          active: 'asociatie.reactivated',
          suspended: 'asociatie.suspended',
          archived: 'asociatie.archived',
        };
        useAuditStore.getState().record({
          asociatie_id: id,
          actor_user_id: operator.id,
          actor_name: operator.name,
          action: actionMap[status],
          entity: 'asociatie',
          entity_label: a.name,
          before: null,
          after: status,
        });
      },

      provision: (input) => {
        const existingCodes = Object.values(get().provisions).map((p) => p.setupCode);
        const result = provisionAsociatie(input, existingCodes);
        const operator = actingOperator();
        const provisionedAt = new Date().toISOString();

        // Audit the provisioning as the genesis of the new asociație's chain, so
        // it surfaces both in that asociație's own trail (T09) and the
        // cross-asociație viewer (T95). Two entries: the asociație and its admin.
        const audit = useAuditStore.getState();
        audit.record({
          asociatie_id: result.asociatie.id,
          actor_user_id: operator.id,
          actor_name: operator.name,
          action: 'asociatie.provisioned',
          entity: 'asociatie',
          entity_label: result.asociatie.name,
          before: null,
          after: result.asociatie.city,
        });
        audit.record({
          asociatie_id: result.asociatie.id,
          actor_user_id: operator.id,
          actor_name: operator.name,
          action: 'admin.provisioned',
          entity: 'admin',
          entity_label: result.admin.email,
          before: null,
          after: 'admin',
        });

        set((s) => ({
          asociatii: sortAsociatii([...s.asociatii, result.asociatie]),
          provisions: {
            ...s.provisions,
            [result.asociatie.id]: {
              asociatieId: result.asociatie.id,
              name: result.admin.name,
              email: result.admin.email,
              setupCode: result.admin.setupCode,
              setupToken: result.admin.setupToken,
              expiresAt: result.admin.expiresAt,
              redeemedAt: null,
              provisionedAt,
            },
          },
        }));

        return result;
      },

      inviteAdmin: (adminName, adminEmail) => {
        const now = Date.now();
        const invite: PendingAdminInvite = {
          id: crypto.randomUUID(),
          adminName,
          adminEmail,
          setupToken: generateInviteToken(),
          expiresAt: now + ONBOARDING_LINK_TTL_MS,
          invitedAt: new Date().toISOString(),
          emailSentAt: null,
        };
        set((s) => ({ pendingInvites: [...s.pendingInvites, invite] }));
        return invite;
      },

      markAdminEmailSent: (inviteId) => {
        const now = Date.now();
        set((s) => ({
          pendingInvites: s.pendingInvites.map((inv) =>
            inv.id === inviteId ? { ...inv, emailSentAt: now } : inv,
          ),
        }));
      },

      consumeSetup: (value) => {
        const token = normalizeInviteToken(value);
        const code = normalizeInviteCode(value);
        const match = (p: AdminProvisionRecord) =>
          p.setupToken === token || (code.length > 0 && p.setupCode === code);
        const entry = Object.entries(get().provisions).find(([, p]) => match(p));
        if (!entry) return { status: 'unknown', asociatieId: null, asociatieName: null };
        const [id] = entry;

        // Re-validate inside the update so a single-use setup link cannot be
        // redeemed twice under a race (mirrors the invite store's `consumeMatched`).
        let result: ConsumeSetupResult = { status: 'unknown', asociatieId: null, asociatieName: null };
        set((s) => {
          const current = s.provisions[id];
          const status = current ? setupProvisionStatus(toSetupLike(current, '')) : 'unknown';
          if (status !== 'ok' || !current) {
            result = { status, asociatieId: null, asociatieName: null };
            return s;
          }
          const name = s.asociatii.find((a) => a.id === current.asociatieId)?.name ?? current.name;
          result = { status: 'ok', asociatieId: current.asociatieId, asociatieName: name };
          return {
            provisions: {
              ...s.provisions,
              [id]: { ...current, redeemedAt: Date.now() },
            },
          };
        });
        return result;
      },

      revokeInvite: (inviteId) => {
        const inv = get().pendingInvites.find((x) => x.id === inviteId);
        if (!inv) return;
        set((s) => ({ revokedInviteIds: [...s.revokedInviteIds, inviteId] }));
        const operator = actingOperator();
        useAuditStore.getState().record({
          asociatie_id: 'platform',
          actor_user_id: operator.id,
          actor_name: operator.name,
          action: 'admin.invite_revoked',
          entity: 'admin',
          entity_label: inv.adminEmail,
          before: null,
          after: 'revoked',
        });
      },

      resendInvite: (inviteId) => {
        const inv = get().pendingInvites.find((x) => x.id === inviteId);
        if (!inv) return null;
        const now = Date.now();
        const updated: PendingAdminInvite = {
          ...inv,
          setupToken: generateInviteToken(),
          expiresAt: now + ONBOARDING_LINK_TTL_MS,
          invitedAt: new Date().toISOString(),
          emailSentAt: null,
        };
        set((s) => ({
          pendingInvites: s.pendingInvites.map((x) => (x.id === inviteId ? updated : x)),
        }));
        return updated;
      },

      provisionAdditionalAdmin: (asociatieId, adminName, adminEmail) => {
        const now = Date.now();
        const record: AdminProvisionRecord = {
          asociatieId,
          name: adminName,
          email: adminEmail,
          setupCode: '',
          setupToken: generateInviteToken(),
          expiresAt: now + ONBOARDING_LINK_TTL_MS,
          redeemedAt: null,
          provisionedAt: new Date().toISOString(),
          revokedAt: null,
        };
        set((s) => ({
          additionalAdmins: {
            ...s.additionalAdmins,
            [asociatieId]: [...(s.additionalAdmins[asociatieId] ?? []), record],
          },
        }));
        const operator = actingOperator();
        const asociatieName = get().asociatii.find((a) => a.id === asociatieId)?.name ?? asociatieId;
        useAuditStore.getState().record({
          asociatie_id: asociatieId,
          actor_user_id: operator.id,
          actor_name: operator.name,
          action: 'admin.provisioned',
          entity: 'admin',
          entity_label: adminEmail,
          before: null,
          after: `admin@${asociatieName}`,
        });
        return record;
      },

      revokeAdminAccess: (asociatieId, adminEmail) => {
        const now = Date.now();
        // Check both the primary provision record and the additional admins list.
        const prov = get().provisions[asociatieId];
        if (prov && prov.email === adminEmail) {
          set((s) => ({
            provisions: {
              ...s.provisions,
              [asociatieId]: { ...s.provisions[asociatieId], revokedAt: now },
            },
          }));
        } else {
          set((s) => ({
            additionalAdmins: {
              ...s.additionalAdmins,
              [asociatieId]: (s.additionalAdmins[asociatieId] ?? []).map((r) =>
                r.email === adminEmail ? { ...r, revokedAt: now } : r,
              ),
            },
          }));
        }
        const operator = actingOperator();
        const asociatieName = get().asociatii.find((a) => a.id === asociatieId)?.name ?? asociatieId;
        useAuditStore.getState().record({
          asociatie_id: asociatieId,
          actor_user_id: operator.id,
          actor_name: operator.name,
          action: 'admin.access_revoked',
          entity: 'admin',
          entity_label: adminEmail,
          before: `admin@${asociatieName}`,
          after: 'revoked',
        });
      },
    }),
    {
      name: 'vecini.platform.asociatii',
      version: 6,
      // v2 (T123) added the secure setup link's token + 24h expiry; v3 (T124)
      // added the single-use `redeemedAt`; v4 (T152) added `pendingInvites`;
      // v5 (T249) added `listFilter` + `status`/`statusReason`/`statusChangedAt`
      // on each asociatie summary; v6 (T250) added `revokedInviteIds` +
      // `additionalAdmins` + `revokedAt` on AdminProvisionRecord.
      migrate: (persisted, version) => {
        const state = persisted as PlatformAsociatiiState;
        // v2/v3: backfill provision records
        if (version < 3 && state?.provisions) {
          const now = Date.now();
          const provisions = Object.fromEntries(
            Object.entries(state.provisions).map(([id, p]) => [
              id,
              {
                ...p,
                setupToken: p.setupToken ?? generateInviteToken(),
                expiresAt: p.expiresAt ?? now + ONBOARDING_LINK_TTL_MS,
                redeemedAt: p.redeemedAt ?? null,
              },
            ]),
          );
          return { ...state, provisions, pendingInvites: state.pendingInvites ?? [], listFilter: 'all', revokedInviteIds: [], additionalAdmins: {} };
        }
        // v4: ensure pendingInvites exists
        if (version < 4) return { ...state, pendingInvites: state.pendingInvites ?? [], listFilter: 'all', revokedInviteIds: [], additionalAdmins: {} };
        // v5: ensure listFilter exists
        if (version < 5) return { ...state, listFilter: (state as PlatformAsociatiiState).listFilter ?? 'all', revokedInviteIds: [], additionalAdmins: {} };
        // v6: ensure revokedInviteIds + additionalAdmins exist
        if (version < 6) return { ...state, revokedInviteIds: state.revokedInviteIds ?? [], additionalAdmins: state.additionalAdmins ?? {} };
        return state;
      },
    },
  ),
);

/** Map a stored provision record into the store-agnostic onboarding shape (T124). */
function toSetupLike(record: AdminProvisionRecord, asociatieName: string): SetupProvisionLike {
  return {
    asociatieId: record.asociatieId,
    asociatieName,
    setupToken: record.setupToken,
    setupCode: record.setupCode,
    expiresAt: record.expiresAt,
    redeemedAt: record.redeemedAt ?? null,
  };
}

/**
 * The setup provisions as the resident-side onboarding landing consumes them
 * (T124): each carries the asociație's display name, resolved from the summary
 * list, so the landing can name the asociație the new admin is setting up.
 */
export function setupProvisionLinks(
  provisions: Record<string, AdminProvisionRecord>,
  asociatii: PlatformAsociatieSummary[],
): SetupProvisionLike[] {
  return Object.values(provisions).map((p) =>
    toSetupLike(p, asociatii.find((a) => a.id === p.asociatieId)?.name ?? p.name),
  );
}

/**
 * The secure setup link for a provisioned admin record. Callers on the platform
 * console pass `env.residentAppUrl` so the handed-off link targets the
 * resident/admin origin, not the platform subdomain it was minted on (T133).
 */
export function setupLinkFor(record: AdminProvisionRecord, baseUrl: string): string {
  return buildSetupLink(
    { name: record.name, email: record.email, setupCode: record.setupCode, setupToken: record.setupToken, expiresAt: record.expiresAt },
    baseUrl,
  );
}
