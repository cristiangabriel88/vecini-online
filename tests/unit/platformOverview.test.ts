import { describe, expect, it } from 'vitest';
import { computeOverview } from '../../src/platform/platformOverviewLogic';
import type { AssocUsageMetric } from '../../src/platform/platformUsageStore';
import type { PlatformAsociatieSummary } from '../../src/platform/demoPlatform';
import type { PlatformSubscriptionRow } from '../../src/platform/platformSubscriptionsStore';
import type { SupportThread } from '../../src/shared/types/domain';
import type { PlatformErrorReport } from '../../src/platform/platformErrorStore';
import {
  usePlatformUsageStore,
} from '../../src/platform/platformUsageStore';
import {
  usePlatformAsociatiiStore,
} from '../../src/platform/platformAsociatiiStore';
import {
  usePlatformSubscriptionsStore,
} from '../../src/platform/platformSubscriptionsStore';
import {
  usePlatformMessengerStore,
} from '../../src/platform/platformMessengerStore';
import {
  usePlatformErrorStore,
} from '../../src/platform/platformErrorStore';

function makeMetric(overrides: Partial<AssocUsageMetric> = {}): AssocUsageMetric {
  return {
    asociatie_id: 'a1',
    name: 'Test',
    city: 'Bucharest',
    members: 10,
    apartments: 8,
    lastAdminSignInAt: null,
    recentAnnouncements: 0,
    recentTickets: 0,
    recentVotes: 0,
    healthStatus: 'active',
    ...overrides,
  };
}

function makeAsoc(
  id: string,
  status: PlatformAsociatieSummary['status'] = 'active',
): PlatformAsociatieSummary {
  return {
    id,
    name: `Asoc ${id}`,
    city: 'City',
    members: 10,
    apartments: 8,
    lastAdminSignInAt: null,
    status,
  };
}

function makeSubRow(status: string, planId: string): PlatformSubscriptionRow {
  return {
    asociatie_id: 'a1',
    asociatie_name: 'Test',
    city: 'City',
    plan_name_ro: 'Test',
    subscription: {
      id: `sub-${Math.random()}`,
      asociatie_id: 'a1',
      plan_id: planId,
      status: status as PlatformSubscriptionRow['subscription']['status'],
      current_period_start: '2026-06-01T00:00:00Z',
      current_period_end: '2026-07-01T00:00:00Z',
      trial_end_at: null,
      grace_period_end_at: null,
      canceled_at: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

function makeThread(
  id: string,
  status: 'open' | 'resolved',
  lastSender: 'admin' | 'superadmin',
): SupportThread {
  return {
    id,
    asociatie_id: 'a1',
    asociatie_name: 'Test',
    admin_user_id: 'u1',
    admin_name: 'Admin',
    subject: 'Subject',
    status,
    created_at: '2026-06-01T00:00:00Z',
    messages: [
      {
        id: `msg-${id}`,
        thread_id: id,
        sender: lastSender,
        sender_name: lastSender === 'admin' ? 'Admin' : 'Platform',
        body: 'Hello',
        created_at: '2026-06-01T00:00:00Z',
        read: true,
      },
    ],
  };
}

function makeReport(name: string, source: string): PlatformErrorReport {
  return {
    ref: `ref-${Math.random()}`,
    name,
    message: `${name} error`,
    source,
    extra: {},
    at: Date.now(),
  };
}

describe('computeOverview', () => {
  it('returns all zeros for empty inputs', () => {
    const ov = computeOverview([], [], [], [], []);
    expect(ov.totalAsociatii).toBe(0);
    expect(ov.totalMembers).toBe(0);
    expect(ov.totalApartments).toBe(0);
    expect(ov.recentAnnouncements).toBe(0);
    expect(ov.recentTickets).toBe(0);
    expect(ov.recentVotes).toBe(0);
    expect(ov.mrr).toBe(0);
    expect(ov.overdueCount).toBe(0);
    expect(ov.openThreads).toBe(0);
    expect(ov.unansweredThreads).toBe(0);
    expect(ov.recentErrorGroups).toBe(0);
  });

  describe('asociatii breakdown', () => {
    it('totals from usage metrics', () => {
      const metrics = [
        makeMetric({ healthStatus: 'active', members: 10, apartments: 8 }),
        makeMetric({ asociatie_id: 'a2', healthStatus: 'moderate', members: 5, apartments: 4 }),
        makeMetric({ asociatie_id: 'a3', healthStatus: 'dormant', members: 3, apartments: 2 }),
      ];
      const ov = computeOverview(metrics, [], [], [], []);
      expect(ov.totalAsociatii).toBe(3);
      expect(ov.activeHealth).toBe(1);
      expect(ov.moderateHealth).toBe(1);
      expect(ov.dormantHealth).toBe(1);
      expect(ov.totalMembers).toBe(18);
      expect(ov.totalApartments).toBe(14);
    });

    it('counts suspended from asociatii store', () => {
      const asociatii = [
        makeAsoc('a1', 'active'),
        makeAsoc('a2', 'suspended'),
        makeAsoc('a3', 'archived'),
      ];
      const ov = computeOverview([], asociatii, [], [], []);
      expect(ov.suspendedLifecycle).toBe(1);
    });

    it('treats missing status field as active (not suspended)', () => {
      const asociatii: PlatformAsociatieSummary[] = [
        { id: 'a1', name: 'A', city: 'C', members: 0, apartments: 0, lastAdminSignInAt: null },
      ];
      const ov = computeOverview([], asociatii, [], [], []);
      expect(ov.suspendedLifecycle).toBe(0);
    });
  });

  describe('activity rollup', () => {
    it('sums announcements, tickets, votes across metrics', () => {
      const metrics = [
        makeMetric({ recentAnnouncements: 12, recentTickets: 8, recentVotes: 3 }),
        makeMetric({ asociatie_id: 'a2', recentAnnouncements: 7, recentTickets: 5, recentVotes: 1 }),
        makeMetric({ asociatie_id: 'a3', recentAnnouncements: 2, recentTickets: 3, recentVotes: 0 }),
      ];
      const ov = computeOverview(metrics, [], [], [], []);
      expect(ov.recentAnnouncements).toBe(21);
      expect(ov.recentTickets).toBe(16);
      expect(ov.recentVotes).toBe(4);
    });
  });

  describe('subscriptions', () => {
    it('computes MRR from active subscriptions with plan price', () => {
      const rows = [
        makeSubRow('active', 'plan-standard'),  // 29 lei
        makeSubRow('trialing', 'plan-gratuit'),  // 0 lei (trialing)
        makeSubRow('past_due', 'plan-standard'), // overdue
      ];
      const ov = computeOverview([], [], rows, [], []);
      expect(ov.mrr).toBe(29);
      expect(ov.overdueCount).toBe(1);
    });

    it('returns 0 mrr when no active subscriptions', () => {
      const rows = [makeSubRow('trialing', 'plan-gratuit'), makeSubRow('past_due', 'plan-standard')];
      const ov = computeOverview([], [], rows, [], []);
      expect(ov.mrr).toBe(0);
      expect(ov.overdueCount).toBe(1);
    });

    it('accumulates MRR across multiple active subscriptions', () => {
      const rows = [
        makeSubRow('active', 'plan-standard'),  // 29
        makeSubRow('active', 'plan-standard'),  // 29
      ];
      const ov = computeOverview([], [], rows, [], []);
      expect(ov.mrr).toBe(58);
    });
  });

  describe('support threads', () => {
    it('counts open threads correctly', () => {
      const threads = [
        makeThread('t1', 'open', 'superadmin'),
        makeThread('t2', 'open', 'admin'),
        makeThread('t3', 'resolved', 'admin'),
      ];
      const ov = computeOverview([], [], [], threads, []);
      expect(ov.openThreads).toBe(2);
    });

    it('counts unanswered threads (open, last msg from admin)', () => {
      const threads = [
        makeThread('t1', 'open', 'admin'),    // unanswered
        makeThread('t2', 'open', 'superadmin'), // answered
        makeThread('t3', 'resolved', 'admin'),  // resolved, not counted
      ];
      const ov = computeOverview([], [], [], threads, []);
      expect(ov.unansweredThreads).toBe(1);
    });

    it('returns 0 for empty thread list', () => {
      const ov = computeOverview([], [], [], [], []);
      expect(ov.openThreads).toBe(0);
      expect(ov.unansweredThreads).toBe(0);
    });
  });

  describe('error groups', () => {
    it('groups reports by name+source', () => {
      const reports = [
        makeReport('NetworkError', 'api.load'),
        makeReport('NetworkError', 'api.load'),
        makeReport('TypeError', 'logic.parse'),
      ];
      const ov = computeOverview([], [], [], [], reports);
      expect(ov.recentErrorGroups).toBe(2);
    });

    it('treats same name with different source as separate groups', () => {
      const reports = [
        makeReport('Error', 'feature.a'),
        makeReport('Error', 'feature.b'),
      ];
      const ov = computeOverview([], [], [], [], reports);
      expect(ov.recentErrorGroups).toBe(2);
    });
  });

  describe('demo dataset shape', () => {
    it('returns non-zero totals from the seeded demo stores', () => {
      const metrics = usePlatformUsageStore.getState().metrics;
      const asociatii = usePlatformAsociatiiStore.getState().asociatii;
      const subRows = usePlatformSubscriptionsStore.getState().rows;
      const allThreads = usePlatformMessengerStore.getState().allThreads();
      const errorReports = usePlatformErrorStore.getState().reports;

      const ov = computeOverview(metrics, asociatii, subRows, allThreads, errorReports);

      expect(ov.totalAsociatii).toBeGreaterThan(0);
      expect(ov.totalMembers).toBeGreaterThan(0);
      expect(ov.totalApartments).toBeGreaterThan(0);
      expect(ov.recentAnnouncements).toBeGreaterThan(0);
      expect(ov.recentErrorGroups).toBeGreaterThan(0);
    });

    it('demo has at least one suspended association', () => {
      const asociatii = usePlatformAsociatiiStore.getState().asociatii;
      const metrics = usePlatformUsageStore.getState().metrics;
      const ov = computeOverview(metrics, asociatii, [], [], []);
      expect(ov.suspendedLifecycle).toBeGreaterThanOrEqual(1);
    });

    it('demo has open support threads', () => {
      const metrics = usePlatformUsageStore.getState().metrics;
      const asociatii = usePlatformAsociatiiStore.getState().asociatii;
      const subRows = usePlatformSubscriptionsStore.getState().rows;
      const allThreads = usePlatformMessengerStore.getState().allThreads();
      const errorReports = usePlatformErrorStore.getState().reports;
      const ov = computeOverview(metrics, asociatii, subRows, allThreads, errorReports);
      expect(ov.openThreads).toBeGreaterThan(0);
    });
  });
});
