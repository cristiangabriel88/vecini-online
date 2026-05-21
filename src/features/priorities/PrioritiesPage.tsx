import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ListOrdered, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { usePriorityStore } from './priorityStore';
import { isValidProject, sortByRank } from './priorityLogic';

export default function PrioritiesPage() {
  const { t } = useTranslation();
  const { projects, add, moveUp, moveDown } = usePriorityStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const ordered = sortByRank(projects);
  const valid = isValidProject(title);

  const submit = () => {
    if (!valid) return;
    add(title, description);
    toast.success(t('priorities.added'));
    setOpen(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div>
      <PageHeader
        title={t('priorities.title')}
        subtitle={t('priorities.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('priorities.new')}
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('priorities.empty')} icon={<ListOrdered className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((p, i) => (
            <Card key={p.id} className="flex items-start gap-3 p-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {p.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.title}</p>
                {p.description && <p className="text-sm text-muted">{p.description}</p>}
              </div>
              <div className="flex flex-col">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveUp(p.id)}
                  disabled={i === 0}
                  aria-label={t('priorities.moveUp')}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveDown(p.id)}
                  disabled={i === ordered.length - 1}
                  aria-label={t('priorities.moveDown')}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('priorities.new')}
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
          <Input label={t('priorities.projectTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            label={t('priorities.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
