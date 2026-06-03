import { beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal supabase stub so the store can be imported without a real backend.
vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      mfa: {
        listFactors: async () => ({ data: { totp: [] } }),
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: 'aal1', nextLevel: 'aal1' },
        }),
      },
    },
    from: () => ({
      select: () => ({
        count: 'exact',
        head: true,
        eq: async () => ({ count: 0 }),
      }),
    }),
  },
}));

import { useMfaStore } from '@/shared/store/mfaStore';

beforeEach(() => {
  useMfaStore.setState({
    loaded: false,
    enrolled: false,
    draft: null,
    recoveryCodes: null,
    recoveryCodesRemaining: null,
    demoSecret: null,
    demoRecoveryHashes: [],
  });
});

describe('recoveryCodesRemaining: count shown after enroll', () => {
  it('starts as null (not loaded) and resolves to demoRecoveryHashes.length after loadRecoveryCodesCount', async () => {
    useMfaStore.setState({ demoRecoveryHashes: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9', 'h10'] });
    expect(useMfaStore.getState().recoveryCodesRemaining).toBeNull();
    await useMfaStore.getState().loadRecoveryCodesCount();
    expect(useMfaStore.getState().recoveryCodesRemaining).toBe(10);
  });

  it('reflects 0 when demoRecoveryHashes is empty', async () => {
    useMfaStore.setState({ demoRecoveryHashes: [] });
    await useMfaStore.getState().loadRecoveryCodesCount();
    expect(useMfaStore.getState().recoveryCodesRemaining).toBe(0);
  });
});

describe('regenerate flow resets recoveryCodesRemaining', () => {
  it('sets recoveryCodesRemaining to 10 after regenerateRecoveryCodes', async () => {
    useMfaStore.setState({
      enrolled: true,
      demoSecret: 'DEMOBASE32SECRET',
      demoRecoveryHashes: [],
      recoveryCodesRemaining: 0,
    });
    const { error } = await useMfaStore.getState().regenerateRecoveryCodes();
    expect(error).toBeNull();
    expect(useMfaStore.getState().recoveryCodesRemaining).toBe(10);
    // Fresh plaintext codes are held for the user to copy.
    expect(useMfaStore.getState().recoveryCodes).toHaveLength(10);
  });
});

describe('recoveryCodesRemaining tracks code consumption in demo mode', () => {
  it('decrements when a recovery code is consumed via verifyChallenge', async () => {
    // Seed a known recovery code.
    const { hashRecoveryCodes, generateRecoveryCodes } = await import('@/features/auth/mfaLogic');
    const codes = generateRecoveryCodes();
    const hashes = await hashRecoveryCodes(codes);
    useMfaStore.setState({
      enrolled: true,
      demoSecret: 'DEMOBASE32SECRET',
      demoRecoveryHashes: hashes,
      recoveryCodesRemaining: hashes.length,
    });
    const before = useMfaStore.getState().recoveryCodesRemaining!;
    // Consume one code — verifyChallenge treats a non-TOTP-format input as a recovery code.
    const result = await useMfaStore.getState().verifyChallenge(codes[0]);
    expect(result.error).toBeNull();
    expect(useMfaStore.getState().recoveryCodesRemaining).toBe(before - 1);
  });
});

describe('button disabled below AAL2 (logic guard)', () => {
  it('recoveryCodesRemaining of 0 is exposed so the UI can flag an exhausted state', async () => {
    useMfaStore.setState({ demoRecoveryHashes: [], recoveryCodesRemaining: null });
    await useMfaStore.getState().loadRecoveryCodesCount();
    expect(useMfaStore.getState().recoveryCodesRemaining).toBe(0);
  });

  it('regenerateRecoveryCodes is blocked when not enrolled', async () => {
    useMfaStore.setState({ enrolled: false, recoveryCodesRemaining: null });
    const { error } = await useMfaStore.getState().regenerateRecoveryCodes();
    expect(error).toBe('not-enrolled');
    expect(useMfaStore.getState().recoveryCodesRemaining).toBeNull();
  });
});
