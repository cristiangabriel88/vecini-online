import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Images, Plus, Camera } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Modal } from '@/shared/components/Modal';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatDateLong } from '@/shared/lib/format';
import { useProjectsStore } from '@/features/projects/projectsStore';
import { usePhotoJournalStore } from './photoJournalStore';
import { filterByProject, groupByDate, isValidPhoto } from './photoJournalLogic';

const today = () => new Date().toISOString().slice(0, 10);

export default function PhotoJournalPage() {
  const { t } = useTranslation();
  const { projects } = useProjectsStore();
  const { photos, addPhoto } = usePhotoJournalStore();

  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [date, setDate] = useState(today());
  const [caption, setCaption] = useState('');
  const [phase, setPhase] = useState('');

  const valid = isValidPhoto(caption, date) && projectId !== '';
  const groups = groupByDate(filterByProject(photos, filter));

  const submit = () => {
    if (!valid) return;
    const project = projects.find((p) => p.id === projectId);
    addPhoto(projectId, project?.title ?? '', date, caption.trim(), phase.trim());
    toast.success(t('photoJournal.added'));
    setCaption('');
    setPhase('');
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title={t('photoJournal.title')}
        subtitle={t('photoJournal.subtitle')}
        action={
          <Button onClick={() => setOpen(true)} disabled={projects.length === 0}>
            <Plus className="h-4 w-4" /> {t('photoJournal.add')}
          </Button>
        }
      />

      {projects.length > 0 && (
        <div className="mb-4 max-w-xs">
          <Select
            aria-label={t('photoJournal.filterByProject')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">{t('photoJournal.allProjects')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState body={t('photoJournal.empty')} icon={<Images className="h-10 w-10" />} />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.date}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                {formatDateLong(g.date)}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {g.photos.map((photo) => (
                  <div key={photo.id} className="card overflow-hidden">
                    <div
                      className={`flex h-32 items-center justify-center bg-gradient-to-br ${photo.swatch}`}
                    >
                      <Camera className="h-8 w-8 text-white/80" />
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{photo.project_title}</Badge>
                        {photo.phase && <Badge tone="primary">{photo.phase}</Badge>}
                      </div>
                      <p className="mt-2 text-sm">{photo.caption}</p>
                      <p className="mt-2 text-xs text-muted">{photo.author_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('photoJournal.add')}
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
          <p className="text-sm text-muted">{t('photoJournal.demoNote')}</p>
          <Select
            label={t('photoJournal.project')}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
          <Input label={t('photoJournal.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input
            label={t('photoJournal.caption')}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t('photoJournal.captionHint')}
          />
          <Input
            label={t('photoJournal.phase')}
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            placeholder={t('photoJournal.phaseHint')}
          />
        </div>
      </Modal>
    </div>
  );
}
