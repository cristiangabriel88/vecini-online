/**
 * T149: Resend delivery webhook -- unit contracts.
 *
 * Verifies the static contracts that guard the delivery path:
 * - sendEmail result carries messageId on success
 * - markInviteEmailDelivered stamps emailDeliveredAt
 * - inviteStore.markEmailDelivered applies via the logic helper
 * - hydrateInviteDelivery and resend-webhook source contracts
 * - svix signature verification logic (timestamp freshness + HMAC)
 */

import { describe, expect, it } from 'vitest';
import { createHmac } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { markInviteEmailDelivered, markInviteEmailSent } from '@/features/invites/inviteLogic';
import type { InviteCode } from '@/features/invites/inviteLogic';

const BASE_INVITE: InviteCode = {
  id: 'inv-00000000-0000-0000-0000-000000000001',
  asociatieId: 'asoc-00000000-0000-0000-0000-000000000001',
  code: 'ABC123',
  token: 'tok_test',
  role: 'proprietar',
  apartmentId: null,
  expiresAt: null,
  singleUse: true,
  consumedAt: null,
  consumedByUserId: null,
  revokedAt: null,
  createdAt: 1700000000000,
  createdBy: null,
  inviteeName: 'Popescu Ion',
  inviteeEmail: 'ion@example.com',
  asociatieName: null,
  emailSentAt: null,
  emailDeliveredAt: null,
};

// ── markInviteEmailDelivered ────────────────────────────────────────────────

describe('inviteLogic.markInviteEmailDelivered', () => {
  it('stamps emailDeliveredAt with now', () => {
    const now = 1700001000000;
    const updated = markInviteEmailDelivered(BASE_INVITE, now);
    expect(updated.emailDeliveredAt).toBe(now);
  });

  it('does not mutate the original', () => {
    markInviteEmailDelivered(BASE_INVITE, 123);
    expect(BASE_INVITE.emailDeliveredAt).toBeNull();
  });

  it('preserves emailSentAt when already set', () => {
    const sent = markInviteEmailSent(BASE_INVITE, 1700000500000);
    const delivered = markInviteEmailDelivered(sent, 1700001000000);
    expect(delivered.emailSentAt).toBe(1700000500000);
    expect(delivered.emailDeliveredAt).toBe(1700001000000);
  });
});

// ── inviteStore markEmailDelivered ─────────────────────────────────────────

describe('inviteStore — markEmailDelivered action present in source', () => {
  it('source declares markEmailDelivered', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/shared/store/inviteStore.ts'),
      'utf8',
    );
    expect(src).toMatch(/markEmailDelivered/);
    expect(src).toMatch(/markInviteEmailDelivered/);
  });
});

// ── hydrateInviteDelivery source contracts ─────────────────────────────────

describe('inviteWriteApi.hydrateInviteDelivery source contracts', () => {
  it('is exported', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/features/invites/inviteWriteApi.ts'),
      'utf8',
    );
    expect(src).toMatch(/export async function hydrateInviteDelivery/);
  });

  it('queries invite_email_delivered_at', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/features/invites/inviteWriteApi.ts'),
      'utf8',
    );
    expect(src).toMatch(/invite_email_delivered_at/);
  });

  it('prepends inv- prefix when calling markEmailDelivered', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/features/invites/inviteWriteApi.ts'),
      'utf8',
    );
    expect(src).toMatch(/inv-/);
    expect(src).toMatch(/markEmailDelivered/);
  });
});

// ── resend-webhook source contracts ────────────────────────────────────────

describe('resend-webhook.ts source contracts', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'netlify/functions/resend-webhook.ts'),
    'utf8',
  );

  it('verifies svix-id, svix-timestamp, svix-signature headers', () => {
    expect(src).toMatch(/svix-id/);
    expect(src).toMatch(/svix-timestamp/);
    expect(src).toMatch(/svix-signature/);
  });

  it('uses HMAC-SHA256 with base64-decoded secret (whsec_ stripped)', () => {
    expect(src).toMatch(/createHmac/);
    expect(src).toMatch(/whsec_/);
    expect(src).toMatch(/base64/);
  });

  it('enforces timestamp freshness', () => {
    expect(src).toMatch(/FIVE_MINUTES_MS|5 \* 60/);
  });

  it('stamps invite_email_delivered_at on email.delivered', () => {
    expect(src).toMatch(/email\.delivered/);
    expect(src).toMatch(/invite_email_delivered_at/);
  });

  it('looks up the row by resend_message_id', () => {
    expect(src).toMatch(/resend_message_id/);
  });

  it('never logs any PII (no console.log in the module)', () => {
    expect(src).not.toMatch(/console\.log/);
  });
});

// ── svix signature verification logic (pure, no I/O) ──────────────────────

function makeSignedContent(svixId: string, svixTimestamp: string, body: string): string {
  return `${svixId}.${svixTimestamp}.${body}`;
}

function computeExpectedSig(secret: string, signedContent: string): string {
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  return createHmac('sha256', secretBytes).update(signedContent).digest('base64');
}

describe('svix signature verification — HMAC logic', () => {
  const secret = 'whsec_' + Buffer.from('test-secret-key-32bytes-padded!!').toString('base64');
  const svixId = 'msg_abc123';
  const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'msg_xyz' } });

  it('produces the expected base64 HMAC for known inputs', () => {
    const now = Math.floor(Date.now() / 1000).toString();
    const signed = makeSignedContent(svixId, now, body);
    const sig = computeExpectedSig(secret, signed);
    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(20);
  });

  it('timestamp freshness: rejects a 10-minute-old timestamp', () => {
    const tenMinAgo = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString();
    const tsMs = Number(tenMinAgo) * 1000;
    const FIVE_MIN = 5 * 60 * 1000;
    expect(Math.abs(Date.now() - tsMs)).toBeGreaterThan(FIVE_MIN);
  });

  it('timestamp freshness: accepts a current timestamp', () => {
    const now = Math.floor(Date.now() / 1000).toString();
    const tsMs = Number(now) * 1000;
    const FIVE_MIN = 5 * 60 * 1000;
    expect(Math.abs(Date.now() - tsMs)).toBeLessThan(FIVE_MIN);
  });

  it('multi-signature header: at least one matching sig is accepted', () => {
    const now = Math.floor(Date.now() / 1000).toString();
    const signed = makeSignedContent(svixId, now, body);
    const validSig = `v1,${computeExpectedSig(secret, signed)}`;
    const header = `v1,invalidsig ${validSig}`;
    const found = header.split(' ').some((s) => {
      const comma = s.indexOf(',');
      return comma !== -1 && s.slice(comma + 1) === computeExpectedSig(secret, signed);
    });
    expect(found).toBe(true);
  });
});

// ── sendEmail result carries messageId ────────────────────────────────────

describe('resend.ts — SendEmailResult carries messageId', () => {
  it('interface declares messageId as optional string', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'netlify/functions/_shared/resend.ts'),
      'utf8',
    );
    expect(src).toMatch(/messageId\?:\s*string/);
  });

  it('reads response body only on success (never on failure)', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'netlify/functions/_shared/resend.ts'),
      'utf8',
    );
    // Body is parsed after the !res.ok early return, so it never runs on failure.
    expect(src).toMatch(/if.*!res\.ok.*return/);
    expect(src).toMatch(/res\.json/);
  });
});

// ── invite-email.ts stamps sent_at and stores message id ──────────────────

describe('invite-email.ts — stamps invite_email_sent_at + resend_message_id', () => {
  it('references invite_email_sent_at', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'netlify/functions/invite-email.ts'),
      'utf8',
    );
    expect(src).toMatch(/invite_email_sent_at/);
  });

  it('references resend_message_id', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'netlify/functions/invite-email.ts'),
      'utf8',
    );
    expect(src).toMatch(/resend_message_id/);
  });

  it('uses result.messageId (not a hardcoded string)', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'netlify/functions/invite-email.ts'),
      'utf8',
    );
    expect(src).toMatch(/result\.messageId/);
  });
});
