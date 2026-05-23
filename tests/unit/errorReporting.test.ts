import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildReport,
  makeRef,
  normalizeError,
  reportError,
  scrubMessage,
  setErrorSink,
  type ErrorReport,
} from '@/shared/lib/errorReporting';

afterEach(() => {
  setErrorSink(null);
  vi.restoreAllMocks();
});

describe('scrubMessage', () => {
  it('redacts email addresses', () => {
    expect(scrubMessage('login failed for ana.popescu@example.com'))
      .toBe('login failed for [email]');
  });

  it('redacts JWTs and bearer tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.dozjgNryP4J3jVmNHl0w';
    expect(scrubMessage(`token ${jwt} rejected`)).toBe('token [token] rejected');
    expect(scrubMessage('Authorization: Bearer abc.def-123')).toBe('Authorization: Bearer [token]');
  });

  it('redacts secret query/body params case-insensitively', () => {
    expect(scrubMessage('GET /rest?apikey=sk_live_9aZ&id=1'))
      .toBe('GET /rest?apikey=[redacted]&id=1');
    expect(scrubMessage('access_token=xyz123 expired')).toBe('access_token=[redacted] expired');
  });

  it('redacts long digit runs (phone / IBAN / card)', () => {
    expect(scrubMessage('call 0721234567 now')).toBe('call [number] now');
    // short numbers (apartment, http status) are left intact
    expect(scrubMessage('apartment 12, error 503')).toBe('apartment 12, error 503');
  });

  it('leaves pseudonymous UUIDs intact (useful, not a direct identifier)', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(scrubMessage(`row ${uuid} not found`)).toBe(`row ${uuid} not found`);
  });
});

describe('normalizeError', () => {
  it('extracts name/message/stack from an Error', () => {
    const e = new TypeError('boom');
    const n = normalizeError(e);
    expect(n.name).toBe('TypeError');
    expect(n.message).toBe('boom');
    expect(n.stack).toBeDefined();
  });

  it('handles strings and arbitrary objects without throwing', () => {
    expect(normalizeError('plain string').message).toBe('plain string');
    expect(normalizeError({ code: 42 }).message).toBe('{"code":42}');
    expect(normalizeError(undefined).message).toBeTruthy();
  });
});

describe('makeRef', () => {
  it('produces a stable, prefixed, three-segment code from its inputs', () => {
    const ref = makeRef(1_700_000_000_000, 0.5);
    expect(ref).toMatch(/^IV-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(makeRef(1_700_000_000_000, 0.5)).toBe(ref); // deterministic
  });
});

describe('buildReport', () => {
  it('scrubs the message, stack and string extras', () => {
    const err = new Error('failed for user@mail.com with token eyJa.bBc.dDe');
    err.stack = 'Error: failed\n  at fn (user@mail.com)';
    const report = buildReport(
      err,
      { source: 'route', extra: { email: 'leak@mail.com', status: 500, ok: false } },
      'IV-AAAA-BBBB',
      123,
    );
    expect(report.message).toBe('failed for [email] with token [token]');
    expect(report.stack).toContain('[email]');
    expect(report.extra).toEqual({ email: '[email]', status: 500, ok: false });
    expect(report.ref).toBe('IV-AAAA-BBBB');
    expect(report.at).toBe(123);
    // no PII leaks anywhere in the serialized report
    expect(JSON.stringify(report)).not.toContain('@mail.com');
  });

  it('omits undefined extras', () => {
    const report = buildReport(new Error('x'), { extra: { a: undefined, b: 1 } }, 'r', 0);
    expect(report.extra).toEqual({ b: 1 });
  });
});

describe('reportError', () => {
  it('dispatches a scrubbed report to the sink and returns it', () => {
    const received: ErrorReport[] = [];
    setErrorSink((r) => received.push(r));
    const out = reportError(new Error('boom for who@x.com'), { source: 'test' });
    expect(received).toHaveLength(1);
    expect(received[0].message).toBe('boom for [email]');
    expect(received[0].source).toBe('test');
    expect(out.ref).toMatch(/^IV-/);
  });

  it('never throws even when the sink throws', () => {
    setErrorSink(() => {
      throw new Error('sink down');
    });
    expect(() => reportError(new Error('original'))).not.toThrow();
  });
});
