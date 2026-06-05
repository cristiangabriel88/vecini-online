import { scoreMatch } from '@/shared/search/searchLogic';
import type { PlatformAsociatieSummary } from './demoPlatform';
import type { AdminProvisionRecord, PendingAdminInvite } from './platformAsociatiiStore';

export type PlatformSearchKind = 'asociatie' | 'admin';

export interface PlatformSearchResult {
  id: string;
  kind: PlatformSearchKind;
  title: string;
  subtitle?: string;
  path: string;
}

const MAX_PER_KIND = 6;

function bestScore(q: string, ...texts: (string | undefined | null)[]): number {
  return Math.max(0, ...texts.map((t) => (t ? scoreMatch(q, t) : 0)));
}

/**
 * Search across asociatii (by name, city, CUI) and provisioned admins (by name, email).
 * Results are grouped by kind (asociatii first), each group sorted by score desc,
 * capped at MAX_PER_KIND per group. Returns empty array when query is blank.
 */
export function platformSearchResults(
  query: string,
  asociatii: PlatformAsociatieSummary[],
  provisions: Record<string, AdminProvisionRecord>,
  additionalAdmins: Record<string, AdminProvisionRecord[]>,
  pendingInvites: PendingAdminInvite[],
): PlatformSearchResult[] {
  const q = query.trim();
  if (!q) return [];

  type Scored = PlatformSearchResult & { score: number };

  const asociatieResults: Scored[] = [];
  const adminResults: Scored[] = [];

  for (const a of asociatii) {
    const score = bestScore(q, a.name, a.city, a.cui, a.address);
    if (score > 0) {
      asociatieResults.push({
        id: `asoc:${a.id}`,
        kind: 'asociatie',
        title: a.name,
        subtitle: a.city,
        path: `/consola/asociatii/${a.id}`,
        score,
      });
    }
  }

  for (const [asociatieId, rec] of Object.entries(provisions)) {
    if (rec.revokedAt) continue;
    const score = bestScore(q, rec.name, rec.email);
    if (score > 0) {
      adminResults.push({
        id: `admin:${asociatieId}:${rec.email}`,
        kind: 'admin',
        title: rec.name,
        subtitle: rec.email,
        path: `/consola/asociatii/${asociatieId}`,
        score,
      });
    }
  }

  for (const [asociatieId, recs] of Object.entries(additionalAdmins)) {
    for (const rec of recs) {
      if (rec.revokedAt) continue;
      const score = bestScore(q, rec.name, rec.email);
      if (score > 0) {
        adminResults.push({
          id: `admin-extra:${asociatieId}:${rec.email}`,
          kind: 'admin',
          title: rec.name,
          subtitle: rec.email,
          path: `/consola/asociatii/${asociatieId}`,
          score,
        });
      }
    }
  }

  for (const invite of pendingInvites) {
    const score = bestScore(q, invite.adminName, invite.adminEmail);
    if (score > 0) {
      adminResults.push({
        id: `invite:${invite.id}`,
        kind: 'admin',
        title: invite.adminName,
        subtitle: invite.adminEmail,
        path: '/consola/asociatii',
        score,
      });
    }
  }

  asociatieResults.sort((a, b) => b.score - a.score);
  adminResults.sort((a, b) => b.score - a.score);

  return [
    ...asociatieResults.slice(0, MAX_PER_KIND),
    ...adminResults.slice(0, MAX_PER_KIND),
  ];
}
