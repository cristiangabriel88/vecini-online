import { create } from 'zustand';
import type { Subscription } from '@/shared/types/domain';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { BILLING_PLANS, summariseSubscriptions } from '@/features/billing/billingLogic';
import type { SubscriptionStatus } from '@/shared/types/domain';

export interface PlatformSubscriptionRow {
  subscription: Subscription;
  asociatie_id: string;
  asociatie_name: string;
  city: string;
  plan_name_ro: string;
}

const DEMO_SUBSCRIPTIONS: PlatformSubscriptionRow[] = [
  {
    asociatie_id: DEMO_ASOCIATIE.id,
    asociatie_name: DEMO_ASOCIATIE.name,
    city: 'Bucuresti',
    plan_name_ro: 'Standard',
    subscription: {
      id: 'sub-demo-1',
      asociatie_id: DEMO_ASOCIATIE.id,
      plan_id: 'plan-standard',
      status: 'active',
      current_period_start: '2026-06-01T00:00:00Z',
      current_period_end: '2026-07-01T00:00:00Z',
      trial_end_at: null,
      grace_period_end_at: null,
      canceled_at: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      created_at: '2026-01-15T08:00:00Z',
    },
  },
  {
    asociatie_id: 'demo-asoc-2',
    asociatie_name: 'Asociatia de Proprietari Bloc 7, Aleea Crinului',
    city: 'Cluj-Napoca',
    plan_name_ro: 'Gratuit',
    subscription: {
      id: 'sub-demo-2',
      asociatie_id: 'demo-asoc-2',
      plan_id: 'plan-gratuit',
      status: 'trialing',
      current_period_start: '2026-05-25T00:00:00Z',
      current_period_end: '2026-06-25T00:00:00Z',
      trial_end_at: '2026-06-08T00:00:00Z',
      grace_period_end_at: null,
      canceled_at: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      created_at: '2026-05-25T08:00:00Z',
    },
  },
  {
    asociatie_id: 'demo-asoc-3',
    asociatie_name: 'Asociatia de Proprietari Str. Mihai Viteazul 3',
    city: 'Timisoara',
    plan_name_ro: 'Standard',
    subscription: {
      id: 'sub-demo-3',
      asociatie_id: 'demo-asoc-3',
      plan_id: 'plan-standard',
      status: 'past_due',
      current_period_start: '2026-05-01T00:00:00Z',
      current_period_end: '2026-06-01T00:00:00Z',
      trial_end_at: null,
      grace_period_end_at: '2026-06-08T00:00:00Z',
      canceled_at: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      created_at: '2025-11-01T08:00:00Z',
    },
  },
];

export { BILLING_PLANS };

interface PlatformSubscriptionsState {
  rows: PlatformSubscriptionRow[];
  fetchError: string | null;
  replaceAll: (rows: PlatformSubscriptionRow[]) => void;
  setFetchError: (err: string | null) => void;
  markPaid: (subscriptionId: string) => void;
}

export const usePlatformSubscriptionsStore = create<PlatformSubscriptionsState>()((set) => ({
  rows: DEMO_SUBSCRIPTIONS,
  fetchError: null,
  replaceAll: (rows) => set({ rows }),
  setFetchError: (fetchError) => set({ fetchError }),
  markPaid: (subscriptionId) =>
    set((s) => ({
      rows: s.rows.map((r) =>
        r.subscription.id === subscriptionId
          ? { ...r, subscription: { ...r.subscription, status: 'active' as SubscriptionStatus } }
          : r,
      ),
    })),
}));

export function useSubscriptionSummary(): Record<SubscriptionStatus, number> {
  return usePlatformSubscriptionsStore((s) =>
    summariseSubscriptions(s.rows.map((r) => r.subscription)),
  );
}
