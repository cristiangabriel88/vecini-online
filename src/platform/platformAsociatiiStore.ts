import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuditStore } from '@/shared/store/auditStore';
import { useAuthStore } from '@/shared/store/authStore';
import {
  DEMO_PLATFORM_ADMIN,
  DEMO_PLATFORM_ASOCIATII,
  type PlatformAsociatieSummary,
} from './demoPlatform';
import {
  buildSetupLink,
  provisionAsociatie,
  sortAsociatii,
  type ProvisionInput,
  type ProvisionResult,
} from './platformProvisioningLogic';
import { ONBOARDING_LINK_TTL_MS } from '@/features/invites/inviteLogic';
import { generateInviteToken } from '@/shared/lib/inviteCode';

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
  /** ISO instant the provisioning happened. */
  provisionedAt: string;
}

interface PlatformAsociatiiState {
  /** Every asociație the platform knows about (seeded + provisioned), sorted. */
  asociatii: PlatformAsociatieSummary[];
  /** Provisioned-admin records keyed by asociație id. */
  provisions: Record<string, AdminProvisionRecord>;
  /** Provision a new asociație + its first admin (offline path). */
  provision: (input: ProvisionInput) => ProvisionResult;
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
              provisionedAt,
            },
          },
        }));

        return result;
      },
    }),
    {
      name: 'vecini.platform.asociatii',
      version: 2,
      // v2 (T123) added the secure setup link's token + 24h expiry to each
      // provision record. Backfill any pre-T123 record with a fresh token and a
      // 24h window from migration time so an old handoff still resolves a link.
      migrate: (persisted, version) => {
        const state = persisted as PlatformAsociatiiState;
        if (version >= 2 || !state?.provisions) return state;
        const now = Date.now();
        const provisions = Object.fromEntries(
          Object.entries(state.provisions).map(([id, p]) => [
            id,
            {
              ...p,
              setupToken: p.setupToken ?? generateInviteToken(),
              expiresAt: p.expiresAt ?? now + ONBOARDING_LINK_TTL_MS,
            },
          ]),
        );
        return { ...state, provisions };
      },
    },
  ),
);

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
