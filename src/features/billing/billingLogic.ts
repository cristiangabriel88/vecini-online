import type { BillingPlan, Invoice, Subscription, SubscriptionStatus } from '@/shared/types/domain';

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'plan-gratuit',
    name_ro: 'Gratuit',
    name_en: 'Free',
    price_ron: 0,
    billing_interval: 'month',
    max_apartments: 30,
    max_members: 60,
    max_admins: 2,
    sort_order: 0,
  },
  {
    id: 'plan-standard',
    name_ro: 'Standard',
    name_en: 'Standard',
    price_ron: 29,
    billing_interval: 'month',
    max_apartments: 100,
    max_members: 200,
    max_admins: 5,
    sort_order: 1,
  },
  {
    id: 'plan-premium',
    name_ro: 'Premium',
    name_en: 'Premium',
    price_ron: 59,
    billing_interval: 'month',
    max_apartments: null,
    max_members: null,
    max_admins: null,
    sort_order: 2,
  },
];

export function isSubscriptionActive(sub: Subscription): boolean {
  return sub.status === 'active' || sub.status === 'trialing';
}

export function isDunning(sub: Subscription): boolean {
  return sub.status === 'past_due';
}

export function isBlocked(sub: Subscription): boolean {
  return sub.status === 'unpaid';
}

export function statusTone(
  status: SubscriptionStatus,
): 'success' | 'warning' | 'danger' | 'neutral' | 'primary' {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
      return 'primary';
    case 'past_due':
      return 'warning';
    case 'unpaid':
      return 'danger';
    case 'canceled':
      return 'neutral';
  }
}

export function isOverApartmentLimit(plan: BillingPlan, count: number): boolean {
  return plan.max_apartments !== null && count > plan.max_apartments;
}

export function isOverMemberLimit(plan: BillingPlan, count: number): boolean {
  return plan.max_members !== null && count > plan.max_members;
}

/** Days until a future date (negative if past). */
export function daysUntil(dateStr: string, nowStr: string): number {
  const target = new Date(dateStr).getTime();
  const current = new Date(nowStr).getTime();
  return Math.ceil((target - current) / 86_400_000);
}

export function formatPriceRon(priceRon: number): string {
  if (priceRon === 0) return 'Gratuit';
  return `${priceRon.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei/luna`;
}

export function isInvoicePaid(invoice: Invoice): boolean {
  return invoice.paid_at !== null;
}

export function findPlanById(plans: BillingPlan[], planId: string): BillingPlan | undefined {
  return plans.find((p) => p.id === planId);
}

export function planName(plan: BillingPlan, lang: 'ro' | 'en'): string {
  return lang === 'en' ? plan.name_en : plan.name_ro;
}

export function usagePercent(used: number, max: number | null): number {
  if (max === null || max === 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

export interface PreContractualRow {
  label: string;
  value: string;
}

const PCT_LABELS = {
  ro: {
    service: 'Serviciu',
    price: 'Preț total (TVA inclus)',
    period: 'Perioadă de facturare',
    duration: 'Durată',
    cancellation: 'Anulare',
    payment: 'Mijloace de plată',
  },
  en: {
    service: 'Service',
    price: 'Total price (VAT included)',
    period: 'Billing period',
    duration: 'Duration',
    cancellation: 'Cancellation',
    payment: 'Payment methods',
  },
};

const PCT_STATIC = {
  ro: {
    period: 'lunar (30 de zile)',
    duration: 'nedeterminată, reînnoire automată lunară',
    cancellation: 'oricând, fără penalități; cu efect la sfârșitul perioadei curente',
    payment: 'card bancar (procesare Stripe)',
    free: 'Gratuit',
  },
  en: {
    period: 'monthly (30 days)',
    duration: 'open-ended, automatic monthly renewal',
    cancellation: 'any time, no penalty; takes effect at end of current period',
    payment: 'bank card (Stripe)',
    free: 'Free',
  },
};

export function preContractualRows(plan: BillingPlan, lang: 'ro' | 'en'): PreContractualRow[] {
  const labels = PCT_LABELS[lang];
  const statics = PCT_STATIC[lang];
  const name = lang === 'en' ? plan.name_en : plan.name_ro;
  const serviceValue =
    lang === 'ro'
      ? `Platformă digitală vecini.online — Plan ${name}`
      : `vecini.online digital platform — ${name} Plan`;
  const priceValue =
    plan.price_ron === 0
      ? statics.free
      : lang === 'ro'
        ? `${plan.price_ron.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei / lună (TVA inclus)`
        : `${plan.price_ron.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei / month (VAT incl.)`;
  return [
    { label: labels.service, value: serviceValue },
    { label: labels.price, value: priceValue },
    { label: labels.period, value: statics.period },
    { label: labels.duration, value: statics.duration },
    { label: labels.cancellation, value: statics.cancellation },
    { label: labels.payment, value: statics.payment },
  ];
}

export function summariseSubscriptions(
  subs: Subscription[],
): Record<SubscriptionStatus, number> {
  const counts: Record<SubscriptionStatus, number> = {
    active: 0,
    trialing: 0,
    past_due: 0,
    unpaid: 0,
    canceled: 0,
  };
  for (const s of subs) {
    counts[s.status] = (counts[s.status] ?? 0) + 1;
  }
  return counts;
}
