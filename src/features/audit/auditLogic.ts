import Papa from 'papaparse';

/**
 * Audit-log model (T09).
 *
 * A tamper-evident, append-only trail of state changes across the app's
 * administrative and content surfaces: who did what, when, and the before/after
 * value. Pure and dependency-light so it unit-tests in isolation and the same
 * shape drives the demo log and the live `audit_log` table.
 *
 * Tamper-evidence rests on two layers:
 *  - storage is append-only (the `audit_log` RLS grants no update/delete to
 *    anyone, admins included), so the ordering cannot be rewritten in place;
 *  - each entry carries the hash of its predecessor and its own hash over its
 *    content + that previous hash, forming a chain. Editing or reordering any
 *    entry breaks every hash after it, which {@link verifyChain} detects. The
 *    hash is a fast non-cryptographic digest (integrity/ordering evidence for
 *    an honest-but-careless store, not a defence against a forging server); the
 *    append-only grant is the real guarantee.
 *
 * Privacy: an entry stores the actor's display name (already shown across the
 * app) and a short label/value of the affected entity. It never stores a
 * password, token, full email, or other PII beyond what the change itself is.
 */

/* -------------------------------- catalogue ------------------------------- */

/** Every audited action. Each maps to a bilingual `audit.action.*` label. */
export const AUDIT_ACTIONS = [
  'feature.enabled',
  'feature.disabled',
  'feature.request_dismissed',
  'invite.issued',
  'invite.revoked',
  'invite.email_sent',
  'invite.redeemed',
  'dsr.completed',
  'dsr.rejected',
  'breach.recorded',
  'breach.advanced',
  'breach.authority_notified',
  'breach.residents_notified',
  'breach.closed',
  'announcement.published',
  'apartment.created',
  'apartment.updated',
  'apartment.deleted',
  'building.updated',
  'asociatie.provisioned',
  'asociatie.suspended',
  'asociatie.reactivated',
  'asociatie.archived',
  'admin.provisioned',
  'admin.invite_revoked',
  'admin.access_revoked',
  'document.uploaded',
  'document.deleted',
  'ticket.submitted',
  'ticket.advanced',
  'aga.scheduled',
  'aga.opened',
  'aga.closed',
  'budget.proposed',
  'petition.created',
  'petition.forwarded',
  'impersonation.started',
  'impersonation.ended',
  'platform.admin_invited',
  'platform.admin_revoked',
  'broadcast.published',
  'broadcast.expired',
  'feature.override_enabled',
  'feature.override_disabled',
  'auth.rate_limited',
  'auth.locked_out',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Every audited entity kind. Each maps to a bilingual `audit.entity.*` label. */
export const AUDIT_ENTITIES = [
  'feature',
  'invite',
  'dsr',
  'breach',
  'announcement',
  'apartment',
  'building',
  'asociatie',
  'admin',
  'document',
  'ticket',
  'aga',
  'budget',
  'petition',
  'impersonation',
  'broadcast',
] as const;

export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

/* --------------------------------- model ---------------------------------- */

export interface AuditEntry {
  id: string;
  /** 1-based position within the asociație's chain. */
  seq: number;
  asociatie_id: string;
  /** Stable id of the actor; used for live RLS, not shown directly. */
  actor_user_id: string;
  /** Display name of the actor (already visible elsewhere in the app). */
  actor_name: string;
  action: AuditAction;
  entity: AuditEntity;
  /** Short human label of the affected entity (feature title, invite code, ...). */
  entity_label: string;
  /** Prior value snapshot, or null when the change has no meaningful "before". */
  before: string | null;
  /** New value snapshot, or null. */
  after: string | null;
  /** ISO timestamp the change happened. */
  at: string;
  /** Hash of the predecessor entry (the chain link). */
  prev_hash: string;
  /** Hash over this entry's content + `prev_hash`. */
  hash: string;
}

/** Everything needed to record one change; seq/hashes are derived. */
export interface AuditInput {
  asociatie_id: string;
  actor_user_id: string;
  actor_name: string;
  action: AuditAction;
  entity: AuditEntity;
  entity_label: string;
  before?: string | null;
  after?: string | null;
}

/** The first link's predecessor hash (no real predecessor). */
export const GENESIS_HASH = '0000000000000000';

/** Default retention: 2 years, aligned with the security-log window (T06). */
export const AUDIT_RETENTION_DAYS = 730;

/**
 * Canonical input for the server-held HMAC-SHA256 of the chain tail (T87).
 * Versioned so future format changes produce a distinct, non-matching value.
 * The HMAC itself is computed server-side by the `audit-hmac` Netlify function;
 * this pure helper produces the identical input string the server hashes so
 * tests and documentation share a single definition.
 */
export function hmacCanonical(asociatieId: string, tailHash: string): string {
  return `v1:${asociatieId}:${tailHash}`;
}

/* --------------------------------- hashing -------------------------------- */

/** cyrb53: a fast, well-distributed 64-bit non-cryptographic hash. */
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

/** Deterministic, order-stable serialization of an entry's content fields. */
function canonical(e: Omit<AuditEntry, 'hash'>): string {
  return [
    e.seq,
    e.asociatie_id,
    e.actor_user_id,
    e.action,
    e.entity,
    e.entity_label,
    e.before ?? '',
    e.after ?? '',
    e.at,
  ].join('');
}

/** Hash an entry over its content and its predecessor's hash (the chain link). */
export function computeHash(entry: Omit<AuditEntry, 'hash'>): string {
  return cyrb53(`${entry.prev_hash}${canonical(entry)}`);
}

/* -------------------------------- building -------------------------------- */

function newId(now: Date, rand: () => number): string {
  return `aud-${now.getTime().toString(36)}-${Math.floor(rand() * 1e9).toString(36)}`;
}

/**
 * Build the next entry in a chain. `prev` is the current tail (null for the
 * first entry); seq, prev_hash and hash are derived so the chain stays valid.
 */
export function newEntry(
  input: AuditInput,
  prev: AuditEntry | null,
  now: Date = new Date(),
  rand: () => number = Math.random,
): AuditEntry {
  const seq = prev ? prev.seq + 1 : 1;
  const prev_hash = prev ? prev.hash : GENESIS_HASH;
  const base: Omit<AuditEntry, 'hash'> = {
    id: newId(now, rand),
    seq,
    asociatie_id: input.asociatie_id,
    actor_user_id: input.actor_user_id,
    actor_name: input.actor_name,
    action: input.action,
    entity: input.entity,
    entity_label: input.entity_label,
    before: input.before ?? null,
    after: input.after ?? null,
    at: now.toISOString(),
    prev_hash,
  };
  return { ...base, hash: computeHash(base) };
}

/** Append a new entry to a chain (the tail becomes its predecessor). */
export function appendEntry(
  chain: AuditEntry[],
  input: AuditInput,
  now: Date = new Date(),
  rand: () => number = Math.random,
): AuditEntry[] {
  const prev = chain.length ? chain[chain.length - 1] : null;
  return [...chain, newEntry(input, prev, now, rand)];
}

/* ------------------------------- verifying -------------------------------- */

export interface ChainCheck {
  ok: boolean;
  /** Seq of the first entry that fails verification, or null when intact. */
  brokenAt: number | null;
}

/**
 * Re-derive every link and confirm the chain is intact: each entry's seq must
 * be sequential, its prev_hash must match the real predecessor, and its hash
 * must recompute from its content. Any edit or reorder is detected at the first
 * affected entry.
 */
export function verifyChain(entries: AuditEntry[]): ChainCheck {
  let prevHash = GENESIS_HASH;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const seqOk = e.seq === i + 1;
    const linkOk = e.prev_hash === prevHash;
    const { hash, ...rest } = e;
    const hashOk = computeHash(rest) === hash;
    if (!seqOk || !linkOk || !hashOk) return { ok: false, brokenAt: e.seq };
    prevHash = e.hash;
  }
  return { ok: true, brokenAt: null };
}

/* -------------------------------- querying -------------------------------- */

export interface AuditFilter {
  action?: AuditAction | 'all';
  entity?: AuditEntity | 'all';
  /** Case-insensitive substring matched against the actor name. */
  actor?: string;
  /** Case-insensitive substring matched across label/before/after/action. */
  text?: string;
  /** Inclusive lower bound (ISO date or datetime). */
  from?: string;
  /** Inclusive upper bound (ISO date; the whole day is included). */
  to?: string;
}

/** Apply a filter without mutating the input. */
export function filterEntries(entries: AuditEntry[], f: AuditFilter): AuditEntry[] {
  const actor = f.actor?.trim().toLowerCase() ?? '';
  const text = f.text?.trim().toLowerCase() ?? '';
  const fromMs = f.from ? new Date(f.from).getTime() : null;
  // An end date with no time means "through the end of that day".
  const toMs = f.to ? new Date(f.to).getTime() + (f.to.length <= 10 ? 86_400_000 - 1 : 0) : null;

  return entries.filter((e) => {
    if (f.action && f.action !== 'all' && e.action !== f.action) return false;
    if (f.entity && f.entity !== 'all' && e.entity !== f.entity) return false;
    if (actor && !e.actor_name.toLowerCase().includes(actor)) return false;
    if (text) {
      const hay = `${e.action} ${e.entity_label} ${e.before ?? ''} ${e.after ?? ''}`.toLowerCase();
      if (!hay.includes(text)) return false;
    }
    const atMs = new Date(e.at).getTime();
    if (fromMs !== null && atMs < fromMs) return false;
    if (toMs !== null && atMs > toMs) return false;
    return true;
  });
}

/** Newest first (highest seq first). Does not mutate the input. */
export function sortBySeqDesc(entries: AuditEntry[]): AuditEntry[] {
  return [...entries].sort((a, b) => b.seq - a.seq);
}

/* ------------------------------- retention -------------------------------- */

/** Drop entries older than the retention window. Does not mutate the input. */
export function pruneExpired(
  entries: AuditEntry[],
  now: Date = new Date(),
  days: number = AUDIT_RETENTION_DAYS,
): AuditEntry[] {
  const cutoff = now.getTime() - days * 86_400_000;
  return entries.filter((e) => new Date(e.at).getTime() >= cutoff);
}

/* --------------------------------- export --------------------------------- */

/** Serialize entries as pretty-printed JSON (machine-readable). */
export function auditToJson(entries: AuditEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

/** Serialize entries as a single CSV document. */
export function auditToCsv(entries: AuditEntry[]): string {
  return Papa.unparse(
    entries.map((e) => ({
      seq: e.seq,
      at: e.at,
      actor: e.actor_name,
      action: e.action,
      entity: e.entity,
      entity_label: e.entity_label,
      before: e.before ?? '',
      after: e.after ?? '',
      hash: e.hash,
      prev_hash: e.prev_hash,
    })),
  );
}

/* ------------------------------- demo seed -------------------------------- */

/**
 * A small, valid demo chain so the offline log is populated and visibly spans
 * several features. Deterministic (fixed timestamps + a seeded counter), so the
 * seeded hashes are stable and {@link verifyChain} passes on it.
 */
export function buildDemoAuditChain(
  asociatieId: string,
  actorUserId: string,
  actorName: string,
): AuditEntry[] {
  let counter = 1;
  const rand = () => {
    counter += 1;
    return (counter * 0.0173) % 1;
  };
  const seeds: { at: string; input: Omit<AuditInput, 'asociatie_id' | 'actor_user_id' | 'actor_name'> }[] = [
    {
      at: '2026-05-18T09:12:00.000Z',
      input: { action: 'feature.enabled', entity: 'feature', entity_label: 'F01', before: null, after: 'on' },
    },
    {
      at: '2026-05-19T14:30:00.000Z',
      input: { action: 'announcement.published', entity: 'announcement', entity_label: 'Curățenie generală scara A', before: null, after: null },
    },
    {
      at: '2026-05-20T10:05:00.000Z',
      input: { action: 'invite.issued', entity: 'invite', entity_label: 'PROPRIETAR', before: null, after: 'proprietar' },
    },
    {
      at: '2026-05-21T16:40:00.000Z',
      input: { action: 'feature.disabled', entity: 'feature', entity_label: 'F44', before: 'on', after: 'off' },
    },
    {
      at: '2026-05-22T08:20:00.000Z',
      input: { action: 'dsr.completed', entity: 'dsr', entity_label: 'export', before: 'pending', after: 'completed' },
    },
  ];

  let chain: AuditEntry[] = [];
  for (const s of seeds) {
    chain = appendEntry(
      chain,
      { asociatie_id: asociatieId, actor_user_id: actorUserId, actor_name: actorName, ...s.input },
      new Date(s.at),
      rand,
    );
  }
  return chain;
}
