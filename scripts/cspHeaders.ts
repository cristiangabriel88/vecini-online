import { resolveSupabaseUrl } from '../src/shared/lib/supabaseUrl';

export const CSP_REPORT_PATH = '/.netlify/functions/csp-report';

/**
 * Build a Content-Security-Policy string.
 *
 * When supabaseUrl is provided the exact project origin replaces the
 * *.supabase.co wildcard so only the real project can receive connections.
 * When absent (demo / no backend) connect-src is restricted to 'self' only.
 */
export function buildCsp(
  supabaseUrl: string | undefined,
  appStage?: string | undefined,
): string {
  let httpOrigin = '';
  let wsOrigin = '';

  const resolvedSupabaseUrl = resolveSupabaseUrl(supabaseUrl, appStage);
  if (resolvedSupabaseUrl) {
    const origin = new URL(resolvedSupabaseUrl).origin;
    httpOrigin = ` ${origin}`;
    wsOrigin = ` ${origin.replace(/^https:/, 'wss:')}`;
  }

  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `form-action 'self'`,
    `script-src 'self'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:${httpOrigin}`,
    `font-src 'self' data:`,
    `connect-src 'self'${httpOrigin}${wsOrigin}`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `report-to csp-endpoint`,
    `report-uri ${CSP_REPORT_PATH}`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

/** Build the full contents of a Netlify _headers file for the dist/ directory. */
export function buildHeadersFileContent(
  supabaseUrl: string | undefined,
  appStage?: string | undefined,
): string {
  const csp = buildCsp(supabaseUrl, appStage);
  const reportTo = JSON.stringify({
    group: 'csp-endpoint',
    max_age: 86400,
    endpoints: [{ url: CSP_REPORT_PATH }],
  });

  return [
    '/*',
    `  Content-Security-Policy: ${csp}`,
    `  Report-To: ${reportTo}`,
    `  Reporting-Endpoints: csp-endpoint="${CSP_REPORT_PATH}"`,
    '',
  ].join('\n');
}
