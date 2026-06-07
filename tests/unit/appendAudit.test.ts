import { describe, expect, it } from 'vitest';
import { GENESIS_HASH } from '../../src/features/audit/auditLogic';
import {
  AUDIT_GENESIS_HASH,
  computeAuditHash,
  appendAudit,
  type AppendAuditInput,
} from '../../netlify/functions/_shared/appendAudit';
import type { SupabaseClient } from '@supabase/supabase-js';

// T290 regression: six platform functions wrote hash: prevHash (the previous
// row's hash) and used the sentinel 'GENESIS' instead of '0000000000000000'.
// These tests verify the shared appendAudit helper uses the correct values.

describe('appendAudit -- constants', () => {
  it('AUDIT_GENESIS_HASH equals the 16-zero string', () => {
    expect(AUDIT_GENESIS_HASH).toBe('0000000000000000');
  });

  it('AUDIT_GENESIS_HASH matches GENESIS_HASH exported from auditLogic', () => {
    expect(AUDIT_GENESIS_HASH).toBe(GENESIS_HASH);
  });
});

describe('appendAudit -- computeAuditHash', () => {
  it('produces a 16-character lowercase hex string', () => {
    const hash = computeAuditHash({
      seq: 1,
      asociatie_id: 'asoc-1',
      actor_user_id: 'u-1',
      action: 'admin.provisioned',
      entity: 'admin',
      entity_label: 'a@b.com',
      before: null,
      after: 'admin',
      at: '2026-06-07T12:00:00.000Z',
      prev_hash: AUDIT_GENESIS_HASH,
    });
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic -- same input yields same output', () => {
    const fields = {
      seq: 2,
      asociatie_id: 'asoc-1',
      actor_user_id: 'u-1',
      action: 'feature.enabled',
      entity: 'feature',
      entity_label: 'F01',
      before: null,
      after: 'on',
      at: '2026-06-07T10:00:00.000Z',
      prev_hash: 'abc12345def67890',
    };
    expect(computeAuditHash(fields)).toBe(computeAuditHash(fields));
  });

  it('differs from prevHash -- it is a real computed hash, not a copy', () => {
    const prevHash = AUDIT_GENESIS_HASH;
    const hash = computeAuditHash({
      seq: 1,
      asociatie_id: 'asoc-1',
      actor_user_id: 'u-1',
      action: 'admin.provisioned',
      entity: 'admin',
      entity_label: 'a@b.com',
      before: null,
      after: 'admin',
      at: '2026-06-07T12:00:00.000Z',
      prev_hash: prevHash,
    });
    // The core bug being fixed: hash must NOT be set to prevHash.
    expect(hash).not.toBe(prevHash);
  });

  it('changes when any content field changes', () => {
    const base = {
      seq: 1,
      asociatie_id: 'asoc-1',
      actor_user_id: 'u-1',
      action: 'admin.provisioned',
      entity: 'admin',
      entity_label: 'a@b.com',
      before: null,
      after: 'admin',
      at: '2026-06-07T12:00:00.000Z',
      prev_hash: AUDIT_GENESIS_HASH,
    };
    const h0 = computeAuditHash(base);
    expect(computeAuditHash({ ...base, seq: 2 })).not.toBe(h0);
    expect(computeAuditHash({ ...base, action: 'admin.access_revoked' })).not.toBe(h0);
    expect(computeAuditHash({ ...base, prev_hash: 'ffffffff00000000' })).not.toBe(h0);
    expect(computeAuditHash({ ...base, after: 'revoked' })).not.toBe(h0);
    expect(computeAuditHash({ ...base, asociatie_id: 'other-asoc' })).not.toBe(h0);
  });

  it('uses AUDIT_GENESIS_HASH not "GENESIS" for the first entry prevHash', () => {
    // The old broken code used 'GENESIS' as the genesis sentinel.
    // Any chain built with 'GENESIS' produces a completely different hash.
    const correctHash = computeAuditHash({
      seq: 1,
      asociatie_id: 'asoc-1',
      actor_user_id: 'u-1',
      action: 'admin.provisioned',
      entity: 'admin',
      entity_label: 'a@b.com',
      before: null,
      after: 'admin',
      at: '2026-06-07T12:00:00.000Z',
      prev_hash: AUDIT_GENESIS_HASH,
    });
    const brokenHash = computeAuditHash({
      seq: 1,
      asociatie_id: 'asoc-1',
      actor_user_id: 'u-1',
      action: 'admin.provisioned',
      entity: 'admin',
      entity_label: 'a@b.com',
      before: null,
      after: 'admin',
      at: '2026-06-07T12:00:00.000Z',
      prev_hash: 'GENESIS', // old broken sentinel
    });
    expect(correctHash).not.toBe(brokenHash);
  });
});

describe('appendAudit -- chain self-consistency', () => {
  it('a chain assembled using the helper hash logic is internally consistent', () => {
    const at = '2026-06-07T12:00:00.000Z';
    const asocId = 'asoc-chain-test';

    const inputRows = [
      { action: 'admin.provisioned', entity: 'admin', entity_label: 'a@x.com', before: null, after: 'admin' },
      { action: 'feature.enabled', entity: 'feature', entity_label: 'F03', before: null, after: 'on' },
      { action: 'admin.access_revoked', entity: 'admin', entity_label: 'a@x.com', before: 'admin', after: 'revoked' },
    ];

    type Entry = { seq: number; prev_hash: string; hash: string; [k: string]: unknown };
    const entries: Entry[] = [];

    for (const inp of inputRows) {
      const prev = entries.length ? entries[entries.length - 1] : null;
      const prevSeq = prev?.seq ?? 0;
      const prevHash = prev?.hash ?? AUDIT_GENESIS_HASH;
      const newSeq = prevSeq + 1;
      const fields = {
        seq: newSeq,
        asociatie_id: asocId,
        actor_user_id: 'user-x',
        action: inp.action,
        entity: inp.entity,
        entity_label: inp.entity_label,
        before: inp.before,
        after: inp.after,
        at,
        prev_hash: prevHash,
      };
      entries.push({ ...fields, id: `id-${newSeq}`, hash: computeAuditHash(fields) });
    }

    // Verify chain self-consistency: each entry's prev_hash must link to the
    // predecessor's hash, and each entry's stored hash must match the computed hash.
    let expectedPrevHash = AUDIT_GENESIS_HASH;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      // Sequential seq.
      expect(e.seq).toBe(i + 1);
      // Correct prev_hash.
      expect(e.prev_hash).toBe(expectedPrevHash);
      // Hash is a real computed value (not just prevHash).
      expect(e.hash).not.toBe(e.prev_hash);
      // Hash recomputes correctly from the stored fields.
      const { hash, id: _id, ...rest } = e;
      expect(computeAuditHash(rest as unknown as Parameters<typeof computeAuditHash>[0])).toBe(hash);
      expectedPrevHash = e.hash as string;
    }
  });
});

describe('appendAudit -- error propagation and DB interaction', () => {
  function makeMockDb(opts: {
    lastEntry: { seq: number; hash: string } | null;
    insertError: { message: string; code: string } | null;
  }): SupabaseClient {
    return {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.lastEntry, error: null }) }),
              is: () => ({ maybeSingle: () => Promise.resolve({ data: opts.lastEntry, error: null }) }),
            }),
          }),
        }),
        insert: () => Promise.resolve({ error: opts.insertError }),
      }),
    } as unknown as SupabaseClient;
  }

  const baseInput: AppendAuditInput = {
    asociatie_id: 'asoc-1',
    actor_user_id: 'user-1',
    actor_name: null,
    action: 'admin.provisioned',
    entity: 'admin',
    entity_label: 'test@example.com',
    before_value: null,
    after_value: 'admin',
  };

  it('returns { error: null } on successful insert', async () => {
    const db = makeMockDb({ lastEntry: null, insertError: null });
    const result = await appendAudit(db, baseInput);
    expect(result.error).toBeNull();
  });

  it('returns { error: message } when insert fails with a non-retryable error', async () => {
    const db = makeMockDb({ lastEntry: null, insertError: { message: 'db-down', code: '50000' } });
    const result = await appendAudit(db, baseInput);
    expect(result.error).toBe('db-down');
  });

  it('uses AUDIT_GENESIS_HASH as prev_hash when chain is empty', async () => {
    let capturedInsert: Record<string, unknown> = {};
    const db = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
              is: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          capturedInsert = row;
          return Promise.resolve({ error: null });
        },
      }),
    } as unknown as SupabaseClient;

    await appendAudit(db, baseInput);
    expect(capturedInsert.prev_hash).toBe(AUDIT_GENESIS_HASH);
    expect(capturedInsert.seq).toBe(1);
  });

  it('uses the tail hash as prev_hash when chain has entries', async () => {
    const tailHash = 'abcd1234efgh5678';
    let capturedInsert: Record<string, unknown> = {};
    const db = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: { seq: 5, hash: tailHash }, error: null }) }),
              is: () => ({ maybeSingle: () => Promise.resolve({ data: { seq: 5, hash: tailHash }, error: null }) }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          capturedInsert = row;
          return Promise.resolve({ error: null });
        },
      }),
    } as unknown as SupabaseClient;

    await appendAudit(db, baseInput);
    expect(capturedInsert.prev_hash).toBe(tailHash);
    expect(capturedInsert.seq).toBe(6);
  });

  it('hash field is a computed hash, NOT equal to prevHash', async () => {
    let capturedInsert: Record<string, unknown> = {};
    const db = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
              is: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          capturedInsert = row;
          return Promise.resolve({ error: null });
        },
      }),
    } as unknown as SupabaseClient;

    await appendAudit(db, baseInput);
    // The primary bug fixed by T290: hash must NOT be the prevHash.
    expect(capturedInsert.hash).not.toBe(AUDIT_GENESIS_HASH);
    expect(typeof capturedInsert.hash).toBe('string');
    expect((capturedInsert.hash as string)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('hash field is consistent with the stored prev_hash and fields', async () => {
    let capturedInsert: Record<string, unknown> = {};
    const db = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
              is: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          capturedInsert = row;
          return Promise.resolve({ error: null });
        },
      }),
    } as unknown as SupabaseClient;

    await appendAudit(db, baseInput);
    // We can't know the exact `at` value used, but we can verify the stored
    // hash is neither the broken sentinel nor just a copy of prevHash.
    expect(capturedInsert.hash).not.toBe('GENESIS');
    expect(capturedInsert.hash).not.toBe(capturedInsert.prev_hash);
  });

  it('works for platform-scoped entries (asociatie_id: null)', async () => {
    let capturedInsert: Record<string, unknown> = {};
    const db = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              is: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          capturedInsert = row;
          return Promise.resolve({ error: null });
        },
      }),
    } as unknown as SupabaseClient;

    await appendAudit(db, { ...baseInput, asociatie_id: null });
    expect(capturedInsert.asociatie_id).toBeNull();
    expect(capturedInsert.prev_hash).toBe(AUDIT_GENESIS_HASH);
    expect(capturedInsert.hash).not.toBe(AUDIT_GENESIS_HASH);
  });
});
