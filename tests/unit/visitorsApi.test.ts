import { beforeEach, describe, expect, it } from 'vitest';
import { useVisitorsStore } from '@/features/visitors/visitorsStore';
import { hydrateVisitors, addVisitorReportLive, cycleVisitorStatusLive } from '@/features/visitors/visitorsApi';
import { seedVisitors, visitorsForAsociatie } from '@/features/visitors/visitorLogic';
import { DEMO_ASOCIATIE, DEMO_VISITOR_REPORTS } from '@/shared/demo/demoData';
import type { VisitorReport } from '@/shared/types/domain';

// visitorsApi offline-path tests (T218).

const ASOC = DEMO_ASOCIATIE.id;

function makeReport(overrides?: Partial<VisitorReport>): VisitorReport {
  return {
    id: `vr-t-${Date.now()}`,
    asociatie_id: ASOC,
    reporter_user_id: 'u-test',
    reporter_name: 'Test User',
    note: 'Nota de test pentru vizitator suspect',
    photo_path: null,
    status: 'nou',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  useVisitorsStore.setState({ byAsociatie: seedVisitors(), fetchError: null });
});

describe('hydrateVisitors', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useVisitorsStore.getState().byAsociatie;
    await hydrateVisitors(ASOC);
    expect(useVisitorsStore.getState().byAsociatie).toBe(before);
    expect(useVisitorsStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useVisitorsStore.getState().byAsociatie;
    await hydrateVisitors('');
    expect(useVisitorsStore.getState().byAsociatie).toBe(before);
  });
});

describe('addVisitorReportLive', () => {
  it('prepends the report synchronously', () => {
    const before = visitorsForAsociatie(useVisitorsStore.getState().byAsociatie, ASOC).length;
    const report = makeReport();
    addVisitorReportLive(ASOC, report);
    const after = visitorsForAsociatie(useVisitorsStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(report.id);
  });
});

describe('cycleVisitorStatusLive', () => {
  it('advances status from "nou" to "cunoscut" synchronously', () => {
    const id = DEMO_VISITOR_REPORTS.find((r) => r.status === 'nou')?.id ?? DEMO_VISITOR_REPORTS[0].id;
    cycleVisitorStatusLive(ASOC, id, 'cunoscut');
    const after = visitorsForAsociatie(useVisitorsStore.getState().byAsociatie, ASOC);
    expect(after.find((r) => r.id === id)?.status).toBe('cunoscut');
  });
});
