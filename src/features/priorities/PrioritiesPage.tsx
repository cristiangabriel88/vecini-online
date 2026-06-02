import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ListOrdered, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/shared/components/PageHeader';
import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { Modal } from '@/shared/components/Modal';
import { useAuthStore } from '@/shared/store/authStore';
import { DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { useAsociatieApartments } from '@/features/admin/apartmentsStore';
import { findVoterApartmentId } from '@/features/polls/pollLogic';
import { usePriorityStore, useAsociatiePriorities } from './priorityStore';
import { hydratePriorities, addPriorityProject, saveRanking, fetchPriorityTurnout } from './priorityApi';
import {
  isValidProject,
  sortByRank,
  moveUp,
  moveDown,
  applyReorder,
  canManagePriorities,
} from './priorityLogic';
import type { PriorityProject } from '@/shared/types/domain';

interface SortableItemProps {
  project: PriorityProject;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableItem({ project, index, total, onMoveUp, onMoveDown }: SortableItemProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card flex items-start gap-3 p-4"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab touch-none rounded p-1 text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
        aria-label={t('priorities.drag')}
        tabIndex={0}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {project.rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{project.title}</p>
        {project.description && <p className="text-sm text-muted">{project.description}</p>}
      </div>
      <div className="flex flex-col">
        <Button
          size="sm"
          variant="ghost"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={t('priorities.moveUp')}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label={t('priorities.moveDown')}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function PrioritiesPage() {
  const { t } = useTranslation();
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  const activeRole = useAuthStore((s) => s.activeRole)();
  const voterUserId = useAuthStore((s) => s.profile?.id) ?? DEMO_CURRENT_USER_ID;
  const fetchError = usePriorityStore((s) => s.fetchError);
  const { projects } = useAsociatiePriorities();
  const apartments = useAsociatieApartments();
  const apartmentId = findVoterApartmentId(apartments, voterUserId);
  const canManage = canManagePriorities(activeRole);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [turnout, setTurnout] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (asociatieId) void hydratePriorities(asociatieId);
  }, [asociatieId]);

  useEffect(() => {
    if (asociatieId) {
      void fetchPriorityTurnout(asociatieId).then((n) => {
        if (n !== null) setTurnout(n);
      });
    }
  }, [asociatieId]);

  if (fetchError) {
    return (
      <div>
        <PageHeader title={t('priorities.title')} />
        <ErrorState
          title={t('common.errorTitle')}
          body={t('common.loadError')}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                usePriorityStore.getState().setFetchError(null);
                if (asociatieId) void hydratePriorities(asociatieId);
              }}
            >
              {t('common.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  const ordered = sortByRank(projects);
  const valid = isValidProject(title);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !asociatieId) return;
    const newProjects = applyReorder(projects, String(active.id), String(over.id));
    saveRanking(asociatieId, newProjects, apartmentId);
    toast.success(t('priorities.rankingSaved'));
  }

  function handleMoveUp(id: string) {
    if (!asociatieId) return;
    const newProjects = moveUp(projects, id);
    saveRanking(asociatieId, newProjects, apartmentId);
  }

  function handleMoveDown(id: string) {
    if (!asociatieId) return;
    const newProjects = moveDown(projects, id);
    saveRanking(asociatieId, newProjects, apartmentId);
  }

  function handleAdd() {
    if (!valid || !asociatieId) return;
    const project: PriorityProject = {
      id: `pr-${Date.now()}`,
      asociatie_id: asociatieId,
      title: title.trim(),
      description: description.trim(),
      rank: projects.length + 1,
    };
    addPriorityProject(asociatieId, project);
    toast.success(t('priorities.added'));
    setOpen(false);
    setTitle('');
    setDescription('');
  }

  return (
    <div>
      <PageHeader
        title={t('priorities.title')}
        subtitle={
          turnout !== null
            ? `${t('priorities.subtitle')} ${t('priorities.turnout', { count: turnout })}.`
            : t('priorities.subtitle')
        }
        action={
          canManage ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t('priorities.new')}
            </Button>
          ) : undefined
        }
      />

      {ordered.length === 0 ? (
        <EmptyState body={t('priorities.empty')} icon={<ListOrdered className="h-10 w-10" />} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ordered.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {ordered.map((p, i) => (
                <SortableItem
                  key={p.id}
                  project={p}
                  index={i}
                  total={ordered.length}
                  onMoveUp={() => handleMoveUp(p.id)}
                  onMoveDown={() => handleMoveDown(p.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
            <Button onClick={handleAdd} disabled={!valid}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label={t('priorities.projectTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
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
