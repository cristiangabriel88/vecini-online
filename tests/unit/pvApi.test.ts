import { beforeEach, describe, expect, it } from 'vitest';
import { usePvStore } from '@/features/pv/pvStore';
import { hydratePvDocuments, addPvDocument } from '@/features/pv/pvApi';
import { seedPvs, pvForAsociatie } from '@/features/pv/pvLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';

// pvApi offline-path tests (T191).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydratePvDocuments: no-op when not configured / empty id (store untouched)
//   - addPvDocument: applies synchronously to the store, offline-safe, returns the doc

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  usePvStore.setState({ byAsociatie: seedPvs(), fetchError: null });
});

describe('hydratePvDocuments', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = usePvStore.getState().byAsociatie;
    await hydratePvDocuments(ASOC);
    expect(usePvStore.getState().byAsociatie).toBe(before);
    expect(usePvStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = usePvStore.getState().byAsociatie;
    await hydratePvDocuments('');
    expect(usePvStore.getState().byAsociatie).toBe(before);
  });
});

describe('addPvDocument', () => {
  it('prepends a new document to the store synchronously', () => {
    const before = pvForAsociatie(usePvStore.getState().byAsociatie, ASOC).length;
    const doc = addPvDocument(ASOC, {
      title: 'Test PV',
      doc_date: '2026-06-02',
      category: 'AGA',
      content_text: 'detalii test',
    });
    const after = pvForAsociatie(usePvStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(doc.id);
    expect(after[0].title).toBe('Test PV');
  });

  it('is idempotent in the store (offline — no double-insert)', () => {
    addPvDocument(ASOC, { title: 'A', doc_date: '2026-06-02', category: 'Comitet', content_text: '' });
    addPvDocument(ASOC, { title: 'B', doc_date: '2026-06-01', category: 'Comitet', content_text: '' });
    const list = pvForAsociatie(usePvStore.getState().byAsociatie, ASOC);
    const titles = list.map((d) => d.title);
    expect(titles.filter((t) => t === 'A')).toHaveLength(1);
    expect(titles.filter((t) => t === 'B')).toHaveLength(1);
  });

  it('defaults empty category to Altele', () => {
    const doc = addPvDocument(ASOC, { title: 'X', doc_date: '2026-06-02', category: '', content_text: '' });
    expect(doc.category).toBe('Altele');
  });
});
