import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';
import { Checkbox } from '@/shared/components/Checkbox';
import type { BillingPlan } from '@/shared/types/domain';
import { preContractualRows } from './billingLogic';

interface CheckoutModalProps {
  plan: BillingPlan;
  onConfirm: () => void;
  onClose: () => void;
}

export function CheckoutModal({ plan, onConfirm, onClose }: CheckoutModalProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'ro';
  const [consented, setConsented] = useState(false);

  const rows = preContractualRows(plan, lang);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t('billing.checkout.title')}
      size="lg"
      footer={
        <div className="checkout-modal__footer">
          <Button variant="ghost" onClick={onClose}>
            {t('billing.checkout.cancel')}
          </Button>
          <Button variant="primary" disabled={!consented} onClick={handleConfirm}>
            {t('billing.checkout.confirm')}
          </Button>
        </div>
      }
    >
      <table className="checkout-modal__table" aria-label={t('billing.checkout.title')}>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="checkout-modal__withdrawal">
        <ShieldAlert size={16} aria-hidden="true" />
        <div>
          <strong>{t('billing.checkout.withdrawalTitle')}</strong>
          <p>{t('billing.checkout.withdrawalBody')}</p>
          <a
            href="/protectia-consumatorului"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('billing.checkout.learnMore')}
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <Checkbox
        checked={consented}
        onChange={setConsented}
        label={t('billing.checkout.consentLabel')}
      />
    </Modal>
  );
}
