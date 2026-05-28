import { describe, it, expect, afterEach, vi } from 'vitest';
import { getMailMode } from '../../netlify/functions/_shared/resend';

describe('getMailMode', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns resend by default when MAIL_MODE is unset', () => {
    vi.stubEnv('MAIL_MODE', undefined as unknown as string);
    expect(getMailMode()).toBe('resend');
  });

  it('returns log when MAIL_MODE=log', () => {
    vi.stubEnv('MAIL_MODE', 'log');
    expect(getMailMode()).toBe('log');
  });

  it('returns disabled when MAIL_MODE=disabled', () => {
    vi.stubEnv('MAIL_MODE', 'disabled');
    expect(getMailMode()).toBe('disabled');
  });

  it('falls back to resend for an unknown value', () => {
    vi.stubEnv('MAIL_MODE', 'smtp');
    expect(getMailMode()).toBe('resend');
  });

  it('falls back to resend for an empty string', () => {
    vi.stubEnv('MAIL_MODE', '');
    expect(getMailMode()).toBe('resend');
  });
});
