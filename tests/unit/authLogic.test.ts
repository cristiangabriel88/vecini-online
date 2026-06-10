import { describe, expect, it } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  canSubmit,
  isValidEmail,
  mapAuthError,
  validatePassword,
} from '@/features/auth/authLogic';

describe('email validation', () => {
  it('accepts a well-formed address', () => {
    expect(isValidEmail('ana.popescu@vecini.online')).toBe(true);
  });

  it('trims surrounding whitespace before checking', () => {
    expect(isValidEmail('  ana@vecini.ro  ')).toBe(true);
  });

  it.each(['', 'ana', 'ana@', 'ana@vecini', 'ana @vecini.ro', 'a@b', 'a@b.c'])(
    'rejects malformed address %p',
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );

  it('rejects a 1-char TLD (requires 2+ chars)', () => {
    expect(isValidEmail('ana@vecini.x')).toBe(false);
    expect(isValidEmail('ana@vecini.ro')).toBe(true);
  });
});

describe('password validation', () => {
  it('rejects passwords shorter than the minimum', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe('tooShort');
  });

  it('accepts a password at the minimum length', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });
});

describe('canSubmit', () => {
  const base = { email: 'ana@vecini.ro', password: 'parola-buna', confirmPassword: 'parola-buna' };

  it('sign-in needs a valid email and a long-enough password', () => {
    expect(canSubmit('signIn', base)).toBe(true);
    expect(canSubmit('signIn', { ...base, email: 'bad' })).toBe(false);
    expect(canSubmit('signIn', { ...base, password: 'short' })).toBe(false);
  });

  it('forgot needs only a valid email', () => {
    expect(canSubmit('forgot', { email: 'ana@vecini.ro', password: '', confirmPassword: '' })).toBe(
      true,
    );
    expect(canSubmit('forgot', { email: 'bad', password: '', confirmPassword: '' })).toBe(false);
  });

  it('sign-up additionally requires matching passwords', () => {
    expect(canSubmit('signUp', base)).toBe(true);
    expect(canSubmit('signUp', { ...base, confirmPassword: 'altceva' })).toBe(false);
  });
});

describe('mapAuthError', () => {
  it.each([
    ['Invalid login credentials', 'invalidCredentials'],
    ['Email not confirmed', 'emailNotConfirmed'],
    ['User already registered', 'emailTaken'],
    ['Password should be at least 6 characters', 'weakPassword'],
    ['For security purposes, you can only request this after 60 seconds', 'rateLimited'],
    ['New password should be different from the old password.', 'samePassword'],
  ] as const)('maps %p to %p', (message, key) => {
    expect(mapAuthError(message)).toBe(key);
  });

  it('falls back to generic for empty or unknown messages', () => {
    expect(mapAuthError(null)).toBe('generic');
    expect(mapAuthError('')).toBe('generic');
    expect(mapAuthError('some unexpected backend failure')).toBe('generic');
  });

  it('matches case-insensitively', () => {
    expect(mapAuthError('INVALID LOGIN CREDENTIALS')).toBe('invalidCredentials');
  });
});
