import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Siren } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { formatDateTime } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useAsociatieApartments } from '@/features/admin/apartmentsStore';
import { useAlertsStore, useAsociatieAlerts } from './alertsStore';
import { hydrateAlerts, sendAlert } from './alertsApi';
import { isSendableAlert, recipientCount } from './alertsLogic';

export default function AlertsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const senderUserId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const items = useAsociatieAlerts();
  const fetchError = useAlertsStore((s) => s.fetchError);
  const apartments = useAsociatieApartments();
  const recipients = recipientCount(apartments);

  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateAlerts(asociatieId);
  }, [asociatieId]);

  const send = () => {
    if (!asociatieId || !isSendableAlert({ title, body })) return;
    const alert = sendAlert(asociatieId, senderUserId, { title, body }, recipients);
    toast.success(t('alerts.sent', { count: alert.recipient_count }));
    setOpen(false);
    setConfirm(false);
    setTitle('');
    setBody('');
  };

  return (
    <div>
      <PageHeader
        title={t('alerts.title')}
        action={
          <Button variant="danger" onClick={() => setOpen(true)}>
            <Siren className="h-4 w-4" /> {t('alerts.send')}
          </Button>
        }
      />

      {fetchError ? (
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                if (asociatieId) void hydrateAlerts(asociatieId);
              }}
            >
              {t('common.retry')}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState body={t('alerts.empty')} icon={<Siren className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="border-urgent/40">
              <h2 className="text-lg font-semibold text-urgent">🚨 {a.title}</h2>
              <p className="mb-2 text-muted">{a.body}</p>
              <p className="text-sm text-muted">
                {formatDateTime(a.sent_at)} · {t('alerts.sent', { count: a.recipient_count })}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('alerts.send')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={!isSendableAlert({ title, body })}
              onClick={() => setConfirm(true)}
            >
              {t('alerts.send')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('alerts.recipients', { count: recipients })}</p>
          <Input
            label={t('announcements.announcementTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label={t('announcements.body')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('alerts.send')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={send}>
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('alerts.confirmSend')}</p>
      </Modal>
    </div>
  );
}
