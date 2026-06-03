import { beforeEach, describe, expect, it } from 'vitest';
import { usePhotoJournalStore } from '@/features/photojournal/photoJournalStore';
import { hydratePhotos, addPhotoLive } from '@/features/photojournal/photoJournalApi';
import { photosForAsociatie, seedPhotos } from '@/features/photojournal/photoJournalLogic';
import { DEMO_ASOCIATIE, DEMO_PROJECT_PHOTOS } from '@/shared/demo/demoData';

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  usePhotoJournalStore.setState({ byAsociatie: seedPhotos(), fetchError: null });
});

describe('hydratePhotos', () => {
  it('is a no-op when Supabase is not configured', async () => {
    const before = usePhotoJournalStore.getState().byAsociatie;
    await hydratePhotos(ASOC);
    expect(usePhotoJournalStore.getState().byAsociatie).toBe(before);
    expect(usePhotoJournalStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = usePhotoJournalStore.getState().byAsociatie;
    await hydratePhotos('');
    expect(usePhotoJournalStore.getState().byAsociatie).toBe(before);
  });
});

describe('addPhotoLive', () => {
  it('appends the photo synchronously', () => {
    const before = photosForAsociatie(usePhotoJournalStore.getState().byAsociatie, ASOC).length;
    addPhotoLive(ASOC, {
      id: 'pp-test',
      asociatie_id: ASOC,
      project_id: 'pr-1',
      project_title: 'Reabilitare termică',
      date: '2026-06-01',
      caption: 'Montaj panouri',
      phase: 'Faza 2',
      swatch: 'from-sky-400 to-indigo-500',
      author_name: 'Popescu Andrei',
      created_at: new Date().toISOString(),
    });
    const after = photosForAsociatie(usePhotoJournalStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after.some((p) => p.id === 'pp-test')).toBe(true);
  });

  it('preserves demo photos after adding one', () => {
    addPhotoLive(ASOC, {
      id: 'pp-test2',
      asociatie_id: ASOC,
      project_id: 'pr-1',
      project_title: '',
      date: '2026-06-01',
      caption: 'Test foto',
      phase: '',
      swatch: 'from-amber-400 to-orange-500',
      author_name: '',
      created_at: new Date().toISOString(),
    });
    const after = photosForAsociatie(usePhotoJournalStore.getState().byAsociatie, ASOC);
    const demoIds = DEMO_PROJECT_PHOTOS.map((p) => p.id);
    expect(after.filter((p) => demoIds.includes(p.id))).toHaveLength(DEMO_PROJECT_PHOTOS.length);
  });
});
