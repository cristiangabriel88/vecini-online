import { create } from 'zustand';
import type { ProjectPhoto } from '@/shared/types/domain';
import { DEMO_PROJECT_PHOTOS } from '@/shared/demo/demoData';
import { swatchForIndex } from './photoJournalLogic';

/** Demo identity of the signed-in resident (the journal author). */
export const DEMO_USER = { id: 'u-res', name: 'Popescu Andrei' };

interface PhotoJournalState {
  photos: ProjectPhoto[];
  addPhoto: (
    projectId: string,
    projectTitle: string,
    date: string,
    caption: string,
    phase: string,
  ) => void;
}

export const usePhotoJournalStore = create<PhotoJournalState>((set) => ({
  photos: [...DEMO_PROJECT_PHOTOS],
  addPhoto: (projectId, projectTitle, date, caption, phase) =>
    set((s) => ({
      photos: [
        ...s.photos,
        {
          id: `pp-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          project_id: projectId,
          project_title: projectTitle,
          date,
          caption,
          phase,
          swatch: swatchForIndex(s.photos.length),
          author_name: DEMO_USER.name,
          created_at: new Date().toISOString(),
        },
      ],
    })),
}));
