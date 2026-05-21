import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { EyeOff, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDateTime } from '@/shared/lib/format';
import { useAnonymousStore } from './anonymousStore';
import { isValidMessage, openCount, orderedMessages } from './anonymousLogic';

export default function AnonymousPage() {
  const { t } = useTranslation();
  const { messages, add, toggleStatus } = useAnonymousStore();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');

  const ordered = orderedMessages(messages);
  const valid = isValidMessage(body);
  const pending = openCount(messages);

  const submit = () => {
    if (!valid) return;
    add(body);
    toast.success(t('anonymous.added'));
    setOpen(false);
    setBody('');
  };

  return (
    <div>
      <PageHeader
        title={t('anonymous.title')}
        subtitle={t('anonymous.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('anonymous.new')}
          </Button>
        }
      />

      {pending > 0 && (
        <Card className="mb-3 bg-warning/10 p-3 text-sm text-warning">
          {t('anonymous.pendingBanner', { count: pending })}
        </Card>
      )}

      {ordered.length === 0 ? (
        <EmptyState body={t('anonymous.empty')} icon={<EyeOff className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((m) => (
            <Card key={m.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-line">{m.body}</p>
                <Badge tone={m.status === 'nou' ? 'warning' : 'success'}>
                  {t(`anonymous.status_${m.status}`)}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  {t('anonymous.anonymousAuthor')} · {formatDateTime(m.created_at)}
                </p>
                <Button size="sm" variant="ghost" onClick={() => toggleStatus(m.id)}>
                  {m.status === 'nou' ? t('anonymous.markResolved') : t('anonymous.reopen')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('anonymous.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {t('common.send')}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted">{t('anonymous.privacyNote')}</p>
        <Textarea
          label={t('anonymous.body')}
          placeholder={t('anonymous.bodyHint')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Modal>
    </div>
  );
}
