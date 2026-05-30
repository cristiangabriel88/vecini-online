import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildFetchSink } from '@/shared/lib/errorSink';
import { reportError, setErrorSink, type ErrorReport } from '@/shared/lib/errorReporting';

function stubReport(overrides?: Partial<ErrorReport>): ErrorReport {
  return {
    ref: 'IV-TEST-0001',
    name: 'Error',
    message: 'boom',
    source: 'test',
    at: 1_700_000_000_000,
    ...overrides,
  };
}

afterEach(() => {
  setErrorSink(null);
  vi.restoreAllMocks();
});

describe('buildFetchSink', () => {
  it('POSTs the report as JSON to the given endpoint', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const sink = buildFetchSink('/test-endpoint');

    sink(stubReport());

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/test-endpoint');
    expect(opts.method).toBe('POST');
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    const body = JSON.parse(opts.body as string) as ErrorReport;
    expect(body.ref).toBe('IV-TEST-0001');
    expect(body.message).toBe('boom');
  });

  it('stops sending after 10 reports (session storm limit)', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const sink = buildFetchSink('/test-endpoint');

    for (let i = 0; i < 15; i++) sink(stubReport());

    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('each buildFetchSink call starts with a fresh counter', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const a = buildFetchSink('/ep');
    const b = buildFetchSink('/ep');

    for (let i = 0; i < 15; i++) a(stubReport());
    for (let i = 0; i < 5; i++) b(stubReport());

    expect(fetchMock).toHaveBeenCalledTimes(15); // 10 from a, 5 from b
  });

  it('never throws when fetch rejects', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const sink = buildFetchSink('/test-endpoint');

    expect(() => sink(stubReport())).not.toThrow();
  });

  it('integrates end-to-end: reportError dispatches a scrubbed report to the sink', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    setErrorSink(buildFetchSink('/ep'));

    reportError(new Error('failed for user@mail.com'), { source: 'e2e-test' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as ErrorReport;
    expect(body.source).toBe('e2e-test');
    expect(body.message).toBe('failed for [email]');
    expect(body.message).not.toContain('@mail.com');
    expect(body.ref).toMatch(/^IV-/);
  });
});
