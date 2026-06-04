import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Sprout, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { DatePicker } from '@/shared/components/DatePicker';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { isAssigned, isMine, isValidTask, openTaskCount, sortTasks } from './greenLogic';
import { useGreenStore, useAsociatieGreenTasks } from './greenStore';
import { hydrateGreenTasks, addGreenTask, signUpForTask, releaseTask } from './greenApi';

const today = () => new Date().toISOString().slice(0, 10);

export default function GreenSpacePage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.session?.user?.id ?? 'u-res');
  const profile = useAuthStore((s) => s.profile);
  const userName = profile?.full_name ?? userId;
  const fetchError = useGreenStore((s) => s.fetchError);
  const tasks = useAsociatieGreenTasks();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [week, setWeek] = useState(today());

  useEffect(() => {
    if (asociatieId) void hydrateGreenTasks(asociatieId);
  }, [asociatieId]);

  const ordered = sortTasks(tasks);
  const free = openTaskCount(tasks);
  const valid = isValidTask(title, week);

  const submit = () => {
    if (!valid || !asociatieId) return;
    addGreenTask(asociatieId, {
      id: `gt-${Date.now()}`,
      asociatie_id: asociatieId,
      title: title.trim(),
      week_start: week,
      volunteer_user_id: null,
      volunteer_name: null,
    });
    toast.success(t('green.added'));
    setOpen(false);
    setTitle('');
    setWeek(today());
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateGreenTasks(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('green.title')}
        subtitle={t('green.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('green.new')}
          </Button>
        }
      />

      {free > 0 && (
        <Card className="mb-3 bg-warning/10 p-3 text-sm text-warning">
          {t('green.freeBanner', { count: free })}
        </Card>
      )}

      {ordered.length === 0 ? (
        <EmptyState body={t('green.empty')} icon={<Sprout className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((tk) => {
            const mine = isMine(tk, userId);
            return (
              <Card key={tk.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{tk.title}</p>
                    <p className="text-sm text-muted">{t('green.weekOf', { date: formatDate(tk.week_start) })}</p>
                  </div>
                  <Badge tone={isAssigned(tk) ? 'success' : 'warning'}>
                    {isAssigned(tk) ? tk.volunteer_name : t('green.free')}
                  </Badge>
                </div>
                {mine ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => asociatieId && releaseTask(asociatieId, tk.id)}
                  >
                    {t('green.release')}
                  </Button>
                ) : (
                  !isAssigned(tk) && asociatieId && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => signUpForTask(asociatieId, tk.id, userId, userName)}
                    >
                      {t('green.signUp')}
                    </Button>
                  )
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('green.new')}
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
          <Input label={t('green.taskLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <DatePicker label={t('green.week')} value={week} onChange={(v) => setWeek(v)} />
        </div>
      </Modal>
    </div>
  );
}
