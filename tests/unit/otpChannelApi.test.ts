/**
 * Unit tests for `otpChannelApi` (T143): JWT claim decoding and live OTP
 * function wrappers. Fetch is stubbed so no real network calls are made.
 */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub Supabase so module imports succeed without a real project URL.
vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'stub.stub.stub' } },
      }),
    },
  },
}));

import { hasAppElevation, requestOtpLive, verifyOtpLive } from '@/features/auth/otpChannelApi';

// ── hasAppElevation ───────────────────────────────────────────────────────────

function makeJwt(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  // btoa works in Node 16+; use Buffer for broader compat
  const b64 = Buffer.from(json).toString('base64url');
  return `header.${b64}.signature`;
}

describe('hasAppElevation', () => {
  it('returns false for undefined/null/empty tokens', () => {
    expect(hasAppElevation(undefined)).toBe(false);
    expect(hasAppElevation(null)).toBe(false);
    expect(hasAppElevation('')).toBe(false);
  });

  it('returns false when the JWT has fewer than two segments', () => {
    expect(hasAppElevation('notajwt')).toBe(false);
  });

  it('returns false when app_2fa_at is absent', () => {
    const token = makeJwt({ sub: 'u1', aal: 'aal1' });
    expect(hasAppElevation(token)).toBe(false);
  });

  it('returns false when app_2fa_at is 0', () => {
    const token = makeJwt({ app_2fa_at: 0 });
    expect(hasAppElevation(token)).toBe(false);
  });

  it('returns false when app_2fa_at is not a number', () => {
    expect(hasAppElevation(makeJwt({ app_2fa_at: 'timestamp' }))).toBe(false);
    expect(hasAppElevation(makeJwt({ app_2fa_at: null }))).toBe(false);
  });

  it('returns true when app_2fa_at is a positive number', () => {
    const token = makeJwt({ sub: 'u1', app_2fa_at: 1_700_000_000, app_2fa_channel: 'email' });
    expect(hasAppElevation(token)).toBe(true);
  });

  it('returns false for a malformed base64 segment', () => {
    expect(hasAppElevation('header.!!!notvalid!!!.sig')).toBe(false);
  });

  it('handles base64url encoding (- and _ characters)', () => {
    // Construct a payload where base64url would differ from base64.
    const token = makeJwt({ app_2fa_at: 1_700_000_000, padding: 'a'.repeat(100) });
    expect(hasAppElevation(token)).toBe(true);
  });
});

// ── requestOtpLive ────────────────────────────────────────────────────────────

describe('requestOtpLive', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ok=true on HTTP 200', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    const result = await requestOtpLive('email');
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns ok=false with the server error code on non-200', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":"rate-limited"}', { status: 429 }),
    );
    const result = await requestOtpLive('email');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('rate-limited');
  });

  it('returns ok=false with resend-cooldown when the server returns that error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":"resend-cooldown"}', { status: 429 }),
    );
    const result = await requestOtpLive('email');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('resend-cooldown');
  });

  it('returns network-error when fetch throws', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));
    const result = await requestOtpLive('email');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('network-error');
  });

  it('sends the channel in the request body', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    await requestOtpLive('email');
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body.channel).toBe('email');
  });

  it('omits the recovery flag by default (T295)', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    await requestOtpLive('email');
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body.recovery).toBeUndefined();
  });

  it('sends recovery:true when the recovery option is set (T295)', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    await requestOtpLive('email', { recovery: true });
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body.recovery).toBe(true);
    expect(body.channel).toBe('email');
  });
});

// ── verifyOtpLive ─────────────────────────────────────────────────────────────

describe('verifyOtpLive', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ok=true on HTTP 200', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    const result = await verifyOtpLive('email', '123456');
    expect(result.ok).toBe(true);
  });

  it('returns ok=false with challenge-locked on 429', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":"challenge-locked"}', { status: 429 }),
    );
    const result = await verifyOtpLive('email', '000000');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('challenge-locked');
  });

  it('returns ok=false with invalid-code on 422', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":"invalid-code","remainingAttempts":4}', { status: 422 }),
    );
    const result = await verifyOtpLive('email', '000000');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid-code');
  });

  it('sends the confirm token when provided (no code)', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    await verifyOtpLive('email', undefined, 'my-confirm-token');
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;
    expect(body.token).toBe('my-confirm-token');
    expect(body.code).toBeUndefined();
  });

  it('returns network-error when fetch throws', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));
    const result = await verifyOtpLive('email', '123456');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('network-error');
  });
});
