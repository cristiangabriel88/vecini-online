import { describe, expect, it } from 'vitest';
import {
  MIN_POLICY_LENGTH,
  characterClasses,
  evaluatePassword,
  isBreachedPassword,
} from '@/features/auth/passwordPolicy';

describe('characterClasses', () => {
  it('counts the distinct character classes used', () => {
    expect(characterClasses('abcdef')).toBe(1);
    expect(characterClasses('abc123')).toBe(2);
    expect(characterClasses('Abc123')).toBe(3);
    expect(characterClasses('Abc123!')).toBe(4);
  });
});

describe('isBreachedPassword', () => {
  it.each(['password', 'Password123', '12345678', 'qwerty', 'parola', 'letmein'])(
    'rejects the common password %p',
    (pw) => {
      expect(isBreachedPassword(pw)).toBe(true);
    },
  );

  it('catches a blocklisted base with trailing digits', () => {
    expect(isBreachedPassword('parola2024')).toBe(true);
    expect(isBreachedPassword('letmein99')).toBe(true);
  });

  it('normalises separators before comparing', () => {
    expect(isBreachedPassword('qwerty-123')).toBe(true);
    expect(isBreachedPassword('let.me.in')).toBe(true);
  });

  it('accepts an uncommon password', () => {
    expect(isBreachedPassword('turbina-verde-78')).toBe(false);
  });
});

describe('evaluatePassword', () => {
  it('passes a strong, varied password', () => {
    const r = evaluatePassword('Munte-Albastru-91');
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.strength).toBe('strong');
  });

  it('flags a too-short password', () => {
    const r = evaluatePassword('Ab1!');
    expect(r.ok).toBe(false);
    expect(r.issues).toContain('tooShort');
  });

  it('flags a password with no variety', () => {
    const r = evaluatePassword('aaaaaaaaaaaa');
    expect(r.ok).toBe(false);
    expect(r.issues).toContain('noVariety');
  });

  it('flags a breached password and forces the score to zero', () => {
    const r = evaluatePassword('password123');
    expect(r.ok).toBe(false);
    expect(r.issues).toContain('breached');
    expect(r.score).toBe(0);
    expect(r.strength).toBe('weak');
  });

  it('rejects a password that echoes the email local-part', () => {
    const r = evaluatePassword('anapopescu2026', 'anapopescu@vecini.online');
    expect(r.ok).toBe(false);
    expect(r.issues).toContain('containsEmail');
  });

  it('rejects a password longer than the bcrypt limit', () => {
    const r = evaluatePassword('A1!'.repeat(40));
    expect(r.ok).toBe(false);
    expect(r.issues).toContain('tooLong');
  });

  it('treats the minimum length as the boundary', () => {
    const atMin = 'Ab1' + 'x'.repeat(MIN_POLICY_LENGTH - 3);
    expect(atMin.length).toBe(MIN_POLICY_LENGTH);
    expect(evaluatePassword(atMin).issues).not.toContain('tooShort');
  });
});
