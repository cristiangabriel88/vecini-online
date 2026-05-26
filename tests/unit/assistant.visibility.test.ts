import { describe, expect, it } from 'vitest';
import { FEATURES } from '@/shared/features/registry';
import { KNOWLEDGE_BASE } from '@/features/assistant/knowledge';
import { visibleEntries, rolesToBuckets } from '@/features/assistant/visibility';

/** Every feature enabled, so visibility is decided purely by role. */
const allFlags: Record<string, boolean> = Object.fromEntries(FEATURES.map((f) => [f.key, true]));

const ids = (role: Parameters<typeof visibleEntries>[1]) =>
  new Set(visibleEntries(KNOWLEDGE_BASE, role, allFlags).map((e) => e.id));

/** Features whose audience excludes residents (comitet/admin only). */
const COMITET_ONLY = ['F21', 'F22', 'F34', 'F43', 'F48', 'F51', 'F52', 'F53'];

describe('rolesToBuckets', () => {
  it('treats unknown / demo viewers as a plain resident (never privileged)', () => {
    const buckets = rolesToBuckets(null);
    expect(buckets.has('proprietar')).toBe(true);
    expect(buckets.has('comitet')).toBe(false);
    expect(buckets.has('admin')).toBe(false);
  });
});

describe('visibleEntries', () => {
  it('never surfaces comitet/admin-only features to a resident', () => {
    const resident = ids('proprietar');
    for (const key of COMITET_ONLY) expect(resident.has(key)).toBe(false);
    // ...but resident-facing features are present.
    expect(resident.has('F17')).toBe(true);
    expect(resident.has('F09')).toBe(true);
    expect(resident.has('F28')).toBe(true);
  });

  it('treats a demo viewer (null role) exactly like a resident', () => {
    expect(ids(null)).toEqual(ids('proprietar'));
  });

  it('lets an admin see comitet-only features', () => {
    const admin = ids('admin');
    for (const key of COMITET_ONLY) expect(admin.has(key)).toBe(true);
  });

  it('hides features the association has disabled', () => {
    const flags = { ...allFlags, F17: false };
    const visible = new Set(visibleEntries(KNOWLEDGE_BASE, 'proprietar', flags).map((e) => e.id));
    expect(visible.has('F17')).toBe(false);
  });

  it('treats an empty (un-hydrated) flag map as all-modules-available, not none', () => {
    // Production reality before live flag hydration (T56): a real association's
    // flags are absent, so the map is empty. The assistant must still answer
    // about features rather than collapse to only the curated concepts.
    const visible = new Set(visibleEntries(KNOWLEDGE_BASE, 'proprietar', {}).map((e) => e.id));
    expect(visible.has('F17')).toBe(true);
    expect(visible.has('F09')).toBe(true);
    // Audience/role filtering still applies even when flags are absent.
    for (const key of COMITET_ONLY) expect(visible.has(key)).toBe(false);
  });
});
