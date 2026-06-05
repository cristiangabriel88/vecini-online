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
}

export function computeOverview(
  metrics: AssocUsageMetric[],
  asociatii: PlatformAsociatieSummary[],
  subscriptionRows: PlatformSubscriptionRow[],
  threads: SupportThread[],
  errorReports: PlatformErrorReport[],
): PlatformOverview {
  const rollup = computeRollup(metrics);
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
  };
}
