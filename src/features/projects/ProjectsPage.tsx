import { useState } from 'react';
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
import { formatLei } from '@/shared/lib/format';
import { useProjectsStore } from './projectsStore';
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

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { projects, addProject, setStatus, advancePhase } = useProjectsStore();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contractor, setContractor] = useState('');
  const [budget, setBudget] = useState('');

  const budgetNum = Number(budget);
  const valid = isValidProject(title, budgetNum);
  const ordered = sortProjects(projects);

  const submit = () => {
    if (!valid) return;
    addProject(title.trim(), description.trim(), contractor.trim(), budgetNum);
    toast.success(t('projects.added'));
    setTitle('');
    setDescription('');
    setContractor('');
    setBudget('');
    setOpen(false);
  };

  const statusLabel = (s: ProjectStatus) => t(`projects.status.${s}`);
  const phaseLabel = (s: ProjectPhaseStatus) => t(`projects.phaseStatus.${s}`);

  const renderProject = (p: Project) => {
    const pct = percentComplete(p);
    const used = budgetUsedPercent(p);
    const remaining = budgetRemaining(p);
    const overBudget = remaining < 0;
    return (
      <Card key={p.id} className="p-4">
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
              onChange={(e) => setStatus(p.id, e.target.value as ProjectStatus)}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{t('projects.progress')}</span>
            <span className="font-medium">{t('projects.percentComplete', { pct })}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Budget */}
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

        {/* Phases */}
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
                    <Button size="sm" variant="ghost" onClick={() => advancePhase(p.id, ph.id)}>
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
  };

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
        <div className="space-y-3">{ordered.map(renderProject)}</div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('projects.add')}
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
    </div>
  );
}
