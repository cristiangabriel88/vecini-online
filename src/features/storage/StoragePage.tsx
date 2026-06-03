import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Box, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { useAuthStore } from '@/shared/store/authStore';
import { isValidStorageUnit, searchStorageUnits, type StorageFilter } from './storageLogic';
import { useStorageStore, useAsociatieStorageUnits } from './storageStore';
import { hydrateStorageUnits, addStorageUnit } from './storageApi';

export default function StoragePage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useStorageStore((s) => s.fetchError);
  const units = useAsociatieStorageUnits();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StorageFilter>('all');
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [apartment, setApartment] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (asociatieId) void hydrateStorageUnits(asociatieId);
  }, [asociatieId]);

  const results = searchStorageUnits(units, query, filter);
  const valid = isValidStorageUnit(label);

  const submit = () => {
    if (!valid || !asociatieId) return;
    const apt = apartment.trim();
    const unit = {
      id: `su-${Date.now()}`,
      asociatie_id: asociatieId,
      label: label.trim(),
      apartment_id: apt ? `ap-${apt}` : null,
      apartment_label: apt || null,
      notes: notes.trim() || null,
    };
    addStorageUnit(asociatieId, unit);
    toast.success(t('storage.added'));
    setOpen(false);
    setLabel('');
    setApartment('');
    setNotes('');
  };

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateStorageUnits(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('storage.title')}
        subtitle={t('storage.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('storage.new')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          aria-label={t('common.search')}
          placeholder={t('storage.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Select aria-label={t('storage.filter')} value={filter} onChange={(e) => setFilter(e.target.value as StorageFilter)}>
          <option value="all">{t('storage.filter_all')}</option>
          <option value="assigned">{t('storage.filter_assigned')}</option>
          <option value="unassigned">{t('storage.filter_unassigned')}</option>
        </Select>
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('storage.empty')} icon={<Box className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((u) => (
            <Card key={u.id} className="space-y-1 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{u.label}</p>
                {u.apartment_label ? (
                  <Badge tone="primary">{u.apartment_label}</Badge>
                ) : (
                  <Badge tone="warning">{t('storage.unassigned')}</Badge>
                )}
              </div>
              {u.notes && <p className="text-sm text-muted">{u.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('storage.new')}
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
          <Input label={t('storage.label')} value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input
            label={t('storage.apartment')}
            hint={t('storage.apartmentHint')}
            value={apartment}
            onChange={(e) => setApartment(e.target.value)}
          />
          <Textarea label={t('storage.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
