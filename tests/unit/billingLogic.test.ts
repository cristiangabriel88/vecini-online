import { describe, expect, it } from 'vitest';
import {
  BILLING_PLANS,
  daysUntil,
  findPlanById,
  formatPriceRon,
  isBlocked,
  isDunning,
  isInvoicePaid,
  isOverApartmentLimit,
  isOverMemberLimit,
  isSubscriptionActive,
  statusTone,
  summariseSubscriptions,
  usagePercent,
} from '@/features/billing/billingLogic';
import type { Invoice, Subscription } from '@/shared/types/domain';

const BASE_SUB: Subscription = {
  id: 'sub-1',
  asociatie_id: 'asoc-1',
  plan_id: 'plan-standard',
  status: 'active',
  current_period_start: '2026-06-01T00:00:00Z',
  current_period_end: '2026-07-01T00:00:00Z',
  trial_end_at: null,
  grace_period_end_at: null,
  canceled_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  created_at: '2026-01-01T00:00:00Z',
};

describe('BILLING_PLANS', () => {
  it('has 3 plans sorted by sort_order', () => {
    expect(BILLING_PLANS).toHaveLength(3);
    expect(BILLING_PLANS[0].id).toBe('plan-gratuit');
    expect(BILLING_PLANS[1].id).toBe('plan-standard');
    expect(BILLING_PLANS[2].id).toBe('plan-premium');
  });

  it('free plan has zero price', () => {
    expect(BILLING_PLANS[0].price_ron).toBe(0);
  });

  it('premium plan has null (unlimited) limits', () => {
    const premium = BILLING_PLANS[2];
    expect(premium.max_apartments).toBeNull();
    expect(premium.max_members).toBeNull();
    expect(premium.max_admins).toBeNull();
  });
});

describe('isSubscriptionActive', () => {
  it('returns true for active', () => {
    expect(isSubscriptionActive({ ...BASE_SUB, status: 'active' })).toBe(true);
  });
  it('returns true for trialing', () => {
    expect(isSubscriptionActive({ ...BASE_SUB, status: 'trialing' })).toBe(true);
  });
  it('returns false for past_due', () => {
    expect(isSubscriptionActive({ ...BASE_SUB, status: 'past_due' })).toBe(false);
  });
  it('returns false for unpaid', () => {
    expect(isSubscriptionActive({ ...BASE_SUB, status: 'unpaid' })).toBe(false);
  });
  it('returns false for canceled', () => {
    expect(isSubscriptionActive({ ...BASE_SUB, status: 'canceled' })).toBe(false);
  });
});

describe('isDunning / isBlocked', () => {
  it('isDunning returns true only for past_due', () => {
    expect(isDunning({ ...BASE_SUB, status: 'past_due' })).toBe(true);
    expect(isDunning({ ...BASE_SUB, status: 'active' })).toBe(false);
  });
  it('isBlocked returns true only for unpaid', () => {
    expect(isBlocked({ ...BASE_SUB, status: 'unpaid' })).toBe(true);
    expect(isBlocked({ ...BASE_SUB, status: 'past_due' })).toBe(false);
  });
});

describe('statusTone', () => {
  it('active -> success', () => expect(statusTone('active')).toBe('success'));
  it('trialing -> primary', () => expect(statusTone('trialing')).toBe('primary'));
  it('past_due -> warning', () => expect(statusTone('past_due')).toBe('warning'));
  it('unpaid -> danger', () => expect(statusTone('unpaid')).toBe('danger'));
  it('canceled -> neutral', () => expect(statusTone('canceled')).toBe('neutral'));
});

describe('isOverApartmentLimit / isOverMemberLimit', () => {
  const freePlan = BILLING_PLANS[0];
  const premiumPlan = BILLING_PLANS[2];

  it('not over when under limit', () => {
    expect(isOverApartmentLimit(freePlan, 25)).toBe(false);
  });
  it('over when count exceeds max', () => {
    expect(isOverApartmentLimit(freePlan, 31)).toBe(true);
  });
  it('never over with unlimited (null) plan', () => {
    expect(isOverApartmentLimit(premiumPlan, 9999)).toBe(false);
  });
  it('member limit works same way', () => {
    expect(isOverMemberLimit(freePlan, 60)).toBe(false);
    expect(isOverMemberLimit(freePlan, 61)).toBe(true);
  });
});

describe('daysUntil', () => {
  it('positive when target is in future', () => {
    expect(daysUntil('2026-06-10T00:00:00Z', '2026-06-04T00:00:00Z')).toBe(6);
  });
  it('negative when target is in past', () => {
    expect(daysUntil('2026-05-29T00:00:00Z', '2026-06-04T00:00:00Z')).toBeLessThan(0);
  });
});

describe('formatPriceRon', () => {
  it('free plan shows Gratuit', () => {
    expect(formatPriceRon(0)).toBe('Gratuit');
  });
  it('paid plan includes lei/luna', () => {
    const result = formatPriceRon(29);
    expect(result).toContain('lei');
  });
});

describe('isInvoicePaid', () => {
  const baseInv: Invoice = {
    id: 'inv-1',
    asociatie_id: 'asoc-1',
    subscription_id: 'sub-1',
    plan_id: 'plan-standard',
    amount_ron: 29,
    issued_at: '2026-06-01T00:00:00Z',
    due_at: '2026-06-15T00:00:00Z',
    paid_at: null,
    period_start: '2026-06-01T00:00:00Z',
    period_end: '2026-07-01T00:00:00Z',
    stripe_invoice_id: null,
  };
  it('false when paid_at is null', () => {
    expect(isInvoicePaid(baseInv)).toBe(false);
  });
  it('true when paid_at is set', () => {
    expect(isInvoicePaid({ ...baseInv, paid_at: '2026-06-02T00:00:00Z' })).toBe(true);
  });
});

describe('findPlanById', () => {
  it('finds existing plan', () => {
    expect(findPlanById(BILLING_PLANS, 'plan-premium')?.id).toBe('plan-premium');
  });
  it('returns undefined for unknown id', () => {
    expect(findPlanById(BILLING_PLANS, 'plan-xyz')).toBeUndefined();
  });
});

describe('usagePercent', () => {
  it('calculates percent', () => {
    expect(usagePercent(50, 100)).toBe(50);
  });
  it('caps at 100', () => {
    expect(usagePercent(150, 100)).toBe(100);
  });
  it('returns 0 for unlimited (null)', () => {
    expect(usagePercent(999, null)).toBe(0);
  });
});

describe('summariseSubscriptions', () => {
  it('counts by status', () => {
    const subs: Subscription[] = [
      { ...BASE_SUB, status: 'active' },
      { ...BASE_SUB, id: 'sub-2', status: 'active' },
      { ...BASE_SUB, id: 'sub-3', status: 'past_due' },
    ];
    const result = summariseSubscriptions(subs);
    expect(result.active).toBe(2);
    expect(result.past_due).toBe(1);
    expect(result.trialing).toBe(0);
  });
  it('returns zeros for empty array', () => {
    const result = summariseSubscriptions([]);
    expect(result.active).toBe(0);
    expect(result.unpaid).toBe(0);
  });
});
