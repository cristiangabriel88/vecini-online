// Shared helper: append one correctly-hashed entry to the audit_log chain (T290).
//
// Replaces the six broken inline patterns that set hash: prevHash (the previous
// row's hash) and used the wrong genesis sentinel 'GENESIS' instead of
// '0000000000000000'. Mirrors the correct logic already present in impersonate.ts
// and matches auditLogic.ts exactly.
//
// Seq is allocated read-max-then-insert. The DB trigger audit_log_chain_stamp
// also assigns seq/prev_hash server-side; on a concurrent collision the unique
// constraint (asociatie_id, seq) fires and the helper retries up to MAX_RETRIES.
//
// Privacy: never log user ids, email, or insert content.

import type { SupabaseClient } from '@supabase/supabase-js';

export const AUDIT_GENESIS_HASH = '0000000000000000';

// cyrb53 non-cryptographic hash -- mirrors auditLogic.ts and impersonate.ts.
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const high = (h2 >>> 0).toString(16).padStart(8, '0');
  const low = (h1 >>> 0).toString(16).padStart(8, '0');
  return high + low;
}

export interface AuditHashFields {
  seq: number;
  asociatie_id: string | null;
  actor_user_id: string;
  action: string;
  entity: string;
  entity_label: string;
  before: string | null;
  after: string | null;
  at: string;
  prev_hash: string;
}

// Matches the canonical() function in auditLogic.ts field-for-field.
function canonical(f: AuditHashFields): string {
  return [
    f.seq,
    f.asociatie_id ?? '',
    f.actor_user_id,
    f.action,
    f.entity,
    f.entity_label,
    f.before ?? '',
    f.after ?? '',
    f.at,
  ].join('');
}

export function computeAuditHash(f: AuditHashFields): string {
  return cyrb53(`${f.prev_hash}${canonical(f)}`);
}

function newAuditId(): string {
  return `aud-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export interface AppendAuditInput {
  asociatie_id: string | null;
  actor_user_id: string;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_label: string;
  before_value?: string | null;
  after_value?: string | null;
}

const MAX_RETRIES = 3;
const UNIQUE_VIOLATION_CODE = '23505';

export async function appendAudit(
  db: SupabaseClient,
  input: AppendAuditInput,
): Promise<{ error: string | null }> {
  const at = new Date().toISOString();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Read the chain tail to determine the next seq and prev_hash.
    const baseQuery = db
      .from('audit_log')
      .select('seq, hash')
      .order('seq', { ascending: false })
      .limit(1);
    const tailQuery = input.asociatie_id !== null
      ? baseQuery.eq('asociatie_id', input.asociatie_id)
      : baseQuery.is('asociatie_id', null);
    const { data: lastEntry } = await tailQuery.maybeSingle();

    const prevSeq = (lastEntry as { seq: number } | null)?.seq ?? 0;
    const prevHash = (lastEntry as { hash: string } | null)?.hash ?? AUDIT_GENESIS_HASH;
    const newSeq = prevSeq + 1;

    const hashFields: AuditHashFields = {
      seq: newSeq,
      asociatie_id: input.asociatie_id,
      actor_user_id: input.actor_user_id,
      action: input.action,
      entity: input.entity,
      entity_label: input.entity_label,
      before: input.before_value ?? null,
      after: input.after_value ?? null,
      at,
      prev_hash: prevHash,
    };
    const hash = computeAuditHash(hashFields);

    const { error } = await db.from('audit_log').insert({
      id: newAuditId(),
      seq: newSeq,
      asociatie_id: input.asociatie_id,
      actor_user_id: input.actor_user_id,
      actor_name: input.actor_name,
      action: input.action,
      entity: input.entity,
      entity_label: input.entity_label,
      before_value: input.before_value ?? null,
      after_value: input.after_value ?? null,
      prev_hash: prevHash,
      hash,
    });

    if (!error) return { error: null };
    const code = (error as { code?: string }).code;
    if (code === UNIQUE_VIOLATION_CODE && attempt < MAX_RETRIES - 1) continue;
    return { error: error.message };
  }
  return { error: 'max-retries-exceeded' };
}
