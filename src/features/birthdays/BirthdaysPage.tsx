import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Cake, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { useBirthdaysStore } from './birthdaysStore';
import {
  MONTHS_RO,
  daysUntilBirthday,
  formatBirthday,
  isValidBirthday,
  todaysBirthdays,
  upcomingBirthdays,
} from './birthdaysLogic';

export default function BirthdaysPage() {
  const { t } = useTranslation();
  const { consents, currentUserId, save, leave } = useBirthdaysStore();
  const mine = consents.find((c) => c.user_id === currentUserId);

  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(String(mine?.birth_day ?? ''));
  const [month, setMonth] = useState(String(mine?.birth_month ?? 1));

  const dayNum = Number(day);
  const monthNum = Number(month);
  const valid = isValidBirthday(dayNum, monthNum);

  const today = todaysBirthdays(consents);
  const upcoming = upcomingBirthdays(consents);

  const openEditor = () => {
    setDay(String(mine?.birth_day ?? ''));
    setMonth(String(mine?.birth_month ?? 1));
    setOpen(true);
  };

  const submit = () => {
    if (!valid) return;
    save(dayNum, monthNum);
    toast.success(t('birthdays.saved'));
    setOpen(false);
  };

  const optOut = () => {
    leave();
    toast.success(t('birthdays.left'));
  };

  return (
    <div>
      <PageHeader
        title={t('birthdays.title')}
        subtitle={t('birthdays.subtitle')}
        action={
          <Button onClick={openEditor}>
            <Plus className="h-4 w-4" /> {mine ? t('birthdays.editConsent') : t('birthdays.addConsent')}
          </Button>
        }
      />

      {mine && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-1">
            <Badge tone="primary">{t('birthdays.youAreListed')}</Badge>
            <p className="text-sm text-text">{formatBirthday(mine)}</p>
          </div>
          <Button variant="ghost" onClick={optOut}>
            {t('birthdays.leave')}
          </Button>
        </Card>
      )}

      {consents.length === 0 ? (
        <EmptyState body={t('birthdays.empty')} icon={<Cake className="h-10 w-10" />} />
      ) : (
        <div className="space-y-6">
          {today.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted">{t('birthdays.todayHeading')}</h2>
              {today.map((c) => (
                <Card key={c.id} className="flex items-center justify-between gap-3 p-4">
                  <p className="font-medium">🎉 {c.user_name}</p>
                  <Badge tone="success">{t('birthdays.today')}</Badge>
                </Card>
              ))}
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted">{t('birthdays.upcomingHeading')}</h2>
              {upcoming.map((c) => {
                const d = daysUntilBirthday(c);
                const rel = d === 1 ? t('birthdays.tomorrow') : t('birthdays.inDays', { days: d });
                return (
                  <Card key={c.id} className="flex items-center justify-between gap-3 p-4">
                    <p className="font-medium">{c.user_name}</p>
                    <span className="text-sm text-muted">
                      {formatBirthday(c)} · {rel}
                    </span>
                  </Card>
                );
              })}
            </section>
          )}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mine ? t('birthdays.editConsent') : t('birthdays.addConsent')}
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
        <div className="flex gap-3">
          <Input
            label={t('birthdays.day')}
            inputMode="numeric"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-24"
          />
          <Select
            label={t('birthdays.month')}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="flex-1"
          >
            {MONTHS_RO.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
