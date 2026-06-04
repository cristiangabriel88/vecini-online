import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BillingPlan, Invoice, Subscription, SubscriptionStatus } from '@/shared/types/domain';
import { BILLING_PLANS } from './billingLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import { useAuthStore } from '@/shared/store/authStore';

const DEMO_SUBSCRIPTION: Subscription = {
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
};

const DEMO_INVOICES: Invoice[] = [
  {
    id: 'inv-demo-1',
    asociatie_id: DEMO_ASOCIATIE.id,
    subscription_id: 'sub-demo-1',
    plan_id: 'plan-standard',
    amount_ron: 29,
    issued_at: '2026-06-01T00:00:00Z',
    due_at: '2026-06-15T00:00:00Z',
    paid_at: '2026-06-02T10:00:00Z',
    period_start: '2026-06-01T00:00:00Z',
    period_end: '2026-07-01T00:00:00Z',
    stripe_invoice_id: null,
  },
  {
    id: 'inv-demo-2',
    asociatie_id: DEMO_ASOCIATIE.id,
    subscription_id: 'sub-demo-1',
    plan_id: 'plan-standard',
    amount_ron: 29,
    issued_at: '2026-05-01T00:00:00Z',
    due_at: '2026-05-15T00:00:00Z',
    paid_at: '2026-05-03T09:30:00Z',
    period_start: '2026-05-01T00:00:00Z',
    period_end: '2026-06-01T00:00:00Z',
    stripe_invoice_id: null,
  },
];

interface BillingState {
  plans: BillingPlan[];
  subscriptions: Record<string, Subscription>;
  invoices: Record<string, Invoice[]>;
  fetchError: string | null;
  setPlans: (plans: BillingPlan[]) => void;
  setSubscription: (sub: Subscription) => void;
  setInvoices: (asociatieId: string, invoices: Invoice[]) => void;
  setFetchError: (err: string | null) => void;
  upgradePlan: (asociatieId: string, planId: string) => void;
  setStatus: (asociatieId: string, status: SubscriptionStatus) => void;
}

export const useBillingStore = create<BillingState>()(
  persist(
    (set) => ({
      plans: BILLING_PLANS,
      subscriptions: { [DEMO_ASOCIATIE.id]: DEMO_SUBSCRIPTION },
      invoices: { [DEMO_ASOCIATIE.id]: DEMO_INVOICES },
      fetchError: null,
      setPlans: (plans) => set({ plans }),
      setSubscription: (sub) =>
        set((s) => ({ subscriptions: { ...s.subscriptions, [sub.asociatie_id]: sub } })),
      setInvoices: (asociatieId, invoices) =>
        set((s) => ({ invoices: { ...s.invoices, [asociatieId]: invoices } })),
      setFetchError: (fetchError) => set({ fetchError }),
      upgradePlan: (asociatieId, planId) =>
        set((s) => {
          const existing = s.subscriptions[asociatieId];
          if (!existing) return s;
          return {
            subscriptions: {
              ...s.subscriptions,
              [asociatieId]: { ...existing, plan_id: planId, status: 'active' },
            },
          };
        }),
      setStatus: (asociatieId, status) =>
        set((s) => {
          const existing = s.subscriptions[asociatieId];
          if (!existing) return s;
          return {
            subscriptions: {
              ...s.subscriptions,
              [asociatieId]: { ...existing, status },
            },
          };
        }),
    }),
    { name: 'vecini.billing', version: 1 },
  ),
);

/** Hook: subscription for the currently active asociatie. */
export function useAsociatieSubscription(): Subscription | null {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useBillingStore((s) => (asociatieId ? (s.subscriptions[asociatieId] ?? null) : null));
}

/** Hook: invoices for the currently active asociatie (newest first). */
export function useAsociatieInvoices(): Invoice[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useBillingStore((s) => (asociatieId ? (s.invoices[asociatieId] ?? []) : []));
}
