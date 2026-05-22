import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// T04 — security-headers guard. The browser-hardening headers in netlify.toml
// (CSP, HSTS, frame/content-type protections, cross-origin isolation) are a
// production control; this test fails if any is removed or quietly weakened so
// the deployment can never silently regress.

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
});
