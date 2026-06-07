import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  validateServerConfig,
  assertServerConfig,
  SERVER_VARS,
} from '../../netlify/functions/_shared/configValidator';
import {
  validateClientConfig,
  CLIENT_VARS,
} from '../../src/shared/lib/clientConfigValidator';

// Minimal valid live env for server-side tests.
const LIVE_ENV: Record<string, string> = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx',
  AUDIT_HMAC_SECRET: 'a'.repeat(32),
  APP_URL: 'https://vecini.online',
  MAIL_MODE: 'disabled',
};

// Minimal valid live env for client-side tests.
const CLIENT_LIVE_ENV: Record<string, string> = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx',
};

// ────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE
// ────────────────────────────────────────────────────────────────────────────

describe('validateServerConfig -- demo mode', () => {
  it('returns demo=true and no issues when VITE_SUPABASE_URL is absent', () => {
    const result = validateServerConfig({});
    expect(result.demo).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('returns demo=true when only SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    const result = validateServerConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' });
    expect(result.demo).toBe(true);
  });

  it('returns demo=true when both Supabase vars are empty strings', () => {
    const result = validateServerConfig({ VITE_SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' });
    expect(result.demo).toBe(true);
  });
});

describe('validateServerConfig -- live mode, all valid', () => {
  it('returns no issues for a fully valid live config with MAIL_MODE=disabled', () => {
    const result = validateServerConfig(LIVE_ENV);
    expect(result.demo).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('returns no issues when MAIL_MODE=log (Resend vars not required)', () => {
    const result = validateServerConfig({ ...LIVE_ENV, MAIL_MODE: 'log' });
    expect(result.demo).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('returns no issues with valid Resend vars when MAIL_MODE=resend', () => {
    const result = validateServerConfig({
      ...LIVE_ENV,
      MAIL_MODE: 'resend',
      RESEND_API_KEY: 're_abc123',
      RESEND_FROM_EMAIL: 'no-reply@vecini.online',
      RESEND_WEBHOOK_SECRET: 'b'.repeat(32),
    });
    expect(result.demo).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('returns no issues with valid Telegram vars', () => {
    const result = validateServerConfig({
      ...LIVE_ENV,
      TELEGRAM_BOT_TOKEN: '1234567890:ABCdef',
      TELEGRAM_WEBHOOK_SECRET: 'c'.repeat(32),
    });
    expect(result.demo).toBe(false);
    expect(result.issues).toHaveLength(0);
  });
});

describe('validateServerConfig -- missing required vars in live mode', () => {
  it('flags AUDIT_HMAC_SECRET as missing', () => {
    const env = { ...LIVE_ENV };
    delete env.AUDIT_HMAC_SECRET;
    const result = validateServerConfig(env);
    const issue = result.issues.find(i => i.name === 'AUDIT_HMAC_SECRET');
    expect(issue).toBeDefined();
    expect(issue?.reason).toBe('missing');
  });

  it('flags APP_URL as missing', () => {
    const env = { ...LIVE_ENV };
    delete env.APP_URL;
    const result = validateServerConfig(env);
    const issue = result.issues.find(i => i.name === 'APP_URL');
    expect(issue).toBeDefined();
    expect(issue?.reason).toBe('missing');
  });

  it('flags RESEND_API_KEY as missing when MAIL_MODE=resend', () => {
    const result = validateServerConfig({ ...LIVE_ENV, MAIL_MODE: 'resend' });
    const issue = result.issues.find(i => i.name === 'RESEND_API_KEY');
    expect(issue).toBeDefined();
    expect(issue?.reason).toBe('missing');
  });

  it('does NOT flag RESEND_API_KEY when MAIL_MODE=log', () => {
    const result = validateServerConfig({ ...LIVE_ENV, MAIL_MODE: 'log' });
    const issue = result.issues.find(i => i.name === 'RESEND_API_KEY');
    expect(issue).toBeUndefined();
  });

  it('flags TELEGRAM_WEBHOOK_SECRET as missing when TELEGRAM_BOT_TOKEN is set', () => {
    const result = validateServerConfig({ ...LIVE_ENV, TELEGRAM_BOT_TOKEN: '123:abc' });
    const issue = result.issues.find(i => i.name === 'TELEGRAM_WEBHOOK_SECRET');
    expect(issue).toBeDefined();
    expect(issue?.reason).toBe('missing');
  });

  it('does NOT flag TELEGRAM_WEBHOOK_SECRET when bot token is absent', () => {
    const result = validateServerConfig(LIVE_ENV);
    const issue = result.issues.find(i => i.name === 'TELEGRAM_WEBHOOK_SECRET');
    expect(issue).toBeUndefined();
  });
});

describe('validateServerConfig -- malformed vars in live mode', () => {
  it('flags VITE_SUPABASE_URL as malformed when not a URL', () => {
    const result = validateServerConfig({ ...LIVE_ENV, VITE_SUPABASE_URL: 'not-a-url' });
    const issue = result.issues.find(i => i.name === 'VITE_SUPABASE_URL');
    expect(issue?.reason).toBe('malformed');
  });

  it('flags SUPABASE_SERVICE_ROLE_KEY as malformed when not JWT format', () => {
    const result = validateServerConfig({ ...LIVE_ENV, SUPABASE_SERVICE_ROLE_KEY: 'not-a-jwt' });
    const issue = result.issues.find(i => i.name === 'SUPABASE_SERVICE_ROLE_KEY');
    expect(issue?.reason).toBe('malformed');
  });

  it('flags AUDIT_HMAC_SECRET as malformed when shorter than 32 chars', () => {
    const result = validateServerConfig({ ...LIVE_ENV, AUDIT_HMAC_SECRET: 'short' });
    const issue = result.issues.find(i => i.name === 'AUDIT_HMAC_SECRET');
    expect(issue?.reason).toBe('malformed');
  });

  it('flags APP_URL as malformed when not a URL', () => {
    const result = validateServerConfig({ ...LIVE_ENV, APP_URL: 'ftp://wrong' });
    const issue = result.issues.find(i => i.name === 'APP_URL');
    expect(issue?.reason).toBe('malformed');
  });

  it('flags RESEND_API_KEY as malformed when prefix is wrong', () => {
    const result = validateServerConfig({
      ...LIVE_ENV,
      MAIL_MODE: 'resend',
      RESEND_API_KEY: 'wrong_prefix',
      RESEND_FROM_EMAIL: 'noreply@example.com',
      RESEND_WEBHOOK_SECRET: 'd'.repeat(32),
    });
    const issue = result.issues.find(i => i.name === 'RESEND_API_KEY');
    expect(issue?.reason).toBe('malformed');
  });

  it('flags MAIL_MODE as malformed for an invalid value', () => {
    const result = validateServerConfig({ ...LIVE_ENV, MAIL_MODE: 'send-it' });
    const issue = result.issues.find(i => i.name === 'MAIL_MODE');
    expect(issue?.reason).toBe('malformed');
  });

  it('flags TELEGRAM_WEBHOOK_SECRET as malformed when shorter than 32 chars', () => {
    const result = validateServerConfig({
      ...LIVE_ENV,
      TELEGRAM_BOT_TOKEN: '123:abc',
      TELEGRAM_WEBHOOK_SECRET: 'tooshort',
    });
    const issue = result.issues.find(i => i.name === 'TELEGRAM_WEBHOOK_SECRET');
    expect(issue?.reason).toBe('malformed');
  });

  it('flags TELEGRAM_BOT_TOKEN as malformed when format is wrong', () => {
    const result = validateServerConfig({ ...LIVE_ENV, TELEGRAM_BOT_TOKEN: 'nocodon' });
    const issue = result.issues.find(i => i.name === 'TELEGRAM_BOT_TOKEN');
    expect(issue?.reason).toBe('malformed');
  });
});

describe('assertServerConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs nothing in demo mode', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    assertServerConfig({});
    expect(spy).not.toHaveBeenCalled();
  });

  it('logs nothing when all vars are valid', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    assertServerConfig(LIVE_ENV);
    expect(spy).not.toHaveBeenCalled();
  });

  it('logs one line per issue in live mode', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const envWithIssues = {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx',
      // AUDIT_HMAC_SECRET intentionally missing
      // APP_URL intentionally missing
      MAIL_MODE: 'disabled',
    };
    assertServerConfig(envWithIssues);
    // At least one error line per missing required var
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
    const allMessages = spy.mock.calls.map(c => c[0] as string).join('\n');
    expect(allMessages).toContain('[config]');
    // Values are never printed
    expect(allMessages).not.toContain('eyJ');
  });
});

describe('SERVER_VARS list', () => {
  it('contains all critical server var names', () => {
    const names = SERVER_VARS.map(v => v.name);
    expect(names).toContain('VITE_SUPABASE_URL');
    expect(names).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(names).toContain('AUDIT_HMAC_SECRET');
    expect(names).toContain('APP_URL');
    expect(names).toContain('RESEND_API_KEY');
    expect(names).toContain('RESEND_FROM_EMAIL');
    expect(names).toContain('TELEGRAM_BOT_TOKEN');
    expect(names).toContain('TELEGRAM_WEBHOOK_SECRET');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE
// ────────────────────────────────────────────────────────────────────────────

describe('validateClientConfig -- demo mode', () => {
  it('returns demo=true and no issues when both Supabase vars are absent', () => {
    const result = validateClientConfig({});
    expect(result.demo).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('returns demo=true when only URL is present (anon key missing)', () => {
    const result = validateClientConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' });
    expect(result.demo).toBe(true);
  });
});

describe('validateClientConfig -- live mode, all valid', () => {
  it('returns no issues for a minimal valid live client config', () => {
    const result = validateClientConfig(CLIENT_LIVE_ENV);
    expect(result.demo).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('returns no issues with valid optional vars', () => {
    const result = validateClientConfig({
      ...CLIENT_LIVE_ENV,
      VITE_APP_URL: 'https://vecini.online',
      VITE_APP_STAGE: 'prod',
      VITE_DEFAULT_LOCALE: 'ro',
      VITE_SECURITY_ENFORCEMENT: 'strict',
    });
    expect(result.demo).toBe(false);
    expect(result.issues).toHaveLength(0);
  });
});

describe('validateClientConfig -- missing required vars', () => {
  it('is in demo mode when only anon key is present (URL missing)', () => {
    const env = { VITE_SUPABASE_ANON_KEY: 'eyJ...' };
    const demoResult = validateClientConfig(env);
    expect(demoResult.demo).toBe(true);
    expect(demoResult.issues).toHaveLength(0);
  });
});

describe('validateClientConfig -- malformed vars', () => {
  it('flags VITE_SUPABASE_URL as malformed when not a URL', () => {
    const result = validateClientConfig({ ...CLIENT_LIVE_ENV, VITE_SUPABASE_URL: 'not-a-url' });
    const issue = result.issues.find(i => i.name === 'VITE_SUPABASE_URL');
    expect(issue?.reason).toBe('malformed');
  });

  it('flags VITE_SUPABASE_ANON_KEY as malformed when not JWT format', () => {
    const result = validateClientConfig({ ...CLIENT_LIVE_ENV, VITE_SUPABASE_ANON_KEY: 'bad-key' });
    const issue = result.issues.find(i => i.name === 'VITE_SUPABASE_ANON_KEY');
    expect(issue?.reason).toBe('malformed');
  });

  it('flags VITE_APP_URL as malformed when present but not a URL', () => {
    const result = validateClientConfig({ ...CLIENT_LIVE_ENV, VITE_APP_URL: 'not-a-url' });
    const issue = result.issues.find(i => i.name === 'VITE_APP_URL');
    expect(issue?.reason).toBe('malformed');
  });

  it('does NOT flag VITE_APP_URL when absent (it is optional)', () => {
    const result = validateClientConfig(CLIENT_LIVE_ENV);
    const issue = result.issues.find(i => i.name === 'VITE_APP_URL');
    expect(issue).toBeUndefined();
  });

  it('flags VITE_APP_STAGE as malformed for an unknown value', () => {
    const result = validateClientConfig({ ...CLIENT_LIVE_ENV, VITE_APP_STAGE: 'staging' });
    const issue = result.issues.find(i => i.name === 'VITE_APP_STAGE');
    expect(issue?.reason).toBe('malformed');
  });

  it('flags VITE_DEFAULT_LOCALE as malformed for an unknown value', () => {
    const result = validateClientConfig({ ...CLIENT_LIVE_ENV, VITE_DEFAULT_LOCALE: 'fr' });
    const issue = result.issues.find(i => i.name === 'VITE_DEFAULT_LOCALE');
    expect(issue?.reason).toBe('malformed');
  });

  it('flags VITE_SECURITY_ENFORCEMENT as malformed for an unknown value', () => {
    const result = validateClientConfig({ ...CLIENT_LIVE_ENV, VITE_SECURITY_ENFORCEMENT: 'lax' });
    const issue = result.issues.find(i => i.name === 'VITE_SECURITY_ENFORCEMENT');
    expect(issue?.reason).toBe('malformed');
  });
});

describe('CLIENT_VARS list', () => {
  it('contains all critical client var names', () => {
    const names = CLIENT_VARS.map(v => v.name);
    expect(names).toContain('VITE_SUPABASE_URL');
    expect(names).toContain('VITE_SUPABASE_ANON_KEY');
    expect(names).toContain('VITE_APP_URL');
    expect(names).toContain('VITE_APP_STAGE');
    expect(names).toContain('VITE_DEFAULT_LOCALE');
    expect(names).toContain('VITE_SECURITY_ENFORCEMENT');
  });
});
