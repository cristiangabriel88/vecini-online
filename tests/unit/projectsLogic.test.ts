import { describe, expect, it } from 'vitest';
import {
  PROJECT_STATUSES,
  budgetRemaining,
  budgetUsedPercent,
  currentPhase,
  isValidProject,
  nextPhaseStatus,
  percentComplete,
  sortProjects,
  statusTone,
} from '@/features/projects/projectsLogic';
import type { Project, ProjectPhase } from '@/shared/types/domain';

const phase = (id: string, status: ProjectPhase['status']): ProjectPhase => ({
  id,
  name: `Faza ${id}`,
  status,
});

const project = (over: Partial<Project> = {}): Project => ({
  id: 'p1',
  asociatie_id: 'a',
  title: 'Anvelopare',
  description: '',
  contractor: '',
  status: 'in_curs',
  budget_allocated: 1000,
  budget_spent: 250,
  phases: [],
  created_at: '2026-05-01T00:00:00Z',
  ...over,
});

describe('constants', () => {
  it('lists all four statuses', () => {
    expect(PROJECT_STATUSES).toEqual(['planificat', 'in_curs', 'finalizat', 'suspendat']);
  });
});

describe('isValidProject', () => {
  it('requires a 3+ char title and a non-negative budget', () => {
    expect(isValidProject('Lift', 5000)).toBe(true);
    expect(isValidProject('Lift', 0)).toBe(true);
    expect(isValidProject('ab', 5000)).toBe(false);
    expect(isValidProject('Lift', -1)).toBe(false);
    expect(isValidProject('Lift', NaN)).toBe(false);
  });
});

describe('nextPhaseStatus', () => {
  it('cycles waiting → in progress → finished → waiting', () => {
    expect(nextPhaseStatus('asteptare')).toBe('in_curs');
    expect(nextPhaseStatus('in_curs')).toBe('finalizat');
    expect(nextPhaseStatus('finalizat')).toBe('asteptare');
  });
});

describe('percentComplete', () => {
  it('is the share of finished phases, rounded', () => {
    expect(percentComplete(project({ phases: [phase('a', 'finalizat'), phase('b', 'in_curs'), phase('c', 'asteptare')] }))).toBe(33);
    expect(percentComplete(project({ phases: [phase('a', 'finalizat'), phase('b', 'finalizat')] }))).toBe(100);
  });

  it('falls back to status when there are no phases', () => {
    expect(percentComplete(project({ phases: [], status: 'finalizat' }))).toBe(100);
    expect(percentComplete(project({ phases: [], status: 'planificat' }))).toBe(0);
  });
});

describe('budget helpers', () => {
  it('budgetRemaining is allocated minus spent, even when negative', () => {
    expect(budgetRemaining(project({ budget_allocated: 1000, budget_spent: 250 }))).toBe(750);
    expect(budgetRemaining(project({ budget_allocated: 1000, budget_spent: 1200 }))).toBe(-200);
  });

  it('budgetUsedPercent clamps to 0–100 and handles zero allocation', () => {
    expect(budgetUsedPercent(project({ budget_allocated: 1000, budget_spent: 250 }))).toBe(25);
    expect(budgetUsedPercent(project({ budget_allocated: 1000, budget_spent: 1200 }))).toBe(100);
    expect(budgetUsedPercent(project({ budget_allocated: 0, budget_spent: 100 }))).toBe(0);
  });
});

describe('currentPhase', () => {
  it('returns the first unfinished phase, or null when all done', () => {
    expect(currentPhase(project({ phases: [phase('a', 'finalizat'), phase('b', 'in_curs')] }))?.id).toBe('b');
    expect(currentPhase(project({ phases: [phase('a', 'finalizat')] }))).toBeNull();
    expect(currentPhase(project({ phases: [] }))).toBeNull();
  });
});

describe('statusTone', () => {
  it('maps each status to a tone', () => {
    expect(statusTone('in_curs')).toBe('primary');
    expect(statusTone('finalizat')).toBe('success');
    expect(statusTone('suspendat')).toBe('warning');
    expect(statusTone('planificat')).toBe('neutral');
  });
});

describe('sortProjects', () => {
  it('orders active, planned, suspended, finished; newest first within a group', () => {
    const projects = [
      project({ id: 'fin', status: 'finalizat', created_at: '2026-01-01T00:00:00Z' }),
      project({ id: 'act-old', status: 'in_curs', created_at: '2026-02-01T00:00:00Z' }),
      project({ id: 'act-new', status: 'in_curs', created_at: '2026-03-01T00:00:00Z' }),
      project({ id: 'plan', status: 'planificat', created_at: '2026-04-01T00:00:00Z' }),
      project({ id: 'susp', status: 'suspendat', created_at: '2026-04-01T00:00:00Z' }),
    ];
    expect(sortProjects(projects).map((p) => p.id)).toEqual(['act-new', 'act-old', 'plan', 'susp', 'fin']);
  });
});
