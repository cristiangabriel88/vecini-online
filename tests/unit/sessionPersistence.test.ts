import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ABSOLUTE_CAP_MS,
  isRemembered,
  rememberExpired,
  rememberStorage,
  setRemembered,
} from '@/features/auth/sessionPersistence';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('remember flag', () => {
  it('defaults to not remembered (the secure default)', () => {
    expect(isRemembered()).toBe(false);
  });

  it('persists and clears the choice', () => {
    setRemembered(true);
    expect(isRemembered()).toBe(true);
    setRemembered(false);
    expect(isRemembered()).toBe(false);
  });
});

describe('absolute cap', () => {
  afterEach(() => vi.useRealTimers());

  it('is not expired right after opting in', () => {
    setRemembered(true);
    expect(rememberExpired()).toBe(false);
  });

  it('expires once the cap elapses', () => {
    vi.useFakeTimers();
    const start = new Date('2026-01-01T00:00:00Z').getTime();
    vi.setSystemTime(start);
    setRemembered(true);
    vi.setSystemTime(start + ABSOLUTE_CAP_MS + 1_000);
    expect(rememberExpired()).toBe(true);
  });

  it('never expires when not remembered', () => {
    expect(rememberExpired()).toBe(false);
  });
});

describe('storage routing', () => {
  it('writes a non-remembered session to sessionStorage only', () => {
    setRemembered(false);
    rememberStorage.setItem('sb-token', 'abc');
    expect(sessionStorage.getItem('sb-token')).toBe('abc');
    expect(localStorage.getItem('sb-token')).toBeNull();
    expect(rememberStorage.getItem('sb-token')).toBe('abc');
  });

  it('writes a remembered session to localStorage only', () => {
    setRemembered(true);
    rememberStorage.setItem('sb-token', 'xyz');
    expect(localStorage.getItem('sb-token')).toBe('xyz');
    expect(sessionStorage.getItem('sb-token')).toBeNull();
    expect(rememberStorage.getItem('sb-token')).toBe('xyz');
  });

  it('finds an existing localStorage session, then migrates it to sessionStorage', () => {
    localStorage.setItem('sb-token', 'old');
    setRemembered(false);
    // Reads consult both stores, so a pre-existing session stays signed in.
    expect(rememberStorage.getItem('sb-token')).toBe('old');
    // The next write (e.g. token refresh) moves it to the non-remembered store.
    rememberStorage.setItem('sb-token', 'new');
    expect(sessionStorage.getItem('sb-token')).toBe('new');
    expect(localStorage.getItem('sb-token')).toBeNull();
  });

  it('removeItem clears both stores', () => {
    localStorage.setItem('k', '1');
    sessionStorage.setItem('k', '2');
    rememberStorage.removeItem('k');
    expect(localStorage.getItem('k')).toBeNull();
    expect(sessionStorage.getItem('k')).toBeNull();
  });
});
