import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../netlify/functions/_shared/supabaseAdmin', () => ({
  isSupabaseAdminConfigured: vi.fn(() => true),
  supabaseAdmin: vi.fn(),
}));

import { sendEmail, MAX_EMAIL_ATTEMPTS, EMAIL_RETRY_BASE_DELAY_MS } from '../../netlify/functions/_shared/resend';
import { reportEmailFailure } from '../../netlify/functions/_shared/emailFailureReporter';
import { isSupabaseAdminConfigured, supabaseAdmin } from '../../netlify/functions/_shared/supabaseAdmin';

const PARAMS = {
  to: 'resident@example.com',
  subject: 'Test subject',
  text: 'Hello',
  html: '<p>Hello</p>',
};

function okResponse(id = 'msg-1') {
  return { ok: true, status: 200, json: async () => ({ id }) };
}

function errResponse(status: number) {
  return { ok: false, status, json: async () => ({}) };
}

describe('sendEmail retry logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('RESEND_FROM_EMAIL', 'noreply@test.com');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns ok=true on first attempt when send succeeds immediately', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse('msg-1')));
    const promise = sendEmail(PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.messageId).toBe('msg-1');
  });

  it('retries on 5xx and succeeds on the third attempt', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(errResponse(500))
      .mockResolvedValueOnce(errResponse(503))
      .mockResolvedValueOnce(okResponse('msg-ok'));
    vi.stubGlobal('fetch', fetchMock);

    const promise = sendEmail(PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry on a permanent 4xx failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(errResponse(422));
    vi.stubGlobal('fetch', fetchMock);

    const promise = sendEmail(PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('send-failed');
    expect(result.attempts).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on network error and exhausts MAX_EMAIL_ATTEMPTS', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const promise = sendEmail(PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('network-error');
    expect(result.attempts).toBe(MAX_EMAIL_ATTEMPTS);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_EMAIL_ATTEMPTS);
  });

  it('uses exponential backoff between retries', async () => {
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal('setTimeout', (fn: () => void, ms: number) => {
      delays.push(ms);
      return originalSetTimeout(fn, 0);
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(errResponse(500))
      .mockResolvedValueOnce(errResponse(500))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    const promise = sendEmail(PARAMS);
    await vi.runAllTimersAsync();
    await promise;

    expect(delays).toEqual([
      EMAIL_RETRY_BASE_DELAY_MS,
      EMAIL_RETRY_BASE_DELAY_MS * 2,
    ]);
  });

  it('returns not-configured with attempts=0 when env vars are absent', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const promise = sendEmail(PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not-configured');
    expect(result.attempts).toBe(0);
  });

  it('stops retrying once max attempts reached and returns last failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(errResponse(500));
    vi.stubGlobal('fetch', fetchMock);

    const promise = sendEmail(PARAMS);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(MAX_EMAIL_ATTEMPTS);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_EMAIL_ATTEMPTS);
  });
});

describe('reportEmailFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('inserts a non-PII failure record to platform_error_reports', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn(() => ({ insert: insertMock }));
    vi.mocked(isSupabaseAdminConfigured).mockReturnValue(true);
    vi.mocked(supabaseAdmin).mockReturnValue({ from: fromMock } as unknown as ReturnType<typeof supabaseAdmin>);

    await reportEmailFailure('invite', 'resident', 'send-failed', 2);

    expect(fromMock).toHaveBeenCalledWith('platform_error_reports');
    const row = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(row.name).toBe('email.send-failed');
    expect(row.source).toBe('email:invite:resident');
    expect((row.message as string)).toContain('2 attempt');
    expect((row.message as string)).not.toMatch(/@/);
    expect((row.extra as Record<string, unknown>).attempts).toBe(2);
  });

  it('is a no-op when Supabase is not configured', async () => {
    vi.mocked(isSupabaseAdminConfigured).mockReturnValue(false);
    const fromMock = vi.fn();
    vi.mocked(supabaseAdmin).mockReturnValue({ from: fromMock } as unknown as ReturnType<typeof supabaseAdmin>);

    await reportEmailFailure('otp', 'admin', 'network-error', 3);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('records template and recipient class but not a raw email address', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(isSupabaseAdminConfigured).mockReturnValue(true);
    vi.mocked(supabaseAdmin).mockReturnValue({
      from: vi.fn(() => ({ insert: insertMock })),
    } as unknown as ReturnType<typeof supabaseAdmin>);

    await reportEmailFailure('admin-invite', 'admin', 'send-failed', 1);

    const row = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(row.source).toBe('email:admin-invite:admin');
    expect(row.name).toBe('email.send-failed');
    const msg = row.message as string;
    expect(msg).not.toMatch(/[@.]\w+\.\w+/);
  });
});
