import { describe, expect, it } from 'vitest';
import {
  AUTH_EVENT_TYPES,
  buildAuthEvent,
  redactEmail,
} from '@/features/auth/authAudit';

describe('redactEmail', () => {
  it('keeps the first character and domain, masks the rest', () => {
    expect(redactEmail('ana.popescu@vecini.online')).toBe('a***@vecini.online');
  });

  it('lower-cases the surviving parts', () => {
    expect(redactEmail('Ana@Vecini.RO')).toBe('a***@vecini.ro');
  });

  it('returns null for missing or malformed input', () => {
    expect(redactEmail(null)).toBeNull();
    expect(redactEmail(undefined)).toBeNull();
    expect(redactEmail('')).toBeNull();
    expect(redactEmail('no-at-sign')).toBeNull();
    expect(redactEmail('@vecini.ro')).toBeNull();
    expect(redactEmail('ana@')).toBeNull();
  });

  it('never echoes the full local-part', () => {
    const masked = redactEmail('presedinte@asociatia.ro');
    expect(masked).not.toContain('presedinte');
  });
});

describe('buildAuthEvent', () => {
  it('stamps the type, an ISO time and a redacted email', () => {
    const at = new Date('2026-05-22T10:30:00.000Z');
    const event = buildAuthEvent('login', 'ana@vecini.ro', at);
    expect(event).toEqual({
      type: 'login',
      at: '2026-05-22T10:30:00.000Z',
      emailMask: 'a***@vecini.ro',
    });
  });

  it('carries a null mask when no email is given', () => {
    const event = buildAuthEvent('logout');
    expect(event.type).toBe('logout');
    expect(event.emailMask).toBeNull();
  });

  it('exposes a stable list of every event type', () => {
    expect(AUTH_EVENT_TYPES).toContain('loginFailed');
    expect(AUTH_EVENT_TYPES).toContain('passwordChanged');
    expect(new Set(AUTH_EVENT_TYPES).size).toBe(AUTH_EVENT_TYPES.length);
  });
});
