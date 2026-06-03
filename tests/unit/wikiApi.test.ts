import { beforeEach, describe, expect, it } from 'vitest';
import { useWikiStore } from '@/features/wiki/wikiStore';
import { hydrateWiki, addWikiPageLive, updateWikiPageLive } from '@/features/wiki/wikiApi';
import { wikiForAsociatie, seedWiki } from '@/features/wiki/wikiLogic';
import { DEMO_ASOCIATIE, DEMO_WIKI } from '@/shared/demo/demoData';
import type { WikiPage } from '@/shared/types/domain';

// wikiApi offline-path tests (T216).
// Key contracts:
//   - hydrateWiki: no-op when not configured / empty id
//   - addWikiPageLive: prepends synchronously, offline-safe
//   - updateWikiPageLive: updates title+body synchronously, offline-safe

const ASOC = DEMO_ASOCIATIE.id;

function makePage(overrides?: Partial<WikiPage>): WikiPage {
  return {
    id: `wk-test-${Date.now()}`,
    asociatie_id: ASOC,
    slug: 'test-page',
    title: 'Test Page',
    body_md: 'Continut de test.',
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  useWikiStore.setState({ byAsociatie: seedWiki(), fetchError: null });
});

describe('hydrateWiki', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useWikiStore.getState().byAsociatie;
    await hydrateWiki(ASOC);
    expect(useWikiStore.getState().byAsociatie).toBe(before);
    expect(useWikiStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useWikiStore.getState().byAsociatie;
    await hydrateWiki('');
    expect(useWikiStore.getState().byAsociatie).toBe(before);
  });
});

describe('addWikiPageLive', () => {
  it('prepends the page synchronously to the store', () => {
    const before = wikiForAsociatie(useWikiStore.getState().byAsociatie, ASOC).length;
    const page = makePage();
    addWikiPageLive(ASOC, page);
    const after = wikiForAsociatie(useWikiStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(page.id);
  });

  it('preserves the demo wiki pages after adding a new one', () => {
    addWikiPageLive(ASOC, makePage());
    const after = wikiForAsociatie(useWikiStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_WIKI.map((p) => p.id);
    expect(after.filter((p) => demoIds.includes(p.id))).toHaveLength(DEMO_WIKI.length);
  });
});

describe('updateWikiPageLive', () => {
  it('updates the page title and body synchronously', () => {
    const page = makePage();
    addWikiPageLive(ASOC, page);
    updateWikiPageLive(ASOC, page.id, 'Updated Title', 'Updated body.');
    const after = wikiForAsociatie(useWikiStore.getState().byAsociatie, ASOC);
    const updated = after.find((p) => p.id === page.id);
    expect(updated?.title).toBe('Updated Title');
    expect(updated?.body_md).toBe('Updated body.');
  });
});
