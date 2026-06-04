import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { KanbanSquare, Plus, HardHat, Wallet } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Modal } from '@/shared/components/Modal';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { formatLei } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/store/authStore';
import { useProjectsStore, useAsociatieProjects } from './projectsStore';
import { hydrateProjects, addProjectLive, setProjectStatusLive } from './projectsApi';
import {
  PROJECT_STATUSES,
  budgetRemaining,
  budgetUsedPercent,
  isValidProject,
  percentComplete,
  sortProjects,
  statusTone,
} from './projectsLogic';
import type { Project, ProjectPhaseStatus, ProjectStatus } from '@/shared/types/domain';

const PHASE_TONE: Record<ProjectPhaseStatus, 'success' | 'primary' | 'neutral'> = {
  finalizat: 'success',
  in_curs: 'primary',
  asteptare: 'neutral',
};

function ProjectCreateModal({
  open,
  onClose,
  asociatieId,
}: {
  open: boolean;
  onClose: () => void;
  asociatieId: string;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contractor, setContractor] = useState('');
  const [budget, setBudget] = useState('');

  const budgetNum = Number(budget);
  const valid = isValidProject(title, budgetNum);

  const submit = () => {
    if (!valid) return;
    const project: Project = {
      id: `pr-${Date.now()}`,
      asociatie_id: asociatieId,
      title: title.trim(),
      description: description.trim(),
      contractor: contractor.trim(),
      status: 'planificat',
      budget_allocated: budgetNum,
      budget_spent: 0,
      phases: [],
      created_at: new Date().toISOString(),
    };
    addProjectLive(asociatieId, project);
    toast.success(t('projects.added'));
    setTitle('');
    setDescription('');
    setContractor('');
    setBudget('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('projects.add')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!valid}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label={t('projects.titleLabel')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('projects.titleHint')}
        />
        <Textarea
          label={t('projects.descriptionLabel')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label={t('projects.contractorLabel')}
          value={contractor}
          onChange={(e) => setContractor(e.target.value)}
        />
        <Input
          label={t('projects.budgetLabel')}
          type="number"
          min={0}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
      </div>
    </Modal>
  );
}

const ProjectCard = memo(function ProjectCard({
  p,
  asociatieId,
}: {
  p: Project;
  asociatieId: string | null;
}) {
  const { t } = useTranslation();
  const pct = percentComplete(p);
  const used = budgetUsedPercent(p);
  const remaining = budgetRemaining(p);
  const overBudget = remaining < 0;

  const statusLabel = (s: ProjectStatus) => t(`projects.status.${s}`);
  const phaseLabel = (s: ProjectPhaseStatus) => t(`projects.phaseStatus.${s}`);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{p.title}</h3>
            <Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge>
          </div>
          {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
          {p.contractor && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
              <HardHat className="h-3.5 w-3.5" /> {p.contractor}
            </p>
          )}
        </div>
        <div className="w-40 shrink-0">
          <Select
            aria-label={t('projects.changeStatus')}
            value={p.status}
            onChange={(e) => {
              if (asociatieId) setProjectStatusLive(asociatieId, p.id, e.target.value as ProjectStatus);
            }}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">{t('projects.progress')}</span>
          <span className="font-medium">{t('projects.percentComplete', { pct })}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1 text-muted">
            <Wallet className="h-3.5 w-3.5" /> {t('projects.budget')}
          </span>
          <span className="font-medium">
            {formatLei(p.budget_spent)} / {formatLei(p.budget_allocated)}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full transition-all ${overBudget ? 'bg-danger' : 'bg-success'}`}
            style={{ width: `${used}%` }}
          />
        </div>
        <p className={`mt-1 text-xs ${overBudget ? 'text-danger' : 'text-muted'}`}>
          {overBudget
            ? t('projects.overBudget', { amount: formatLei(Math.abs(remaining)) })
            : t('projects.remaining', { amount: formatLei(remaining) })}
        </p>
      </div>

      {p.phases.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {t('projects.phases')}
          </p>
          <ul className="space-y-2">
            {p.phases.map((ph) => (
              <li key={ph.id} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm">
                  <Badge tone={PHASE_TONE[ph.status]}>{phaseLabel(ph.status)}</Badge>
                  {ph.name}
                </span>
                {ph.status !== 'finalizat' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (asociatieId)
                        useProjectsStore.getState().advancePhase(asociatieId, p.id, ph.id);
                    }}
                  >
                    {ph.status === 'asteptare' ? t('projects.start') : t('projects.finish')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
});

export default function ProjectsPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const fetchError = useProjectsStore((s) => s.fetchError);
  const projects = useAsociatieProjects();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (asociatieId) void hydrateProjects(asociatieId);
  }, [asociatieId]);

  const ordered = sortProjects(projects);

  if (fetchError) {
    return (
      <ErrorState
        body={t('common.loadError')}
        action={
          <Button onClick={() => asociatieId && void hydrateProjects(asociatieId)}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={t('projects.title')}
        subtitle={t('projects.subtitle')}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t('projects.add')}
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('projects.empty')} icon={<KanbanSquare className="h-10 w-10" />} />
      ) : (
        <div className="space-y-3">
          {ordered.map((p) => (
            <ProjectCard key={p.id} p={p} asociatieId={asociatieId} />
          ))}
        </div>
      )}

      <ProjectCreateModal
        open={open}
        onClose={() => setOpen(false)}
        asociatieId={asociatieId ?? ''}
      />
    </div>
  );
}
