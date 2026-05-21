import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Handshake, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { useLendingStore } from './lendingStore';
import { isValidItem, searchLendingItems, type AvailabilityFilter } from './lendingLogic';

export default function LendingPage() {
  const { t } = useTranslation();
  const { items, add, toggleAvailable } = useLendingStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AvailabilityFilter>('all');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');

  const results = searchLendingItems(items, query, filter);
  const valid = isValidItem(name, category);

  const submit = () => {
    if (!valid) return;
    add({ name, category });
    toast.success(t('lending.added'));
    setOpen(false);
    setName('');
    setCategory('');
  };

  return (
    <div>
      <PageHeader
        title={t('lending.title')}
        subtitle={t('lending.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('lending.new')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          aria-label={t('common.search')}
          placeholder={t('lending.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Select
          aria-label={t('lending.filter')}
          value={filter}
          onChange={(e) => setFilter(e.target.value as AvailabilityFilter)}
        >
          <option value="all">{t('lending.filter_all')}</option>
          <option value="available">{t('lending.filter_available')}</option>
        </Select>
      </div>

      {results.length === 0 ? (
        <EmptyState body={t('lending.empty')} icon={<Handshake className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {results.map((it) => (
            <Card key={it.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{it.name}</p>
                <p className="text-sm text-muted">
                  {it.category} · {it.owner_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={it.available ? 'success' : 'neutral'}>
                  {it.available ? t('lending.available') : t('lending.borrowed')}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => toggleAvailable(it.id)}>
                  {it.available ? t('lending.markBorrowed') : t('lending.markAvailable')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('lending.new')}
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
          <Input label={t('lending.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label={t('lending.category')}
            placeholder={t('lending.categoryHint')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
