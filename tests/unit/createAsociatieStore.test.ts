import { describe, expect, it, beforeEach } from 'vitest';
import { createAsociatieStore } from '@/shared/store/createAsociatieStore';

// Minimal domain type
type Widget = { id: string; label: string; active: boolean };

const DEMO_ID = 'asoc-demo';
const OTHER_ID = 'asoc-other';

const DEMO_WIDGETS: Widget[] = [
  { id: 'w1', label: 'Alpha', active: true },
  { id: 'w2', label: 'Beta', active: false },
];

const EMPTY: Widget[] = Object.freeze([]) as unknown as Widget[];

function seedWidgets() {
  return { [DEMO_ID]: [...DEMO_WIDGETS] };
}

function migrateWidgets(persisted: unknown) {
  const p = persisted as { byAsociatie?: Record<string, Widget[]> } | null;
  return { ...p?.byAsociatie, [DEMO_ID]: [...DEMO_WIDGETS] };
}

function widgetsFor(map: Record<string, Widget[]>, id: string | null): Widget[] {
  if (!id) return EMPTY;
  return map[id] ?? EMPTY;
}

// Plain-list store (no extra actions)
const [usePlainStore] = createAsociatieStore<Widget>({
  storeName: 'test.widgets.plain',
  version: 1,
  seed: seedWidgets,
  migrate: migrateWidgets,
  selector: widgetsFor,
});

// Store with extra per-row action
const [useActionStore] = createAsociatieStore<
  Widget,
  {
    addWidget: (id: string, w: Widget) => void;
    toggleActive: (id: string, wid: string) => void;
  }
>({
  storeName: 'test.widgets.action',
  version: 1,
  seed: seedWidgets,
  migrate: migrateWidgets,
  selector: widgetsFor,
  extraActions: (set) => ({
    addWidget: (asociatieId, w) =>
      set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: [w, ...(s.byAsociatie[asociatieId] ?? [])] } })),
    toggleActive: (asociatieId, wid) =>
      set((s) => ({
        byAsociatie: {
          ...s.byAsociatie,
          [asociatieId]: (s.byAsociatie[asociatieId] ?? []).map((w) =>
            w.id === wid ? { ...w, active: !w.active } : w,
          ),
        },
      })),
  }),
});

describe('createAsociatieStore — plain store', () => {
  beforeEach(() => {
    usePlainStore.setState((s) => ({ byAsociatie: { ...s.byAsociatie, [OTHER_ID]: [] } }));
  });

  it('seeds the demo asociatie', () => {
    expect(usePlainStore.getState().byAsociatie[DEMO_ID]).toEqual(DEMO_WIDGETS);
  });

  it('fetchError starts null', () => {
    expect(usePlainStore.getState().fetchError).toBeNull();
  });

  it('setFetchError sets and clears the error', () => {
    usePlainStore.getState().setFetchError('boom');
    expect(usePlainStore.getState().fetchError).toBe('boom');
    usePlainStore.getState().setFetchError(null);
    expect(usePlainStore.getState().fetchError).toBeNull();
  });

  it('replaceForAsociatie replaces the list for one tenant', () => {
    const fresh: Widget[] = [{ id: 'w9', label: 'New', active: true }];
    usePlainStore.getState().replaceForAsociatie(OTHER_ID, fresh);
    expect(usePlainStore.getState().byAsociatie[OTHER_ID]).toEqual(fresh);
    expect(usePlainStore.getState().byAsociatie[DEMO_ID]).toEqual(DEMO_WIDGETS);
  });

  it('returns a stable empty reference for unknown / null asociatie', () => {
    const a = widgetsFor(usePlainStore.getState().byAsociatie, 'unknown');
    const b = widgetsFor(usePlainStore.getState().byAsociatie, null);
    expect(a).toBe(EMPTY);
    expect(b).toBe(EMPTY);
  });
});

describe('createAsociatieStore — store with extra actions', () => {
  beforeEach(() => {
    useActionStore.setState((s) => ({ byAsociatie: { ...s.byAsociatie, [OTHER_ID]: [] } }));
  });

  it('addWidget prepends to the list', () => {
    const w: Widget = { id: 'w3', label: 'Gamma', active: true };
    useActionStore.getState().addWidget(OTHER_ID, w);
    const list = useActionStore.getState().byAsociatie[OTHER_ID];
    expect(list?.[0]).toEqual(w);
    expect(list).toHaveLength(1);
  });

  it('toggleActive flips the active flag', () => {
    const w: Widget = { id: 'w4', label: 'Delta', active: false };
    useActionStore.getState().addWidget(OTHER_ID, w);
    useActionStore.getState().toggleActive(OTHER_ID, 'w4');
    const list = useActionStore.getState().byAsociatie[OTHER_ID];
    expect(list?.find((x) => x.id === 'w4')?.active).toBe(true);
  });

  it('extra actions do not touch other tenants', () => {
    const demoBefore = useActionStore.getState().byAsociatie[DEMO_ID];
    useActionStore.getState().addWidget(OTHER_ID, { id: 'w5', label: 'E', active: true });
    expect(useActionStore.getState().byAsociatie[DEMO_ID]).toBe(demoBefore);
  });

  it('replaceForAsociatie is still available alongside extra actions', () => {
    const fresh: Widget[] = [{ id: 'w6', label: 'Fresh', active: true }];
    useActionStore.getState().replaceForAsociatie(OTHER_ID, fresh);
    expect(useActionStore.getState().byAsociatie[OTHER_ID]).toEqual(fresh);
  });
});
