import type { AccessCode } from '@/shared/types/domain';
import { createAsociatieStore } from '@/shared/store/createAsociatieStore';
import {
  seedAccessCodes,
  accessForAsociatie,
  addAccessCodeIn,
  migrateAccessState,
} from './accessLogic';

const [useAccessStore, useAsociatieAccessCodes] = createAsociatieStore<
  AccessCode,
  {
    addCode: (asociatieId: string, code: AccessCode) => void;
  }
>({
  storeName: 'vecini.access',
  version: 1,
  seed: seedAccessCodes,
  migrate: migrateAccessState,
  selector: accessForAsociatie,
  extraActions: (set) => ({
    addCode: (asociatieId, code) =>
      set((s) => ({ byAsociatie: addAccessCodeIn(s.byAsociatie, asociatieId, code) })),
  }),
});

export { useAccessStore, useAsociatieAccessCodes };
