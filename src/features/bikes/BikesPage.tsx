import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Bike as BikeIcon, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { useAuthStore } from '@/shared/store/authStore';
import { isValidBike, searchBikes, type BikeFilter } from './bikeLogic';
import { useBikesStore, useAsociatieBikes } from './bikesStore';
import { hydrateBikes, addBike, toggleBikeAbandoned } from './bikesApi';

export default function BikesPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const userId = useAuthStore((s) => s.session?.user?.id ?? '');
  const profile = useAuthStore((s) => s.profile);
  const fetchError = useBikesStore((s) => s.fetchError);
  const bikes = useAsociatieBikes();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BikeFilter>('all');
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [serial, setSerial] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateBikes(asociatieId);
  }, [asociatieId]);

  const results = searchBikes(bikes, query, filter);
  const valid = isValidBike(description);

  const submit = () => {
    if (!valid || !asociatieId) return;
    const bike = {
      id: `bk-${Date.now()}`,
      asociatie_id: asociatieId,
      owner_user_id: userId,
      owner_name: profile?.full_name ?? userId,
      description: description.trim(),
      serial: serial.trim() || null,
      photo_path: null,
      abandoned: false,
      created_at: new Date().toISOString(),
    };
    addBike(asociatieId, bike);
    toast.success(t('bikes.added'));
    setOpen(false);
    setDescription('');
    setSerial('');
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateBikes(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('bikes.title')}
        subtitle={t('bikes.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('bikes.new')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          aria-label={t('common.search')}
          placeholder={t('bikes.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Select
          aria-label={t('bikes.filter')}
          value={filter}
          onChange={(e) => setFilter(e.target.value as BikeFilter)}
        >
          <option value="all">{t('bikes.filter_all')}</option>
          <option value="active">{t('bikes.filter_active')}</option>
          <option value="abandoned">{t('bikes.filter_abandoned')}</option>
        </Select>
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('bikes.empty')} icon={<BikeIcon className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((b) => (
            <Card key={b.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{b.description}</p>
                <p className="text-sm text-muted">
                  {b.owner_name}
                  {b.serial && ` · ${t('bikes.serial')}: ${b.serial}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {b.abandoned && <Badge tone="warning">{t('bikes.abandoned')}</Badge>}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => asociatieId && toggleBikeAbandoned(asociatieId, b)}
                >
                  {b.abandoned ? t('bikes.markActive') : t('bikes.markAbandoned')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('bikes.new')}
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
            label={t('bikes.description')}
            placeholder={t('bikes.descriptionHint')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input label={t('bikes.serial')} value={serial} onChange={(e) => setSerial(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
