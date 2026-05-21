import { create } from 'zustand';
import type { AccessCode } from '@/shared/types/domain';
import { DEMO_ACCESS_CODES } from '@/shared/demo/demoData';
import { expiryFrom, generateCode } from './accessLogic';

const CURRENT_USER_ID = 'u-res';

interface AccessState {
  codes: AccessCode[];
  currentUserId: string;
  /** Generate a fresh 30-minute code and return it. */
  generate: () => AccessCode;
}

export const useAccessStore = create<AccessState>((set) => ({
  codes: [...DEMO_ACCESS_CODES],
  currentUserId: CURRENT_USER_ID,
  generate: () => {
    const now = new Date().toISOString();
    const code: AccessCode = {
      id: `ac-${Date.now()}`,
      asociatie_id: 'demo-asoc',
      generated_by: CURRENT_USER_ID,
      code: generateCode(),
      expires_at: expiryFrom(now),
      used_at: null,
      created_at: now,
    };
    set((s) => ({ codes: [code, ...s.codes] }));
    return code;
  },
}));
