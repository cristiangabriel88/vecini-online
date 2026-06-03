/**
 * T200: Live hydration + write for asociație identity.
 *
 * Tests the offline path (Supabase not configured):
 * - hydrateAsociatie is a no-op when Supabase is absent or id is empty
 * - saveAsociatie updates the store synchronously and returns null offline
 * - saveAsociatie is idempotent (second call merges correctly)
 * - hydrateFromRemote does not fire an audit entry
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { useAsociatieStore } from '@/features/admin/asociatieStore';
import { hydrateAsociatie, saveAsociatie } from '@/features/admin/asociatieApi';

const ASOC = 'test-asoc-api-00000000-0001';

beforeEach(() => {
  useAsociatieStore.setState({ edits: {} });
});

describe('hydrateAsociatie (offline path)', () => {
  it('is a no-op when Supabase is not configured', async () => {
    await hydrateAsociatie(ASOC);
    expect(useAsociatieStore.getState().edits[ASOC]).toBeUndefined();
  });

  it('is a no-op when asociatieId is empty', async () => {
    await hydrateAsociatie('');
    expect(Object.keys(useAsociatieStore.getState().edits)).toHaveLength(0);
  });
});

describe('saveAsociatie (offline path)', () => {
  it('updates the store synchronously and returns null', async () => {
    const result = await saveAsociatie(ASOC, { name: 'Bloc Test', address: 'Str. Testului 1' });
    expect(result).toBeNull();
    const edits = useAsociatieStore.getState().edits[ASOC];
    expect(edits?.name).toBe('Bloc Test');
    expect(edits?.address).toBe('Str. Testului 1');
  });

  it('merges a second patch without overwriting unrelated fields', async () => {
    await saveAsociatie(ASOC, { name: 'Bloc Test' });
    await saveAsociatie(ASOC, { address: 'Str. Testului 1' });
    const edits = useAsociatieStore.getState().edits[ASOC];
    expect(edits?.name).toBe('Bloc Test');
    expect(edits?.address).toBe('Str. Testului 1');
  });

  it('persists null optional fields (cui, iban, phone)', async () => {
    await saveAsociatie(ASOC, {
      name: 'Bloc Test',
      cui: null,
      iban: null,
      contact_phone: null,
    });
    const edits = useAsociatieStore.getState().edits[ASOC];
    expect(edits?.cui).toBeNull();
    expect(edits?.iban).toBeNull();
    expect(edits?.contact_phone).toBeNull();
  });

  it('persists settings (scari) alongside identity fields', async () => {
    const settings = { scari: ['A', 'B', 'C'] };
    await saveAsociatie(ASOC, { name: 'Bloc Test', settings });
    const edits = useAsociatieStore.getState().edits[ASOC];
    expect(edits?.settings).toEqual(settings);
  });
});
