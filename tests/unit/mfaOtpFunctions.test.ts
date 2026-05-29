// Unit tests for T142: mfa-otp-request / mfa-otp-verify helpers + otpEmail builder.
//
// These tests are backend-free (no real Supabase calls). They cover:
//   1. extractSessionId  -- JWT payload decoding
//   2. buildOtpEmail     -- bilingual template output
//   3. resolveOtpEmailLocale -- locale resolution

import { describe, it, expect } from 'vitest';
import { extractSessionId } from '../../netlify/functions/mfa-otp-request';
import {
  buildOtpEmail,
  resolveOtpEmailLocale,
  type OtpEmailLocale,
} from '@/shared/lib/otpEmail';

// ── extractSessionId ──────────────────────────────────────────────────────

function makeJwt(payload: Record<string, unknown>): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${payloadB64}.signature`;
}

describe('extractSessionId', () => {
  it('returns the session_id from a valid JWT payload', () => {
    const jwt = makeJwt({ sub: 'user-1', session_id: 'sess-abc-123' });
    expect(extractSessionId(jwt)).toBe('sess-abc-123');
  });

  it('returns null when session_id is absent', () => {
    const jwt = makeJwt({ sub: 'user-1' });
    expect(extractSessionId(jwt)).toBeNull();
  });

  it('returns null when session_id is not a string', () => {
    const jwt = makeJwt({ session_id: 42 });
    expect(extractSessionId(jwt)).toBeNull();
  });

  it('returns null for a malformed JWT (fewer than two segments)', () => {
    expect(extractSessionId('notajwt')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractSessionId('')).toBeNull();
  });

  it('handles base64url-encoded payloads (- and _ characters)', () => {
    // Build a payload whose base64url encoding would contain - or _
    const jwt = makeJwt({ session_id: 'sess-xyz', extra: 'a'.repeat(100) });
    expect(extractSessionId(jwt)).toBe('sess-xyz');
  });
});

// ── resolveOtpEmailLocale ─────────────────────────────────────────────────

describe('resolveOtpEmailLocale', () => {
  const cases: Array<[string | null | undefined, OtpEmailLocale]> = [
    ['en', 'en'],
    ['en-US', 'en'],
    ['EN', 'en'],
    ['ro', 'ro'],
    ['ro-RO', 'ro'],
    ['fr', 'ro'],
    [null, 'ro'],
    [undefined, 'ro'],
    ['', 'ro'],
  ];

  for (const [input, expected] of cases) {
    it(`resolves ${JSON.stringify(input)} to '${expected}'`, () => {
      expect(resolveOtpEmailLocale(input)).toBe(expected);
    });
  }
});

// ── buildOtpEmail ─────────────────────────────────────────────────────────

describe('buildOtpEmail', () => {
  const RO_PARAMS = {
    locale: 'ro',
    code: '123456',
    confirmLink: 'https://vecini.online/confirma-2fa?token=abc&channel=email',
    expiryMinutes: 10,
  };

  const EN_PARAMS = { ...RO_PARAMS, locale: 'en' };

  it('Romanian: subject contains "verificare"', () => {
    expect(buildOtpEmail(RO_PARAMS).subject.toLowerCase()).toContain('verificare');
  });

  it('English: subject contains "verification"', () => {
    expect(buildOtpEmail(EN_PARAMS).subject.toLowerCase()).toContain('verification');
  });

  it('includes the numeric code in the text body', () => {
    expect(buildOtpEmail(RO_PARAMS).text).toContain('123456');
  });

  it('includes the confirm link in the text body', () => {
    expect(buildOtpEmail(RO_PARAMS).text).toContain(RO_PARAMS.confirmLink);
  });

  it('includes the numeric code in the HTML body', () => {
    expect(buildOtpEmail(RO_PARAMS).html).toContain('123456');
  });

  it('includes the confirm link (HTML-escaped) in the HTML body', () => {
    // The & in the query string is escaped to &amp; in HTML attribute context.
    const escapedLink = RO_PARAMS.confirmLink.replace(/&/g, '&amp;');
    expect(buildOtpEmail(RO_PARAMS).html).toContain(escapedLink);
  });

  it('HTML body is valid enough to contain html and body tags', () => {
    const { html } = buildOtpEmail(RO_PARAMS);
    expect(html).toMatch(/<html/);
    expect(html).toMatch(/<body/);
  });

  it('does not produce subject/text/html as empty strings', () => {
    const { subject, text, html } = buildOtpEmail(RO_PARAMS);
    expect(subject.length).toBeGreaterThan(0);
    expect(text.length).toBeGreaterThan(0);
    expect(html.length).toBeGreaterThan(0);
  });

  it('defaults to Romanian when locale is null', () => {
    const { subject } = buildOtpEmail({ ...RO_PARAMS, locale: null });
    expect(subject.toLowerCase()).toContain('verificare');
  });

  it('defaults expiryMinutes to 10 when not provided', () => {
    const { text } = buildOtpEmail({ locale: 'en', code: '000000', confirmLink: 'https://example.com' });
    expect(text).toContain('10 minutes');
  });

  it('shows the expiry in the Romanian text', () => {
    const { text } = buildOtpEmail({ ...RO_PARAMS, expiryMinutes: 5 });
    expect(text).toContain('5 minute');
  });

  it('escapes HTML special characters in the confirm link', () => {
    const { html } = buildOtpEmail({
      ...RO_PARAMS,
      confirmLink: 'https://example.com?a=1&b=2',
    });
    expect(html).toContain('&amp;');
    expect(html).not.toContain('&b=2'); // raw & should not appear unescaped
  });
});
