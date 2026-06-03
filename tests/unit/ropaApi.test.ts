/**
 * T75: Live activation of ROPA snapshot + DPA adoption persistence.
 *
 * Tests the offline path (Supabase not configured):
 * - saveRopaSnapshot is a no-op when Supabase is absent or id is empty
 * - loadRopaSnapshots returns [] offline
 * - adoptDpa is a no-op when Supabase is absent or id is empty
 * - loadDpaAdoptions returns [] offline
 * - saveRopaSnapshot returns error when id is empty
 * - adoptDpa returns error when id is empty
 */

import { describe, expect, it } from 'vitest';
import { adoptDpa, loadDpaAdoptions, loadRopaSnapshots, saveRopaSnapshot } from '@/features/legal/ropaApi';

const ASOC = 'test-ropa-api-00000000-0001';

describe('saveRopaSnapshot (offline path)', () => {
  it('returns not-configured when Supabase is absent', async () => {
    const result = await saveRopaSnapshot(ASOC, 'Admin Test', ['F01'], []);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-configured');
  });

  it('returns not-configured when asociatieId is empty', async () => {
    const result = await saveRopaSnapshot('', 'Admin Test', [], []);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-configured');
  });
});

describe('loadRopaSnapshots (offline path)', () => {
  it('returns [] when Supabase is not configured', async () => {
    const result = await loadRopaSnapshots(ASOC);
    expect(result).toEqual([]);
  });

  it('returns [] when asociatieId is empty', async () => {
    const result = await loadRopaSnapshots('');
    expect(result).toEqual([]);
  });
});

describe('adoptDpa (offline path)', () => {
  it('returns not-configured when Supabase is absent', async () => {
    const result = await adoptDpa(ASOC, '2026-05-23', 'Admin Test', null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-configured');
  });

  it('returns not-configured when asociatieId is empty', async () => {
    const result = await adoptDpa('', '2026-05-23', 'Admin Test', null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-configured');
  });

  it('returns not-configured with a non-null actorUserId offline', async () => {
    const result = await adoptDpa(ASOC, '2026-05-23', 'Admin Test', 'user-uuid-123');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-configured');
  });
});

describe('loadDpaAdoptions (offline path)', () => {
  it('returns [] when Supabase is not configured', async () => {
    const result = await loadDpaAdoptions(ASOC);
    expect(result).toEqual([]);
  });

  it('returns [] when asociatieId is empty', async () => {
    const result = await loadDpaAdoptions('');
    expect(result).toEqual([]);
  });
});
