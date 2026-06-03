import { beforeEach, describe, expect, it } from 'vitest';
import { useAccessStore } from '@/features/access/accessStore';
import { hydrateAccessCodes, persistAccessCode } from '@/features/access/accessApi';
import { accessForAsociatie, seedAccessCodes, expiryFrom, generateCode } from '@/features/access/accessLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';
import type { AccessCode } from '@/shared/types/domain';

// accessApi offline-path tests (T215).
// Key contracts:
//   - hydrateAccessCodes: no-op when not configured / empty id
//   - persistAccessCode: prepends synchronously, offline-safe

const ASOC = DEMO_ASOCIATIE.id;

function makeCode(overrides?: Partial<AccessCode>): AccessCode {
  const now = new Date().toISOString();
  return {
    id: `ac-test-${Date.now()}`,
    asociatie_id: ASOC,
    generated_by: 'u-test',
    code: generateCode(() => 0.5),
    expires_at: expiryFrom(now),
    used_at: null,
    created_at: now,
    ...overrides,
  };
}

beforeEach(() => {
  useAccessStore.setState({ byAsociatie: seedAccessCodes(), fetchError: null });
});

describe('hydrateAccessCodes', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useAccessStore.getState().byAsociatie;
    await hydrateAccessCodes(ASOC);
    expect(useAccessStore.getState().byAsociatie).toBe(before);
    expect(useAccessStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useAccessStore.getState().byAsociatie;
    await hydrateAccessCodes('');
    expect(useAccessStore.getState().byAsociatie).toBe(before);
  });
});

describe('persistAccessCode', () => {
  it('prepends the code synchronously to the store', () => {
    const before = accessForAsociatie(useAccessStore.getState().byAsociatie, ASOC).length;
    const code = makeCode();
    persistAccessCode(ASOC, code);
    const after = accessForAsociatie(useAccessStore.getState().byAsociatie, ASOC);
    expect(after).toHaveLength(before + 1);
    expect(after[0].id).toBe(code.id);
  });

  it('stores the server-stamped expires_at as provided', () => {
    const code = makeCode({ expires_at: '2099-01-01T00:00:00Z' });
    persistAccessCode(ASOC, code);
    const stored = accessForAsociatie(useAccessStore.getState().byAsociatie, ASOC).find(
      (c) => c.id === code.id,
    )!;
    expect(stored.expires_at).toBe('2099-01-01T00:00:00Z');
  });
});
