import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { UserSearch, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { formatDateTime } from '@/shared/lib/format';
import { useVisitorsStore } from './visitorsStore';
import { isValidReport, recentReports } from './visitorLogic';
import type { VisitorStatus } from '@/shared/types/domain';

const STATUS_TONE: Record<VisitorStatus, 'danger' | 'warning' | 'success'> = {
  nou: 'danger',
  cunoscut: 'warning',
  rezolvat: 'success',
};

export default function VisitorsPage() {
  const { t } = useTranslation();
  const { reports, add, cycleStatus } = useVisitorsStore();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  const ordered = recentReports(reports);
  const valid = isValidReport(note);

  const submit = () => {
    if (!valid) return;
    add(note);
    toast.success(t('visitors.added'));
    setOpen(false);
    setNote('');
  };

  return (
    <div>
      <PageHeader
        title={t('visitors.title')}
        subtitle={t('visitors.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('visitors.new')}
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('visitors.empty')} icon={<UserSearch className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((r) => (
            <Card key={r.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{r.note}</p>
                <Badge tone={STATUS_TONE[r.status]}>{t(`visitors.status_${r.status}`)}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  {r.reporter_name} · {formatDateTime(r.created_at)}
                </p>
                <Button size="sm" variant="ghost" onClick={() => cycleStatus(r.id)}>
                  {t('visitors.changeStatus')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('visitors.new')}
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
        <Textarea
          label={t('visitors.note')}
          placeholder={t('visitors.noteHint')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </div>
  );
}
