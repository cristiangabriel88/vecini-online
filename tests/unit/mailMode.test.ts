import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// T175 -- MAIL_MODE env routing in the invite-email function.
//
// These static-analysis tests verify that:
//  1. getMailMode() in resend.ts reads MAIL_MODE and returns the right type.
//  2. invite-email.ts branches on getMailMode(), not just isResendConfigured().
//  3. The 'disabled' branch returns immediately before any DB or Resend call.
//  4. The 'log' branch writes to email_outbox without calling sendEmail.

const RESEND_PATH = resolve(process.cwd(), 'netlify', 'functions', '_shared', 'resend.ts');
const INVITE_EMAIL_PATH = resolve(process.cwd(), 'netlify', 'functions', 'invite-email.ts');

describe('getMailMode (resend.ts)', () => {
  const src = readFileSync(RESEND_PATH, 'utf8');

  it('exports getMailMode', () => {
    expect(src).toContain('export function getMailMode');
  });

  it('reads MAIL_MODE env var', () => {
    expect(src).toContain('process.env.MAIL_MODE');
  });

  it('recognises log and disabled modes', () => {
    expect(src).toContain("'log'");
    expect(src).toContain("'disabled'");
  });

  it('falls back to resend for unknown values', () => {
    expect(src).toContain("return 'resend'");
  });
});

describe('invite-email.ts: mail mode branching', () => {
  const src = readFileSync(INVITE_EMAIL_PATH, 'utf8');

  it('imports getMailMode', () => {
    expect(src).toContain('getMailMode');
  });

  it('returns 200 for disabled mode before any DB write', () => {
    expect(src).toContain("'mail_disabled'");
    const disabledIdx = src.indexOf('mail_disabled');
    // The first supabaseAdmin() call in the function body (past imports) writes
    // to email_outbox. The disabled early-return must appear before that call.
    const dbWriteIdx = src.indexOf("from('email_outbox')");
    expect(disabledIdx).toBeLessThan(dbWriteIdx);
  });

  it('writes to email_outbox in log mode', () => {
    expect(src).toContain('email_outbox');
    expect(src).toContain("logged: true");
  });

  it('does not call sendEmail in log branch', () => {
    const logIdx = src.indexOf("mailMode === 'log'");
    const sendEmailIdx = src.indexOf('sendEmail(');
    // sendEmail call must be after the log branch
    expect(logIdx).toBeGreaterThan(-1);
    expect(sendEmailIdx).toBeGreaterThan(logIdx);
  });
});
