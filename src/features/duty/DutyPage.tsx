import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { formatDate } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID, DEMO_CURRENT_USER_NAME } from '@/shared/demo/demoData';
import { useDutyStore, useAsociatieDuty } from './dutyStore';
import { currentDuty, isCovered, isMine, sortDuty } from './dutyLogic';
import { hydrateDutySlots, signUpForDuty, releaseFromDuty } from './dutyApi';

export default function DutyPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const userName = useAuthStore((s) => s.profile?.full_name) ?? DEMO_CURRENT_USER_NAME;
  const fetchError = useDutyStore((s) => s.fetchError);
  const slots = useAsociatieDuty();

  const [signFor, setSignFor] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateDutySlots(asociatieId);
  }, [asociatieId]);

  const today = new Date().toISOString();
  const ordered = sortDuty(slots);
  const current = currentDuty(slots, today);

  const submit = () => {
    if (!signFor || !asociatieId) return;
    signUpForDuty(asociatieId, signFor, userId, userName, note);
    toast.success(t('duty.signedUp'));
    setSignFor(null);
    setNote('');
  };

  if (fetchError) {
    return (
      <ErrorState
        title={t('common.errorTitle')}
        body={t('common.loadError')}
        action={
          <Button variant="ghost" onClick={() => { if (asociatieId) void hydrateDutySlots(asociatieId); }}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title={t('duty.title')} subtitle={t('duty.subtitle')} />

      <Card className="mb-4 bg-primary/5 p-4">
        <p className="text-sm text-muted">{t('duty.onDutyNow')}</p>
        <p className="font-medium">
          {current && isCovered(current)
            ? `${current.volunteer_name} · ${formatDate(current.week_start)}`
            : t('duty.nobodyOnDuty')}
        </p>
      </Card>

      {ordered.length === 0 ? (
        <EmptyState body={t('duty.empty')} icon={<ShieldCheck className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((s) => {
            const mine = isMine(s, userId);
            return (
              <Card key={s.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{t('duty.weekendOf', { date: formatDate(s.week_start) })}</p>
                  <Badge tone={isCovered(s) ? 'success' : 'warning'}>
                    {isCovered(s) ? t('duty.covered') : t('duty.free')}
                  </Badge>
                </div>
                {isCovered(s) ? (
                  <p className="text-sm text-muted">
                    {s.volunteer_name}
                    {s.note ? ` — ${s.note}` : ''}
                  </p>
                ) : (
                  <p className="text-sm text-muted">{t('duty.freeHint')}</p>
                )}
                {mine && asociatieId ? (
                  <Button size="sm" variant="ghost" onClick={() => releaseFromDuty(asociatieId, s.id)}>
                    {t('duty.release')}
                  </Button>
                ) : (
                  !isCovered(s) && (
                    <Button size="sm" variant="secondary" onClick={() => setSignFor(s.id)}>
                      {t('duty.signUp')}
                    </Button>
                  )
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={signFor !== null}
        onClose={() => setSignFor(null)}
        title={t('duty.signUp')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSignFor(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit}>{t('common.save')}</Button>
          </>
        }
      >
        <Input
          label={t('duty.note')}
          placeholder={t('duty.noteHint')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </div>
  );
}
