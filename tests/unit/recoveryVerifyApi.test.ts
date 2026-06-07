/**
 * Unit tests for verifyRecoveryCodeLive (T29).
 *
 * Security contracts under test:
 *   - Bearer token is taken from the server-issued session, never from a
 *     client-supplied value, so user_id is resolved server-side.
 *   - A missing or expired session produces a hard no-session error before any
 *     network call is attempted.
 *   - Non-ok HTTP responses surface the server error code verbatim so callers
 *     can distinguish rate-limits, bad codes, etc. without leaking body detail.
 *   - Network failures never throw uncaught; they are normalised to network-error.
 *   - The Authorization header carries exactly the session access_token.
 */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'tok-abc' } },
      }),
    },
  },
}));

import { verifyRecoveryCodeLive } from '../../src/features/auth/recoveryVerifyApi';
import { supabase } from '@/shared/lib/supabase';

const mockGetSession = vi.mocked(supabase.auth.getSession);

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'tok-abc' } },
  } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('verifyRecoveryCodeLive — session guard', () => {
  it('returns { ok: false, error: "no-session" } when getSession returns null session', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    const result = await verifyRecoveryCodeLive('ABCDEF');

    expect(result).toEqual({ ok: false, error: 'no-session' });
  });

  it('does not call fetch when the session is missing', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    await verifyRecoveryCodeLive('ABCDEF');

    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns { ok: false, error: "no-session" } when access_token is an empty string', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: '' } },
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    const result = await verifyRecoveryCodeLive('ABCDEF');

    expect(result).toEqual({ ok: false, error: 'no-session' });
  });
});

describe('verifyRecoveryCodeLive — successful verification', () => {
  it('returns { ok: true } when the server responds with 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const result = await verifyRecoveryCodeLive('ABCDEF');

    expect(result).toEqual({ ok: true });
  });

  it('POSTs to the mfa-recovery-verify endpoint', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await verifyRecoveryCodeLive('ABCDEF');

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/.netlify/functions/mfa-recovery-verify');
  });

  it('uses method POST', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await verifyRecoveryCodeLive('ABCDEF');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init as RequestInit).method).toBe('POST');
  });

  it('sends the code in the JSON body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await verifyRecoveryCodeLive('MYCODE');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body.code).toBe('MYCODE');
  });

  it('sends the session access_token as the Authorization Bearer header', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await verifyRecoveryCodeLive('ABCDEF');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer tok-abc');
  });
});

describe('verifyRecoveryCodeLive — server error responses', () => {
  it('returns { ok: false, error: <server code> } on a non-ok response with JSON error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'invalid-code' }), { status: 422 }),
    );

    const result = await verifyRecoveryCodeLive('WRONG1');

    expect(result).toEqual({ ok: false, error: 'invalid-code' });
  });

  it('returns { ok: false, error: "verify-failed" } when the JSON body has no error field', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'something went wrong' }), { status: 500 }),
    );

    const result = await verifyRecoveryCodeLive('WRONG2');

    expect(result).toEqual({ ok: false, error: 'verify-failed' });
  });

  it('returns { ok: false, error: "verify-failed" } when the response body is not valid JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    const result = await verifyRecoveryCodeLive('WRONG3');

    expect(result).toEqual({ ok: false, error: 'verify-failed' });
  });

  it('returns { ok: false, error: "verify-failed" } for an empty body on a non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 403 }));

    const result = await verifyRecoveryCodeLive('WRONG4');

    expect(result).toEqual({ ok: false, error: 'verify-failed' });
  });

  it('surfaces a rate-limit code verbatim', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'rate-limited' }), { status: 429 }),
    );

    const result = await verifyRecoveryCodeLive('WRONG5');

    expect(result).toEqual({ ok: false, error: 'rate-limited' });
  });
});

describe('verifyRecoveryCodeLive — network failures', () => {
  it('returns { ok: false, error: "network-error" } when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await verifyRecoveryCodeLive('ABCDEF');

    expect(result).toEqual({ ok: false, error: 'network-error' });
  });

  it('does not rethrow on network errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('ERR_CONNECTION_REFUSED'));

    await expect(verifyRecoveryCodeLive('ABCDEF')).resolves.not.toThrow();
  });
});
