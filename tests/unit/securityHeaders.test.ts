import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCsp, buildHeadersFileContent, CSP_REPORT_PATH } from '../../scripts/cspHeaders';

// T04 — security-headers guard. The browser-hardening headers in netlify.toml
// (CSP, HSTS, frame/content-type protections, cross-origin isolation) are a
// production control; this test fails if any is removed or quietly weakened so
// the deployment can never silently regress.
// T39 — buildCsp unit tests verify the exact-origin CSP generation logic.

const toml = readFileSync(join(process.cwd(), 'netlify.toml'), 'utf8');

// The "/*" header block applies these to every response.
function headerValue(name: string): string {
  const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"`);
  const m = toml.match(re);
  return m ? m[1] : '';
}

describe('security headers (netlify.toml) (T04)', () => {
  it('forces HTTPS with a long-lived, preload-ready HSTS policy', () => {
    const hsts = headerValue('Strict-Transport-Security');
    const maxAge = Number(hsts.match(/max-age=(\d+)/)?.[1] ?? 0);
    expect(maxAge).toBeGreaterThanOrEqual(31536000); // at least one year
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).toContain('preload');
  });

  it('ships a restrictive Content-Security-Policy', () => {
    const csp = headerValue('Content-Security-Policy');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("script-src 'self'"); // no 'unsafe-inline' / 'unsafe-eval' for scripts
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).not.toMatch(/script-src[^;]*unsafe-eval/);
    // Outbound connections are limited to self and the Supabase project.
    expect(csp).toMatch(/connect-src[^;]*'self'/);
    expect(csp).toMatch(/connect-src[^;]*supabase\.co/);
  });

  it('keeps the framing, sniffing, referrer and permissions protections', () => {
    expect(headerValue('X-Frame-Options')).toBe('DENY');
    expect(headerValue('X-Content-Type-Options')).toBe('nosniff');
    expect(headerValue('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headerValue('Permissions-Policy')).toContain('camera=()');
  });

  it('isolates the browsing context across origins', () => {
    expect(headerValue('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headerValue('Cross-Origin-Resource-Policy')).toBe('same-origin');
  });

  it('ships report-to and report-uri directives in the static CSP', () => {
    const csp = headerValue('Content-Security-Policy');
    expect(csp).toContain('report-to csp-endpoint');
    expect(csp).toContain('report-uri /.netlify/functions/csp-report');
  });

  it('ships Report-To and Reporting-Endpoints headers for the CSP sink', () => {
    expect(toml).toContain('Report-To');
    expect(toml).toContain('"csp-endpoint"');
    expect(toml).toContain('Reporting-Endpoints');
    expect(toml).toContain('/.netlify/functions/csp-report');
  });
});

describe('buildCsp (T39)', () => {
  const FAKE_URL = 'https://abcxyzproject.supabase.co';
  const PROD_URL = 'https://zylfndjluunbtudtawzq.supabase.co';

  it('uses exact HTTPS + WSS origins when supabaseUrl is provided', () => {
    const csp = buildCsp(FAKE_URL);
    expect(csp).toContain('connect-src');
    expect(csp).toMatch(/connect-src[^;]*https:\/\/abcxyzproject\.supabase\.co/);
    expect(csp).toMatch(/connect-src[^;]*wss:\/\/abcxyzproject\.supabase\.co/);
    expect(csp).toMatch(/img-src[^;]*https:\/\/abcxyzproject\.supabase\.co/);
  });

  it('does not include any wildcard supabase origin when supabaseUrl is provided', () => {
    const csp = buildCsp(FAKE_URL);
    expect(csp).not.toContain('*.supabase.co');
  });

  it('falls back to the hosted production Supabase origin when a private Pi URL is used on prod builds', () => {
    const csp = buildCsp('http://100.92.246.15:54321', 'prod');
    expect(csp).toMatch(new RegExp(`connect-src[^;]*${PROD_URL.replaceAll('.', '\\.')}`));
    expect(csp).not.toContain('100.92.246.15');
  });

  it('restricts connect-src to self only when no supabaseUrl (demo mode)', () => {
    const csp = buildCsp(undefined);
    const connectSrc = csp.match(/connect-src([^;]*)/)?.[1] ?? '';
    expect(connectSrc.trim()).toBe("'self'");
  });

  it('does not include any supabase origin in demo mode', () => {
    const csp = buildCsp(undefined);
    expect(csp).not.toContain('supabase');
  });

  it('includes report-to and report-uri directives', () => {
    const csp = buildCsp(FAKE_URL);
    expect(csp).toContain('report-to csp-endpoint');
    expect(csp).toContain(`report-uri ${CSP_REPORT_PATH}`);
  });

  it('always preserves core security directives', () => {
    for (const url of [FAKE_URL, undefined]) {
      const csp = buildCsp(url);
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
      expect(csp).toContain('upgrade-insecure-requests');
    }
  });

  it('buildHeadersFileContent includes CSP, Report-To, and Reporting-Endpoints', () => {
    const content = buildHeadersFileContent(FAKE_URL);
    expect(content).toContain('/*');
    expect(content).toContain('Content-Security-Policy:');
    expect(content).toContain('Report-To:');
    expect(content).toContain('Reporting-Endpoints:');
    expect(content).toContain(CSP_REPORT_PATH);
  });
});
