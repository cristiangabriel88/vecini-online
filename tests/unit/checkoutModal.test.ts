import { describe, expect, it } from 'vitest';
import { BILLING_PLANS, preContractualRows } from '@/features/billing/billingLogic';

describe('preContractualRows', () => {
  it('returns exactly 6 rows for every plan', () => {
    for (const plan of BILLING_PLANS) {
      expect(preContractualRows(plan, 'ro')).toHaveLength(6);
      expect(preContractualRows(plan, 'en')).toHaveLength(6);
    }
  });

  it('every row has non-empty label and value', () => {
    for (const plan of BILLING_PLANS) {
      for (const row of preContractualRows(plan, 'ro')) {
        expect(row.label.length).toBeGreaterThan(0);
        expect(row.value.length).toBeGreaterThan(0);
      }
    }
  });

  it('free plan shows "Gratuit" as price in Romanian', () => {
    const free = BILLING_PLANS.find((p) => p.id === 'plan-gratuit')!;
    const rows = preContractualRows(free, 'ro');
    const priceRow = rows.find((r) => r.label === 'Preț total (TVA inclus)');
    expect(priceRow?.value).toBe('Gratuit');
  });

  it('free plan shows "Free" as price in English', () => {
    const free = BILLING_PLANS.find((p) => p.id === 'plan-gratuit')!;
    const rows = preContractualRows(free, 'en');
    const priceRow = rows.find((r) => r.label === 'Total price (VAT included)');
    expect(priceRow?.value).toBe('Free');
  });

  it('standard plan price row contains amount in RON in Romanian', () => {
    const standard = BILLING_PLANS.find((p) => p.id === 'plan-standard')!;
    const rows = preContractualRows(standard, 'ro');
    const priceRow = rows.find((r) => r.label === 'Preț total (TVA inclus)');
    expect(priceRow?.value).toContain('29');
    expect(priceRow?.value).toContain('lei');
    expect(priceRow?.value).toContain('TVA');
  });

  it('service row contains plan name in Romanian', () => {
    const standard = BILLING_PLANS.find((p) => p.id === 'plan-standard')!;
    const rows = preContractualRows(standard, 'ro');
    const serviceRow = rows.find((r) => r.label === 'Serviciu');
    expect(serviceRow?.value).toContain('Standard');
    expect(serviceRow?.value).toContain('vecini.online');
  });

  it('service row contains plan name in English', () => {
    const premium = BILLING_PLANS.find((p) => p.id === 'plan-premium')!;
    const rows = preContractualRows(premium, 'en');
    const serviceRow = rows.find((r) => r.label === 'Service');
    expect(serviceRow?.value).toContain('Premium');
    expect(serviceRow?.value).toContain('vecini.online');
  });

  it('static rows use correct bilingual values for period and duration', () => {
    const plan = BILLING_PLANS[1];
    const ro = preContractualRows(plan, 'ro');
    const en = preContractualRows(plan, 'en');
    const roPeriod = ro.find((r) => r.label === 'Perioadă de facturare');
    const enPeriod = en.find((r) => r.label === 'Billing period');
    expect(roPeriod?.value).toBe('lunar (30 de zile)');
    expect(enPeriod?.value).toBe('monthly (30 days)');
  });

  it('premium plan standard price is shown correctly', () => {
    const premium = BILLING_PLANS.find((p) => p.id === 'plan-premium')!;
    const rows = preContractualRows(premium, 'en');
    const priceRow = rows.find((r) => r.label === 'Total price (VAT included)');
    expect(priceRow?.value).toContain('59');
    expect(priceRow?.value).toContain('lei');
  });
});
