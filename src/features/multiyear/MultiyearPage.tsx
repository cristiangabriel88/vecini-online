import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CalendarRange, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatLei } from '@/shared/lib/format';
import { useMultiyearStore } from './multiyearStore';
import { groupByYear, isValidPlanItem, totalEstimated } from './multiyearLogic';

export default function MultiyearPage() {
  const { t } = useTranslation();
  const { items, add } = useMultiyearStore();

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear() + 1));
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  const yearNum = Number(year);
  const valid = isValidPlanItem(yearNum, title);
  const groups = groupByYear(items);

  const submit = () => {
    if (!valid) return;
    const costNum = Math.max(0, Number(cost.replace(',', '.')) || 0);
    add({ year: yearNum, title, estimated_cost: costNum, notes });
    toast.success(t('multiyear.added'));
    setOpen(false);
    setTitle('');
    setCost('');
    setNotes('');
  };

  return (
    <div>
      <PageHeader
        title={t('multiyear.title')}
        subtitle={t('multiyear.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('multiyear.new')}
          </Button>
        }
      />

      {items.length > 0 && (
        <Card className="mb-4 space-y-1 p-4">
          <p className="text-sm text-muted">{t('multiyear.totalLabel')}</p>
          <p className="text-2xl font-semibold">{formatLei(totalEstimated(items))}</p>
        </Card>
      )}

      {groups.length === 0 ? (
        <EmptyState body={t('multiyear.empty')} icon={<CalendarRange className="h-10 w-10" />} />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.year} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted">{g.year}</h2>
              {g.items.map((i) => (
                <Card key={i.id} className="space-y-1 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{i.title}</p>
                    {i.estimated_cost > 0 && (
                      <span className="shrink-0 text-sm font-medium text-muted">
                        {formatLei(i.estimated_cost)}
                      </span>
                    )}
                  </div>
                  {i.notes && <p className="text-sm text-muted">{i.notes}</p>}
                </Card>
              ))}
            </section>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('multiyear.new')}
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
            label={t('multiyear.year')}
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-32"
          />
          <Input label={t('multiyear.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label={t('multiyear.cost')}
            hint={t('multiyear.costHint')}
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
          <Textarea label={t('multiyear.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
