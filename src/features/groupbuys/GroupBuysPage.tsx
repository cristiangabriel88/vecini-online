import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, Users } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useGroupBuyStore } from './groupBuyStore';
import { activeGroupBuys, closedGroupBuys, isValidGroupBuy } from './groupBuyLogic';

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function GroupBuysPage() {
  const { t } = useTranslation();
  const { buys, joined, create, join } = useGroupBuyStore();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline());

  const active = activeGroupBuys(buys);
  const closed = closedGroupBuys(buys);
  const valid = isValidGroupBuy(title, deadline);

  const submit = () => {
    if (!valid) return;
    create({ title, description, deadline: `${deadline}T23:59:59` });
    toast.success(t('groupbuys.created'));
    setOpen(false);
    setTitle('');
    setDescription('');
    setDeadline(defaultDeadline());
  };

  const onJoin = (id: string) => {
    join(id);
    toast.success(t('groupbuys.joined'));
  };

  return (
    <div>
      <PageHeader
        title={t('groupbuys.title')}
        subtitle={t('groupbuys.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('groupbuys.new')}
          </Button>
        }
      />

      {active.length === 0 && closed.length === 0 ? (
        <EmptyState body={t('groupbuys.empty')} icon={<ShoppingCart className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {active.map((b) => {
            const isJoined = joined.includes(b.id);
            return (
              <Card key={b.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{b.title}</p>
                  <Badge tone="primary">{t('groupbuys.until', { date: formatDate(b.deadline) })}</Badge>
                </div>
                {b.description && <p className="text-sm text-text">{b.description}</p>}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="flex items-center gap-1.5 text-sm text-muted">
                    <Users className="h-4 w-4" /> {t('groupbuys.signups', { n: b.signups })}
                  </span>
                  <Button variant={isJoined ? 'ghost' : 'primary'} disabled={isJoined} onClick={() => onJoin(b.id)}>
                    {isJoined ? t('groupbuys.joinedLabel') : t('groupbuys.join')}
                  </Button>
                </div>
              </Card>
            );
          })}

          {closed.map((b) => (
            <Card key={b.id} className="space-y-1 p-4 opacity-60">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{b.title}</p>
                <Badge tone="neutral">{t('groupbuys.closed')}</Badge>
              </div>
              <p className="text-sm text-muted">{t('groupbuys.signups', { n: b.signups })}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('groupbuys.new')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {t('common.publish')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label={t('groupbuys.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            label={t('groupbuys.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label={t('groupbuys.deadline')}
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
