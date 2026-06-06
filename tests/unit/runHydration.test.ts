import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock isSupabaseConfigured to true so we can exercise the live-path logic.
// The "not configured" guard is verified implicitly by every existing *Api.test.ts
// that checks hydrateXxx is a no-op when Supabase is absent.
vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}));

// Suppress error sink noise in test output
vi.mock('@/shared/lib/errorReporting', () => ({
  reportError: vi.fn(),
}));

import { runHydration } from '@/shared/lib/runHydration';
import { reportError } from '@/shared/lib/errorReporting';

interface TestRow {
  id: string;
  value: string;
}

interface TestItem {
  id: string;
  uppercased: string;
}

function transform(row: TestRow): TestItem {
  return { id: row.id, uppercased: row.value.toUpperCase() };
}

function makeStore() {
  return {
    replaceForAsociatie: vi.fn(),
    setFetchError: vi.fn(),
  };
}

const ASOC = 'asoc-test';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('guard: empty asociatieId', () => {
  it('does not call query when id is empty', async () => {
    const query = vi.fn().mockResolvedValue({ data: [], error: null });
    const store = makeStore();
    await runHydration<TestRow, TestItem>('', { query, transform, store, source: 'test' });
    expect(query).not.toHaveBeenCalled();
    expect(store.replaceForAsociatie).not.toHaveBeenCalled();
    expect(store.setFetchError).not.toHaveBeenCalled();
  });
});

describe('success path', () => {
  it('maps rows and calls replaceForAsociatie with transformed items', async () => {
    const rows: TestRow[] = [
      { id: 'r1', value: 'hello' },
      { id: 'r2', value: 'world' },
    ];
    const query = vi.fn().mockResolvedValue({ data: rows, error: null });
    const store = makeStore();
    await runHydration<TestRow, TestItem>(ASOC, { query, transform, store, source: 'test' });
    expect(query).toHaveBeenCalledOnce();
    expect(store.setFetchError).toHaveBeenCalledWith(null);
    expect(store.replaceForAsociatie).toHaveBeenCalledWith(ASOC, [
      { id: 'r1', uppercased: 'HELLO' },
      { id: 'r2', uppercased: 'WORLD' },
    ]);
  });

  it('calls replaceForAsociatie with an empty array when data is []', async () => {
    const query = vi.fn().mockResolvedValue({ data: [], error: null });
    const store = makeStore();
    await runHydration<TestRow, TestItem>(ASOC, { query, transform, store, source: 'test' });
    expect(store.setFetchError).toHaveBeenCalledWith(null);
    expect(store.replaceForAsociatie).toHaveBeenCalledWith(ASOC, []);
  });

  it('passes the asociatieId through to replaceForAsociatie', async () => {
    const query = vi.fn().mockResolvedValue({ data: [{ id: 'r1', value: 'x' }], error: null });
    const store = makeStore();
    await runHydration<TestRow, TestItem>('custom-asoc', { query, transform, store, source: 'test' });
    expect(store.replaceForAsociatie).toHaveBeenCalledWith('custom-asoc', expect.any(Array));
  });
});

describe('error path: query returns error object', () => {
  it('calls setFetchError("load") and does not replace store', async () => {
    const dbError = { message: 'relation not found', code: '42P01' };
    const query = vi.fn().mockResolvedValue({ data: null, error: dbError });
    const store = makeStore();
    await runHydration<TestRow, TestItem>(ASOC, { query, transform, store, source: 'test.hydrate' });
    expect(store.setFetchError).toHaveBeenCalledWith('load');
    expect(store.replaceForAsociatie).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledWith(dbError, { source: 'test.hydrate' });
  });

  it('reports a synthetic error when data is null and error is null', async () => {
    const query = vi.fn().mockResolvedValue({ data: null, error: null });
    const store = makeStore();
    await runHydration<TestRow, TestItem>(ASOC, { query, transform, store, source: 'test.hydrate' });
    expect(store.setFetchError).toHaveBeenCalledWith('load');
    expect(store.replaceForAsociatie).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), { source: 'test.hydrate' });
  });
});

describe('exception path: query throws', () => {
  it('calls setFetchError("load") and reports the thrown error', async () => {
    const thrown = new Error('network timeout');
    const query = vi.fn().mockRejectedValue(thrown);
    const store = makeStore();
    await runHydration<TestRow, TestItem>(ASOC, { query, transform, store, source: 'test.hydrate' });
    expect(store.setFetchError).toHaveBeenCalledWith('load');
    expect(store.replaceForAsociatie).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledWith(thrown, { source: 'test.hydrate' });
  });
});
