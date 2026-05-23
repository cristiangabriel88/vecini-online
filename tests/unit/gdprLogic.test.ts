import { describe, expect, it } from 'vitest';
import type {
  DirectoryEntry,
  DiscussionThread,
  Idea,
  MarketplaceListing,
  Pet,
  PrivateThread,
  Ticket,
} from '@/shared/types/domain';
import type { ConsentRecord } from '@/features/legal/consentLogic';
import type { AuthAuditEvent } from '@/features/auth/authAudit';
import ro from '@/shared/locales/ro.json';
import en from '@/shared/locales/en.json';
import {
  ERASURE_PLAN,
  EXPORT_SECTION_KEYS,
  RETENTION_POLICY,
  actionRequest,
  anonymizeName,
  collectPersonalData,
  hasOpenRequest,
  isPending,
  makeRequest,
  pendingCount,
  sortRequests,
  toExportCsv,
  toExportJson,
  type CollectInput,
  type DataSubjectRequest,
} from '@/features/gdpr/gdprLogic';

/**
 * T06 + T73 — GDPR data-subject rights. The export, erasure plan, retention
 * policy and request model are pure and backend-free, so the whole right is
 * exercised here without a backend (it runs offline in CI / demo mode). T73
 * broadened the export to every personal-data store; the section set is locked
 * down here so a future feature can't silently fall outside the export.
 */

const ME = 'u-me';
const OTHER = 'u-other';

function ticket(id: string, reporter: string): Ticket {
  return {
    id,
    asociatie_id: 'a1',
    reporter_user_id: reporter,
    apartment_id: null,
    title: `t-${id}`,
    description: 'desc',
    category: 'general',
    severity: 'medium',
    location_scara: null,
    location_etaj: null,
    location_description: null,
    status: 'primit',
    assigned_to_user_id: null,
    sla_due_at: null,
    resolved_at: null,
    verified_at: null,
    resolution_notes: null,
    rating: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function listing(id: string, seller: string): MarketplaceListing {
  return {
    id,
    asociatie_id: 'a1',
    seller_user_id: seller,
    seller_name: 'Seller',
    category: 'vand',
    title: `l-${id}`,
    description: 'desc',
    price: 10,
    photo_path: null,
    expires_at: '2026-02-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function idea(id: string, author: string): Idea {
  return {
    id,
    asociatie_id: 'a1',
    author_user_id: author,
    author_name: 'Author',
    title: `i-${id}`,
    body: 'body',
    status: 'in_discutie',
    votes: 3,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function directory(id: string, user: string): DirectoryEntry {
  return {
    id,
    asociatie_id: 'a1',
    user_id: user,
    name: 'Eu',
    apartment: 'Ap. 5',
    phone: '0700',
    email: 'eu@vecini.online',
    show_name: true,
    show_apartment: true,
    show_phone: false,
    show_email: false,
  };
}

function pet(id: string, owner: string): Pet {
  return {
    id,
    asociatie_id: 'a1',
    owner_user_id: owner,
    owner_name: 'Eu',
    name: 'Rex',
    species: 'caine',
    photo_path: null,
    emergency_contact: null,
    lost: false,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function thread(messages: { author: string }[]): DiscussionThread {
  return {
    id: 'th1',
    asociatie_id: 'a1',
    topic: 'general',
    title: 'Subiect',
    pinned: false,
    created_at: '2026-01-01T00:00:00.000Z',
    messages: messages.map((m, idx) => ({
      id: `m${idx}`,
      thread_id: 'th1',
      author_user_id: m.author,
      author_name: 'X',
      body: `body-${idx}`,
      created_at: '2026-01-01T00:00:00.000Z',
    })),
  };
}

function adminThread(resident: string): PrivateThread {
  return {
    id: 'pt1',
    asociatie_id: 'a1',
    resident_user_id: resident,
    resident_name: 'Eu',
    subject: 'Plângere',
    status: 'open',
    created_at: '2026-01-01T00:00:00.000Z',
    messages: [
      { id: 'pm1', thread_id: 'pt1', sender: 'resident', sender_name: 'Eu', body: 'salut', created_at: '2026-01-01T00:00:00.000Z', read: true },
      { id: 'pm2', thread_id: 'pt1', sender: 'admin', sender_name: 'Admin', body: 'raspuns', created_at: '2026-01-01T00:00:00.000Z', read: true },
    ],
  };
}

const consent: ConsentRecord = {
  choices: { necessary: true, preferences: true, analytics: false, marketing: false },
  version: 1,
  decidedAt: '2026-01-01T00:00:00.000Z',
};

const securityEvent: AuthAuditEvent = {
  type: 'login',
  at: '2026-01-02T00:00:00.000Z',
  emailMask: 'a***@vecini.online',
};

/** A fully-empty input (every personal-data array present, all empty). */
function emptyInput(overrides: Partial<CollectInput> = {}): CollectInput {
  return {
    userId: ME,
    name: 'Eu Rezident',
    email: 'eu@vecini.online',
    apartment: 'Ap. 5',
    asociatieName: 'Asociația Test',
    tickets: [],
    marketplace: [],
    ideas: [],
    discussionThreads: [],
    adminChatThreads: [],
    anonymousMessages: [],
    petitions: [],
    thankYous: [],
    directory: [],
    birthdays: [],
    carpool: [],
    sitters: [],
    barter: [],
    pets: [],
    bikes: [],
    lending: [],
    feedback: [],
    kidsRanges: [],
    kidsEvents: [],
    laundryBookings: [],
    movingBookings: [],
    venueBookings: [],
    visitorReports: [],
    consentHistory: [],
    securityEvents: [],
    now: new Date('2026-05-23T10:00:00.000Z'),
    ...overrides,
  };
}

function collect() {
  return collectPersonalData(
    emptyInput({
      tickets: [ticket('t1', ME), ticket('t2', OTHER)],
      marketplace: [listing('l1', ME), listing('l2', OTHER)],
      ideas: [idea('i1', ME), idea('i2', OTHER)],
      consentHistory: [consent],
      securityEvents: [securityEvent],
    }),
  );
}

describe('gdprLogic — collectPersonalData (art. 15 + 20)', () => {
  it('includes a profile section with the subject identity', () => {
    const exp = collect();
    const profile = exp.sections.find((s) => s.key === 'profile');
    expect(profile?.rows).toHaveLength(1);
    expect(profile?.rows[0]).toMatchObject({ user_id: ME, name: 'Eu Rezident', apartment: 'Ap. 5' });
  });

  it('returns only rows that genuinely belong to the subject', () => {
    const exp = collect();
    const rowsOf = (key: string) => exp.sections.find((s) => s.key === key)?.rows ?? [];
    expect(rowsOf('tickets')).toHaveLength(1);
    expect(rowsOf('tickets')[0]).toMatchObject({ id: 't1' });
    expect(rowsOf('marketplace')).toHaveLength(1);
    expect(rowsOf('marketplace')[0]).toMatchObject({ id: 'l1' });
    expect(rowsOf('ideas')).toHaveLength(1);
    expect(rowsOf('ideas')[0]).toMatchObject({ id: 'i1' });
  });

  it('carries the consent and security history', () => {
    const exp = collect();
    expect(exp.sections.find((s) => s.key === 'consent')?.rows).toHaveLength(1);
    expect(exp.sections.find((s) => s.key === 'security')?.rows[0]).toMatchObject({ event: 'login' });
  });

  it('stamps the generation time and subject metadata', () => {
    const exp = collect();
    expect(exp.generatedAt).toBe('2026-05-23T10:00:00.000Z');
    expect(exp.subject).toEqual({ userId: ME, name: 'Eu Rezident', asociatie: 'Asociația Test' });
  });

  it('gathers the broadened personal-data stores, filtered to the subject', () => {
    const exp = collectPersonalData(
      emptyInput({
        directory: [directory('d1', ME), directory('d2', OTHER)],
        pets: [pet('p1', ME), pet('p2', OTHER)],
        discussionThreads: [thread([{ author: ME }, { author: OTHER }, { author: ME }])],
        adminChatThreads: [adminThread(ME), adminThread(OTHER)],
      }),
    );
    const rowsOf = (key: string) => exp.sections.find((s) => s.key === key)?.rows ?? [];
    expect(rowsOf('directory')).toHaveLength(1);
    expect(rowsOf('directory')[0]).toMatchObject({ id: 'd1' });
    expect(rowsOf('pets')).toHaveLength(1);
    expect(rowsOf('pets')[0]).toMatchObject({ id: 'p1' });
    // Forum: only the subject's two messages across the thread.
    expect(rowsOf('discussions')).toHaveLength(2);
    // Admin chat: only the subject's own thread, and only their messages (not the admin's).
    expect(rowsOf('adminchat')).toHaveLength(1);
    expect(rowsOf('adminchat')[0]).toMatchObject({ body: 'salut' });
  });
});

describe('gdprLogic — section set is the single source of truth', () => {
  it('exports exactly the expected set of sections (a new store must be added here)', () => {
    expect([...EXPORT_SECTION_KEYS].sort()).toEqual(
      [
        'adminchat',
        'anonymous',
        'barter',
        'bikes',
        'birthdays',
        'carpool',
        'consent',
        'directory',
        'discussions',
        'feedback',
        'ideas',
        'kids',
        'kidsEvents',
        'laundry',
        'lending',
        'marketplace',
        'moving',
        'pets',
        'petitions',
        'profile',
        'security',
        'sitters',
        'thankyous',
        'tickets',
        'venue',
        'visitors',
      ].sort(),
    );
  });

  it('produces one export section per declared key', () => {
    const exp = collectPersonalData(emptyInput());
    expect(exp.sections.map((s) => s.key)).toEqual(EXPORT_SECTION_KEYS);
  });

  it('gives every export section an erasure outcome and a retention period', () => {
    for (const key of EXPORT_SECTION_KEYS) {
      expect(ERASURE_PLAN.some((r) => r.category === key)).toBe(true);
      expect(RETENTION_POLICY.some((r) => r.category === key)).toBe(true);
    }
  });

  it('keeps the retain-only categories (votes, financial) in the erasure + retention plan', () => {
    for (const cat of ['votes', 'financial']) {
      expect(ERASURE_PLAN.find((r) => r.category === cat)?.action).toBe('retain');
      expect(RETENTION_POLICY.some((r) => r.category === cat)).toBe(true);
    }
  });
});

describe('gdprLogic — i18n coverage of every category', () => {
  type Dict = { gdpr: Record<string, Record<string, string>> };
  const ros = ro as unknown as Dict;
  const ens = en as unknown as Dict;

  it('has a section label in both languages for every category', () => {
    const cats = [...EXPORT_SECTION_KEYS, 'votes', 'financial'];
    for (const c of cats) {
      expect(ros.gdpr.section[c], `ro section.${c}`).toBeTruthy();
      expect(ens.gdpr.section[c], `en section.${c}`).toBeTruthy();
    }
  });

  it('resolves every erasure reason and retention period/basis key in both languages', () => {
    const resolve = (dict: Dict, dotted: string): string | undefined => {
      const [, group, leaf] = dotted.split('.'); // strip the leading "gdpr"
      return dict.gdpr[group]?.[leaf];
    };
    for (const r of ERASURE_PLAN) {
      expect(resolve(ros, r.reasonKey), `ro ${r.reasonKey}`).toBeTruthy();
      expect(resolve(ens, r.reasonKey), `en ${r.reasonKey}`).toBeTruthy();
    }
    for (const r of RETENTION_POLICY) {
      expect(resolve(ros, r.periodKey), `ro ${r.periodKey}`).toBeTruthy();
      expect(resolve(ens, r.periodKey), `en ${r.periodKey}`).toBeTruthy();
      expect(resolve(ros, r.basisKey), `ro ${r.basisKey}`).toBeTruthy();
      expect(resolve(ens, r.basisKey), `en ${r.basisKey}`).toBeTruthy();
    }
  });
});

describe('gdprLogic — serialization', () => {
  it('produces parseable JSON round-tripping to the export', () => {
    const exp = collect();
    const parsed = JSON.parse(toExportJson(exp));
    expect(parsed.subject.userId).toBe(ME);
    expect(parsed.sections).toHaveLength(exp.sections.length);
  });

  it('emits one CSV block per section, with empty sections shown as (none)', () => {
    const exp = collectPersonalData(emptyInput({ email: null, apartment: null }));
    const csv = toExportCsv(exp);
    // Every section appears as a labelled block; empty ones are not omitted.
    for (const s of exp.sections) expect(csv).toContain(`# ${s.key}`);
    expect(csv).toContain('(none)');
  });
});

describe('gdprLogic — erasure + retention model', () => {
  it('deletes free contributions and contact data but retains/anonymizes records of record', () => {
    const action = (cat: string) => ERASURE_PLAN.find((r) => r.category === cat)?.action;
    expect(action('profile')).toBe('delete');
    expect(action('marketplace')).toBe('delete');
    expect(action('tickets')).toBe('anonymize');
    expect(action('votes')).toBe('retain');
    expect(action('financial')).toBe('retain');
    // Broadened categories carry the right outcome.
    expect(action('directory')).toBe('delete');
    expect(action('laundry')).toBe('delete');
    expect(action('discussions')).toBe('anonymize');
    expect(action('petitions')).toBe('anonymize');
    // Every rule carries a legal rationale key.
    expect(ERASURE_PLAN.every((r) => r.reasonKey.startsWith('gdpr.reason.'))).toBe(true);
  });

  it('documents a retention period + lawful basis for every retained category', () => {
    expect(RETENTION_POLICY.length).toBeGreaterThan(0);
    expect(RETENTION_POLICY.every((r) => r.periodKey && r.basisKey)).toBe(true);
  });

  it('provides a bilingual anonymized placeholder identity', () => {
    expect(anonymizeName('ro')).toBe('Rezident anonimizat');
    expect(anonymizeName('en')).toBe('Anonymized resident');
  });
});

describe('gdprLogic — request lifecycle', () => {
  const now = new Date('2026-05-23T10:00:00.000Z');

  it('opens a pending request', () => {
    const req = makeRequest('erasure', ME, 'Eu', 'a1', now);
    expect(req).toMatchObject({ type: 'erasure', status: 'pending', subject_user_id: ME });
    expect(isPending(req)).toBe(true);
    expect(req.actioned_at).toBeNull();
  });

  it('actions a pending request and records the actor + time, immutable thereafter', () => {
    const req = makeRequest('erasure', ME, 'Eu', 'a1', now);
    const done = actionRequest(req, 'completed', 'Admin Maria', 'verificat', now);
    expect(done.status).toBe('completed');
    expect(done.actioned_by).toBe('Admin Maria');
    expect(done.actioned_at).toBe(now.toISOString());
    expect(done.note).toBe('verificat');
    // A second action is a no-op: the trail cannot be rewritten.
    const again = actionRequest(done, 'rejected', 'Other', null, now);
    expect(again).toBe(done);
  });

  it('counts pending requests and flags an existing open request of a type', () => {
    const reqs: DataSubjectRequest[] = [
      makeRequest('export', ME, 'Eu', 'a1', now),
      actionRequest(makeRequest('erasure', OTHER, 'Alt', 'a1', now), 'completed', 'Admin', null, now),
    ];
    expect(pendingCount(reqs)).toBe(1);
    expect(hasOpenRequest(reqs, ME, 'export')).toBe(true);
    expect(hasOpenRequest(reqs, ME, 'erasure')).toBe(false);
    expect(hasOpenRequest(reqs, OTHER, 'erasure')).toBe(false);
  });

  it('sorts pending first, then most recent, without mutating the input', () => {
    const a = makeRequest('export', ME, 'Eu', 'a1', new Date('2026-05-20T00:00:00Z'));
    const b = makeRequest('erasure', ME, 'Eu', 'a1', new Date('2026-05-22T00:00:00Z'));
    const c = actionRequest(
      makeRequest('export', OTHER, 'Alt', 'a1', new Date('2026-05-23T00:00:00Z')),
      'completed',
      'Admin',
      null,
      now,
    );
    const input = [c, a, b];
    const sorted = sortRequests(input);
    expect(sorted.map((r) => r.id)).toEqual([b.id, a.id, c.id]);
    expect(input).toEqual([c, a, b]); // input untouched
  });
});
