import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import type { GuardModal } from '@/shared/lib/useUnsavedGuard';

export function UnsavedChangesModal({ open, onConfirm, onCancel }: GuardModal) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('common.unsavedChanges.title')}
      footer={
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {t('common.unsavedChanges.stay')}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {t('common.unsavedChanges.leave')}
          </Button>
        </div>
      }
    >
      <p>{t('common.unsavedChanges.body')}</p>
    </Modal>
  );
}
