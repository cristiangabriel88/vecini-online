import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Gift, Plus, Check, Trash2, PartyPopper } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { Modal } from '@/shared/components/Modal';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { useAuthStore } from '@/shared/store/authStore';
import { useWelcomeKitStore, useAsociatieWelcomeKit } from './welcomeKitStore';
import { hydrateWelcomeKit, addWelcomeKitItemLive, removeWelcomeKitItemLive } from './welcomeKitApi';
import { completion, isComplete, isValidItem, sortItems } from './welcomeKitLogic';

export default function WelcomeKitPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useWelcomeKitStore((s) => s.fetchError);
  const doneIds = useWelcomeKitStore((s) => s.doneIds);
  const { removeItem, toggleDone } = useWelcomeKitStore();
  const items = useAsociatieWelcomeKit();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (asociatieId) void hydrateWelcomeKit(asociatieId);
  }, [asociatieId]);

  const ordered = sortItems(items);
  const doneSet = new Set(doneIds);
  const { done, total, percent } = completion(items, doneSet);
  const allDone = isComplete(items, doneSet);
  const valid = isValidItem(title, body);

  const submit = () => {
    if (!valid || !asociatieId) return;
    const item = {
      id: `wk-${Date.now()}`,
      asociatie_id: asociatieId,
      order: items.length + 1,
      title: title.trim(),
      body: body.trim(),
    };
    addWelcomeKitItemLive(asociatieId, item);
    toast.success(t('welcomeKit.added'));
    setTitle('');
    setBody('');
    setOpen(false);
  };

  const onRemove = (itemId: string) => {
    setPendingRemoveId(itemId);
  };

  const confirmRemove = () => {
    if (!asociatieId || !pendingRemoveId) return;
    removeItem(asociatieId, pendingRemoveId);
    removeWelcomeKitItemLive(pendingRemoveId);
    setPendingRemoveId(null);
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateWelcomeKit(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('welcomeKit.title')}
        subtitle={t('welcomeKit.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('welcomeKit.addStep')}
          </Button>
        }
      />

      {total === 0 ? (
        <EmptyState body={t('welcomeKit.empty')} icon={<Gift className="h-10 w-10" />} />
      ) : (
        <>
          <Card className="mb-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">
                {allDone ? (
                  <span className="inline-flex items-center gap-2 text-success">
                    <PartyPopper className="h-4 w-4" /> {t('welcomeKit.allDone')}
                  </span>
                ) : (
                  t('welcomeKit.progress', { done, total })
                )}
              </p>
              <span className="text-sm text-muted">{percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </Card>

          <div className="space-y-3">
            {ordered.map((item, i) => {
              const checked = doneSet.has(item.id);
              return (
                <Card key={item.id} className="flex items-start gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => toggleDone(item.id)}
                    aria-pressed={checked}
                    aria-label={t(checked ? 'welcomeKit.markUndone' : 'welcomeKit.markDone')}
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      checked
                        ? 'border-primary bg-primary text-white'
                        : 'border-border text-transparent hover:border-primary'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted">{i + 1}.</span>
                      <p className={`font-medium ${checked ? 'text-muted line-through' : ''}`}>
                        {item.title}
                      </p>
                      {checked && <Badge tone="success">{t('welcomeKit.doneBadge')}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted">{item.body}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(item.id)}
                    aria-label={t('welcomeKit.removeStep')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={pendingRemoveId !== null}
        onClose={() => setPendingRemoveId(null)}
        title={t('welcomeKit.removeStepTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingRemoveId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmRemove}>
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </Button>
          </>
        }
      >
        <p>{t('welcomeKit.removeStepConfirm')}</p>
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('welcomeKit.addStep')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label={t('welcomeKit.stepTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('welcomeKit.stepTitleHint')}
          />
          <Textarea
            label={t('welcomeKit.stepBody')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('welcomeKit.stepBodyHint')}
          />
        </div>
      </Modal>
    </div>
  );
}
