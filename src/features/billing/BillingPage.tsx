import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, CreditCard, FileText, RefreshCw, Zap } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { useAuthStore } from '@/shared/store/authStore';
import { useApartmentsStore } from '@/features/admin/apartmentsStore';
import { hydrateBilling } from './billingApi';
import {
  BILLING_PLANS,
  findPlanById,
  formatPriceRon,
  isBlocked,
  isDunning,
  isInvoicePaid,
  statusTone,
  usagePercent,
} from './billingLogic';
import { CheckoutModal } from './CheckoutModal';
import {
  useAsociatieInvoices,
  useAsociatieSubscription,
  useBillingStore,
} from './billingStore';

function UsageMeter({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number | null;
}) {
  const { t } = useTranslation();
  const pct = max !== null ? usagePercent(used, max) : 0;
  const over = max !== null && used > max;
  return (
    <div className="billing-meter">
      <div className="billing-meter__header">
        <span className="billing-meter__label">{label}</span>
        <span className="billing-meter__count">
          {used} / {max !== null ? max : t('billing.unlimited')}
        </span>
      </div>
      {max !== null && (
        <div className="billing-meter__bar" aria-label={`${pct}%`}>
          <div
            className="billing-meter__fill"
            data-over={over}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  current,
  onUpgrade,
}: {
  plan: (typeof BILLING_PLANS)[number];
  current: boolean;
  onUpgrade: (planId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'ro';
  return (
    <Card className={`billing-plan-card${current ? ' billing-plan-card--current' : ''}`}>
      {current && (
        <div className="billing-plan-card__current-badge">
          <CheckCircle2 size={13} />
          {t('billing.currentPlan')}
        </div>
      )}
      <div className="billing-plan-card__name">
        {lang === 'en' ? plan.name_en : plan.name_ro}
      </div>
      <div className="billing-plan-card__price">{formatPriceRon(plan.price_ron)}</div>
      <ul className="billing-plan-card__limits">
        <li>
          {plan.max_apartments !== null
            ? t('billing.limitApartments', { n: plan.max_apartments })
            : t('billing.unlimitedApartments')}
        </li>
        <li>
          {plan.max_members !== null
            ? t('billing.limitMembers', { n: plan.max_members })
            : t('billing.unlimitedMembers')}
        </li>
        <li>
          {plan.max_admins !== null
            ? t('billing.limitAdmins', { n: plan.max_admins })
            : t('billing.unlimitedAdmins')}
        </li>
      </ul>
      {!current && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => onUpgrade(plan.id)}
          className="billing-plan-card__cta"
        >
          <Zap size={13} />
          {t('billing.upgradeTo', { plan: lang === 'en' ? plan.name_en : plan.name_ro })}
        </Button>
      )}
    </Card>
  );
}

export default function BillingPage() {
  const { t } = useTranslation();
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);
  const subscription = useAsociatieSubscription();
  const invoices = useAsociatieInvoices();
  const upgradePlan = useBillingStore((s) => s.upgradePlan);
  const apartments = useApartmentsStore((s) =>
    currentAsociatieId ? (s.byAsociatie[currentAsociatieId] ?? []).length : 0,
  );

  const [isHydrating, setIsHydrating] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentAsociatieId) return;
    setIsHydrating(true);
    void hydrateBilling(currentAsociatieId).finally(() => setIsHydrating(false));
  }, [currentAsociatieId]);

  const retry = () => {
    if (!currentAsociatieId) return;
    setIsHydrating(true);
    void hydrateBilling(currentAsociatieId).finally(() => setIsHydrating(false));
  };

  const currentPlan = subscription
    ? findPlanById(BILLING_PLANS, subscription.plan_id) ?? BILLING_PLANS[0]
    : BILLING_PLANS[0];

  const handleUpgrade = (planId: string) => {
    setPendingPlanId(planId);
  };

  const handleConfirmUpgrade = () => {
    if (!currentAsociatieId || !pendingPlanId) return;
    upgradePlan(currentAsociatieId, pendingPlanId);
    setPendingPlanId(null);
  };

  return (
    <div>
      <PageHeader
        title={t('billing.title')}
        subtitle={t('billing.subtitle')}
      />

      {/* Dunning / blocked warning */}
      {subscription && isDunning(subscription) && (
        <Card className="mb-4 billing-alert billing-alert--warning">
          <AlertTriangle size={16} />
          <div>
            <strong>{t('billing.pastDueTitle')}</strong>
            <p>{t('billing.pastDueBody')}</p>
          </div>
        </Card>
      )}
      {subscription && isBlocked(subscription) && (
        <Card className="mb-4 billing-alert billing-alert--danger">
          <AlertTriangle size={16} />
          <div>
            <strong>{t('billing.unpaidTitle')}</strong>
            <p>{t('billing.unpaidBody')}</p>
          </div>
        </Card>
      )}

      {/* Current subscription summary */}
      {subscription && (
        <Card className="mb-4">
          <div className="billing-summary">
            <div className="billing-summary__plan">
              <CreditCard size={18} />
              <div>
                <div className="billing-summary__plan-name">
                  {currentPlan.name_ro}
                </div>
                <div className="billing-summary__plan-period">
                  {t('billing.periodLabel', {
                    from: formatDate(subscription.current_period_start),
                    to: formatDate(subscription.current_period_end),
                  })}
                </div>
              </div>
            </div>
            <div className="billing-summary__status">
              <Badge tone={statusTone(subscription.status)}>
                {t(`billing.status.${subscription.status}`)}
              </Badge>
              {isHydrating && (
                <Button variant="ghost" size="sm" onClick={retry} aria-label={t('billing.retry')}>
                  <RefreshCw size={13} />
                </Button>
              )}
            </div>
          </div>

          {/* Usage meters */}
          <div className="billing-meters">
            <UsageMeter
              label={t('billing.usageApartments')}
              used={apartments}
              max={currentPlan.max_apartments}
            />
            <UsageMeter
              label={t('billing.usageMembers')}
              used={0}
              max={currentPlan.max_members}
            />
          </div>
        </Card>
      )}

      {/* Plan selection */}
      <h2 className="billing-section-title">{t('billing.plansTitle')}</h2>
      <div className="billing-plans-grid">
        {BILLING_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={subscription?.plan_id === plan.id}
            onUpgrade={handleUpgrade}
          />
        ))}
      </div>

      {pendingPlanId && (
        <CheckoutModal
          plan={findPlanById(BILLING_PLANS, pendingPlanId) ?? BILLING_PLANS[0]}
          onConfirm={handleConfirmUpgrade}
          onClose={() => setPendingPlanId(null)}
        />
      )}

      {/* Invoice history */}
      <h2 className="billing-section-title">{t('billing.invoicesTitle')}</h2>
      {invoices.length === 0 ? (
        <EmptyState
          title={t('billing.noInvoices')}
          body={t('billing.noInvoicesBody')}
          icon={<FileText size={32} />}
        />
      ) : (
        <Card>
          <table className="billing-invoices-table">
            <thead>
              <tr>
                <th>{t('billing.invPeriod')}</th>
                <th>{t('billing.invIssued')}</th>
                <th>{t('billing.invAmount')}</th>
                <th>{t('billing.invStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    {formatDate(inv.period_start)} - {formatDate(inv.period_end)}
                  </td>
                  <td>{formatDate(inv.issued_at)}</td>
                  <td>
                    {inv.amount_ron.toLocaleString('ro-RO', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    lei
                  </td>
                  <td>
                    <Badge tone={isInvoicePaid(inv) ? 'success' : 'warning'}>
                      {isInvoicePaid(inv) ? t('billing.paid') : t('billing.unpaidInv')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
