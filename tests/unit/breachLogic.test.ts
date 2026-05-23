import { describe, expect, it } from 'vitest';
import {
  AUTHORITY_DEADLINE_HOURS,
  advanceBreach,
  authorityDeadline,
  awaitingAuthorityCount,
  breachLogToCsv,
  classifyRisk,
  deadlineState,
  hoursToDeadline,
  isOpen,
  markAuthorityNotified,
  markSubjectsNotified,
  newBreach,
  nextStatus,
  openCount,
  requiresAuthorityNotification,
  requiresSubjectNotification,
  sortBreaches,
  type BreachRecord,
  type NewBreachInput,
  type RiskFactors,
} from '@/features/gdpr/breachLogic';
import { authorityNotification, breachProcedure, subjectNotice } from '@/features/gdpr/breachContent';

/**
 * T22 — personal-data breach procedure (GDPR art. 33/34). The risk
 * classification, the 72-hour deadline, the lifecycle and the notification
 * generators are pure and backend-free, so the whole procedure is exercised
 * here without a backend (runs offline in CI / demo mode).
 */

const ASOC = 'asoc-1';

function factors(p: Partial<RiskFactors> = {}): RiskFactors {
  return { sensitiveData: false, largeScale: false, identifiable: false, mitigated: false, ...p };
}

function input(p: Partial<NewBreachInput> = {}): NewBreachInput {
  return {
    title: 'Leak',
    description: 'Contact list exposed',
    nature: ['confidentiality'],
    discoveredAt: '2026-05-23T10:00:00.000Z',
    dataCategories: ['contact'],
    affectedCount: 12,
    factors: factors(),
    consequences: 'Spam risk',
    measures: 'Revoked access',
    ...p,
  };
}

describe('classifyRisk', () => {
  it('flags high risk for sensitive data', () => {
    expect(classifyRisk(factors({ sensitiveData: true }))).toBe('high');
  });

  it('flags high risk for large-scale identifiable data', () => {
    expect(classifyRisk(factors({ largeScale: true, identifiable: true }))).toBe('high');
  });

  it('flags risk (authority only) for identifiable but not large/sensitive', () => {
    expect(classifyRisk(factors({ identifiable: true }))).toBe('risk');
  });

  it('treats mitigated non-sensitive data as low risk (art. 34(3)(a))', () => {
    expect(classifyRisk(factors({ identifiable: true, largeScale: true, mitigated: true }))).toBe('low');
  });

  it('is low for anonymised, small, non-sensitive data', () => {
    expect(classifyRisk(factors())).toBe('low');
  });
});

describe('notification requirements', () => {
  it('requires authority notification for any risk above low', () => {
    expect(requiresAuthorityNotification('low')).toBe(false);
    expect(requiresAuthorityNotification('risk')).toBe(true);
    expect(requiresAuthorityNotification('high')).toBe(true);
  });

  it('requires subject notification only for high risk', () => {
    expect(requiresSubjectNotification('low')).toBe(false);
    expect(requiresSubjectNotification('risk')).toBe(false);
    expect(requiresSubjectNotification('high')).toBe(true);
  });
});

describe('72-hour deadline', () => {
  const discovered = '2026-05-23T10:00:00.000Z';
  const rec = newBreach(ASOC, 'Admin', input({ discoveredAt: discovered, factors: factors({ identifiable: true }) }));

  it('is exactly 72 hours after becoming aware', () => {
    expect(authorityDeadline(discovered)).toBe('2026-05-26T10:00:00.000Z');
    expect(AUTHORITY_DEADLINE_HOURS).toBe(72);
  });

  it('is on time well before the deadline', () => {
    expect(deadlineState(rec, new Date('2026-05-23T12:00:00.000Z'))).toBe('on_time');
  });

  it('is due soon within the final 24 hours', () => {
    expect(deadlineState(rec, new Date('2026-05-26T00:00:00.000Z'))).toBe('due_soon');
  });

  it('is overdue past the deadline', () => {
    expect(deadlineState(rec, new Date('2026-05-27T00:00:00.000Z'))).toBe('overdue');
  });

  it('is not required for a low-risk breach', () => {
    const low = newBreach(ASOC, 'Admin', input({ factors: factors() }));
    expect(low.risk).toBe('low');
    expect(deadlineState(low)).toBe('not_required');
  });

  it('is done once the authority is notified', () => {
    const done = markAuthorityNotified(rec, new Date('2026-05-23T12:00:00.000Z'));
    expect(deadlineState(done)).toBe('done');
  });

  it('reports whole hours to the deadline', () => {
    expect(hoursToDeadline(rec, new Date('2026-05-23T10:00:00.000Z'))).toBe(72);
    expect(hoursToDeadline(rec, new Date('2026-05-27T10:00:00.000Z'))).toBe(-24);
  });
});

describe('record + lifecycle', () => {
  it('builds a detected breach owned by the asociație, classifying risk from factors', () => {
    const r = newBreach(ASOC, 'Admin', input({ factors: factors({ sensitiveData: true }) }));
    expect(r.asociatie_id).toBe(ASOC);
    expect(r.status).toBe('detectat');
    expect(r.risk).toBe('high');
    expect(r.reported_by).toBe('Admin');
    expect(r.authority_notified_at).toBeNull();
    expect(r.subjects_notified_at).toBeNull();
  });

  it('trims text and floors a negative affected count to zero', () => {
    const r = newBreach(ASOC, null, input({ title: '  Leak  ', affectedCount: -5 }));
    expect(r.title).toBe('Leak');
    expect(r.affected_count).toBe(0);
  });

  it('honours an explicit risk override', () => {
    const r = newBreach(ASOC, 'Admin', input({ factors: factors(), risk: 'high' }));
    expect(r.risk).toBe('high');
  });

  it('advances forward only and stops at the final state', () => {
    expect(nextStatus('detectat')).toBe('evaluat');
    expect(nextStatus('inchis')).toBeNull();
    const r = newBreach(ASOC, 'Admin', input());
    const closed = advanceBreach(advanceBreach(advanceBreach(r)));
    expect(closed.status).toBe('inchis');
    expect(advanceBreach(closed)).toBe(closed);
  });

  it('marks authority notified once, advancing the status, and is idempotent', () => {
    const r = newBreach(ASOC, 'Admin', input({ factors: factors({ identifiable: true }) }));
    const n1 = markAuthorityNotified(r, new Date('2026-05-23T12:00:00.000Z'));
    expect(n1.authority_notified_at).toBe('2026-05-23T12:00:00.000Z');
    expect(n1.status).toBe('notificat');
    const n2 = markAuthorityNotified(n1, new Date('2026-05-24T00:00:00.000Z'));
    expect(n2.authority_notified_at).toBe('2026-05-23T12:00:00.000Z');
  });

  it('marks subjects notified once and is idempotent', () => {
    const r = newBreach(ASOC, 'Admin', input({ factors: factors({ sensitiveData: true }) }));
    const n1 = markSubjectsNotified(r, new Date('2026-05-23T12:00:00.000Z'));
    expect(n1.subjects_notified_at).toBe('2026-05-23T12:00:00.000Z');
    expect(markSubjectsNotified(n1, new Date('2026-05-25T00:00:00.000Z')).subjects_notified_at).toBe(
      '2026-05-23T12:00:00.000Z',
    );
  });
});

describe('queries', () => {
  const a = newBreach(ASOC, 'Admin', input({ discoveredAt: '2026-05-20T10:00:00.000Z', factors: factors({ identifiable: true }) }));
  const b = newBreach(ASOC, 'Admin', input({ discoveredAt: '2026-05-23T10:00:00.000Z', factors: factors() }));
  const closed: BreachRecord = { ...a, status: 'inchis' };

  it('counts open breaches', () => {
    expect(openCount([a, b, closed])).toBe(2);
    expect(isOpen(closed)).toBe(false);
  });

  it('counts breaches still owing an authority notification', () => {
    expect(awaitingAuthorityCount([a, b])).toBe(1); // only `a` is above low risk and not notified
    expect(awaitingAuthorityCount([markAuthorityNotified(a), b])).toBe(0);
  });

  it('sorts open first, then most recently discovered, without mutating', () => {
    const input2 = [closed, b];
    const sorted = sortBreaches(input2);
    expect(sorted[0]).toBe(b); // open before closed
    expect(input2[0]).toBe(closed); // input unchanged
  });
});

describe('notification content', () => {
  const high = newBreach(ASOC, 'Admin', input({ factors: factors({ sensitiveData: true }) }));
  const risk = newBreach(ASOC, 'Admin', input({ factors: factors({ identifiable: true }) }));

  it('builds the art. 33 authority notification with the controller and deadline (RO)', () => {
    const text = authorityNotification('ro', high, 'Asociația Tei');
    expect(text).toContain('Articolul 33');
    expect(text).toContain('Asociația Tei');
    expect(text).toContain(authorityDeadline(high.discovered_at));
    expect(text).toContain('Riscul este evaluat ca RIDICAT'); // high → subjects informed
  });

  it('states subjects are not required when risk is below high', () => {
    const text = authorityNotification('en', risk, 'Tei Association');
    expect(text).toContain('Article 33');
    expect(text).toContain('not high');
  });

  it('builds the art. 34 resident notice in clear language', () => {
    const ro = subjectNotice('ro', high, 'Asociația Tei');
    expect(ro).toContain('articolului 34 GDPR');
    expect(ro).toContain('Asociația Tei');
    const en = subjectNotice('en', high, 'Tei Association');
    expect(en).toContain('article 34');
  });

  it('falls back to a default controller name when blank', () => {
    expect(authorityNotification('ro', high, '   ')).toContain('Asociația de proprietari');
    expect(authorityNotification('en', high, '')).toContain('The homeowners association');
  });

  it('exposes the breach procedure as bilingual structured content', () => {
    expect(breachProcedure('ro').sections.length).toBeGreaterThan(0);
    expect(breachProcedure('en').sections[2].heading).toContain('72');
  });
});

describe('export', () => {
  it('serialises the log to CSV and handles an empty log', () => {
    const r = newBreach(ASOC, 'Admin', input());
    expect(breachLogToCsv([r])).toContain(r.id);
    expect(breachLogToCsv([])).toBe('(none)');
  });
});
