import type { AssocUsageMetric } from './platformUsageStore';
import type { PlatformAsociatieSummary } from './demoPlatform';
import type { PlatformSubscriptionRow } from './platformSubscriptionsStore';
import type { SupportThread } from '@/shared/types/domain';
import type { PlatformErrorReport } from './platformErrorStore';
import { computeRollup } from './platformUsageStore';
import { groupReports } from './platformErrorStore';
import { BILLING_PLANS, findPlanById } from '@/features/billing/billingLogic';

export interface PlatformOverview {
  totalAsociatii: number;
  activeHealth: number;
  moderateHealth: number;
  dormantHealth: number;
  suspendedLifecycle: number;
  totalMembers: number;
  totalApartments: number;
  recentAnnouncements: number;
  recentTickets: number;
  recentVotes: number;
  mrr: number;
  overdueCount: number;
  openThreads: number;
  unansweredThreads: number;
  recentErrorGroups: number;
  /** Number of distinct error groups whose first occurrence is within the last 24 hours. */
  newErrorGroupsLast24h: number;
}

export function computeOverview(
  metrics: AssocUsageMetric[],
  asociatii: PlatformAsociatieSummary[],
  subscriptionRows: PlatformSubscriptionRow[],
  threads: SupportThread[],
  errorReports: PlatformErrorReport[],
  nowMs?: number,
): PlatformOverview {
  const rollup = computeRollup(metrics);
  const now = nowMs ?? Date.now();
  const DAY_MS = 86_400_000;
  const suspendedLifecycle = asociatii.filter((a) => (a.status ?? 'active') === 'suspended').length;

  let mrr = 0;
  let overdueCount = 0;
  for (const row of subscriptionRows) {
    if (row.subscription.status === 'active') {
      const plan = findPlanById(BILLING_PLANS, row.subscription.plan_id);
      mrr += plan?.price_ron ?? 0;
    } else if (row.subscription.status === 'past_due') {
      overdueCount++;
    }
  }

  let openThreads = 0;
  let unansweredThreads = 0;
  for (const thread of threads) {
    if (thread.status !== 'open') continue;
    openThreads++;
    const lastMsg = thread.messages.at(-1);
    if (lastMsg?.sender === 'admin') unansweredThreads++;
  }

  const recentErrorGroups = groupReports(errorReports).length;
  const newErrorGroupsLast24h = groupReports(
    errorReports.filter((r) => r.at > now - DAY_MS),
  ).length;

  let recentAnnouncements = 0;
  let recentTickets = 0;
  let recentVotes = 0;
  for (const m of metrics) {
    recentAnnouncements += m.recentAnnouncements;
    recentTickets += m.recentTickets;
    recentVotes += m.recentVotes;
  }

  return {
    totalAsociatii: rollup.total,
    activeHealth: rollup.active,
    moderateHealth: rollup.moderate,
    dormantHealth: rollup.dormant,
    suspendedLifecycle,
    totalMembers: rollup.totalMembers,
    totalApartments: rollup.totalApartments,
    recentAnnouncements,
    recentTickets,
    recentVotes,
    mrr,
    overdueCount,
    openThreads,
    unansweredThreads,
    recentErrorGroups,
    newErrorGroupsLast24h,
  };
}
