import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CarFront, Plus, MapPin, Clock } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { useCarpoolStore } from './carpoolStore';
import { isValidProfile, searchProfiles } from './carpoolLogic';

export default function CarpoolPage() {
  const { t } = useTranslation();
  const { profiles, currentUserId, save, leave } = useCarpoolStore();
  const mine = profiles.find((p) => p.user_id === currentUserId);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState(mine?.destination ?? '');
  const [schedule, setSchedule] = useState(mine?.schedule ?? '');

  const results = searchProfiles(profiles, query);
  const valid = isValidProfile(destination);

  const openEditor = () => {
    setDestination(mine?.destination ?? '');
    setSchedule(mine?.schedule ?? '');
    setOpen(true);
  };

  const submit = () => {
    if (!valid) return;
    save(destination, schedule);
    toast.success(t('carpool.saved'));
    setOpen(false);
  };

  const optOut = () => {
    leave();
    toast.success(t('carpool.left'));
  };

  return (
    <div>
      <PageHeader
        title={t('carpool.title')}
        subtitle={t('carpool.subtitle')}
        action={
          <Button onClick={openEditor}>
            <Plus className="h-4 w-4" /> {mine ? t('carpool.editProfile') : t('carpool.addProfile')}
          </Button>
        }
      />

      {mine && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-1">
            <Badge tone="primary">{t('carpool.youAreListed')}</Badge>
            <p className="text-sm text-text">{mine.destination}</p>
            {mine.schedule && <p className="text-sm text-muted">{mine.schedule}</p>}
          </div>
          <Button variant="ghost" onClick={optOut}>
            {t('carpool.leave')}
          </Button>
        </Card>
      )}

      <Input
        aria-label={t('common.search')}
        placeholder={t('carpool.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4"
      />

      {results.length === 0 ? (
        <EmptyState body={t('carpool.empty')} icon={<CarFront className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((p) => (
            <Card key={p.id} className="space-y-2 p-4">
              <p className="font-medium">{p.user_name}</p>
              <p className="flex items-center gap-2 text-sm text-text">
                <MapPin className="h-4 w-4 text-muted" /> {p.destination}
              </p>
              {p.schedule && (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Clock className="h-4 w-4" /> {p.schedule}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mine ? t('carpool.editProfile') : t('carpool.addProfile')}
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
        <div className="space-y-4">
          <Input
            label={t('carpool.destination')}
            hint={t('carpool.destinationHint')}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
          <Input
            label={t('carpool.schedule')}
            hint={t('carpool.scheduleHint')}
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
