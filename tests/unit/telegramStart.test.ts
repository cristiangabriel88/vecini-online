import { describe, expect, it } from 'vitest';
import {
  parseStartCommand,
  payloadLooksLikeCode,
  normalizeStartPayload,
  replyForStart,
  replyChecking,
} from '@/shared/lib/telegramStart';

describe('parseStartCommand', () => {
  it('parses a bare /start with no payload', () => {
    expect(parseStartCommand('/start')).toEqual({ payload: null });
  });

  it('extracts the deep-link payload after /start', () => {
    expect(parseStartCommand('/start AB23CD45')).toEqual({ payload: 'AB23CD45' });
  });

  it('tolerates surrounding whitespace and a @botusername suffix', () => {
    expect(parseStartCommand('  /start@vecini_bot   AB23CD45  ')).toEqual({
      payload: 'AB23CD45',
    });
  });

  it('treats /start with only whitespace after it as no payload', () => {
    expect(parseStartCommand('/start    ')).toEqual({ payload: null });
  });

  it('is case-insensitive on the command', () => {
    expect(parseStartCommand('/START code1234')).toEqual({ payload: 'code1234' });
  });

  it('returns null for any non-/start text', () => {
    expect(parseStartCommand('/menu')).toBeNull();
    expect(parseStartCommand('hello there')).toBeNull();
    expect(parseStartCommand('/started')).toBeNull();
    expect(parseStartCommand('')).toBeNull();
  });
});

describe('payload helpers', () => {
  it('normalises a payload to the canonical code form', () => {
    expect(normalizeStartPayload(' ab23-cd45 ')).toBe('AB23CD45');
  });

  it('recognises a well-formed code and rejects junk', () => {
    expect(payloadLooksLikeCode('AB23CD45')).toBe(true);
    expect(payloadLooksLikeCode('not-a-code')).toBe(false);
    expect(payloadLooksLikeCode('SHORT')).toBe(false);
  });
});

describe('replyForStart', () => {
  it('returns a distinct Romanian reply for each outcome', () => {
    const noCode = replyForStart('no-code');
    const unknown = replyForStart('unknown');
    const expired = replyForStart('expired');
    const used = replyForStart('used');
    const revoked = replyForStart('revoked');
    const linked = replyForStart('linked');
    const already = replyForStart('already-linked');
    const all = [noCode, unknown, expired, used, revoked, linked, already];
    // Every reply is non-empty and they are all distinct.
    expect(all.every((r) => r.length > 0)).toBe(true);
    expect(new Set(all).size).toBe(all.length);
  });

  it('greets by name when provided on the linked/already-linked replies', () => {
    expect(replyForStart('linked', { name: 'Ana' })).toContain(', Ana');
    expect(replyForStart('already-linked', { name: 'Ana' })).toContain(', Ana');
    expect(replyForStart('linked')).not.toContain(', ');
  });

  it('echoes the code in the checking acknowledgement', () => {
    expect(replyChecking('AB23CD45')).toContain('AB23CD45');
  });
});
