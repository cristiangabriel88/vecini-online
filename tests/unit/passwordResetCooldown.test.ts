import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  COOLDOWN_MS,
  clearResetCooldown,
  isOnCooldown,
  recordResetRequest,
  remainingCooldownMs,
} from '@/features/auth/passwordResetCooldown';

const EMAIL = 'ana@vecini.ro';
const NOW = 1_000_000;

beforeEach(() => {
  clearResetCooldown(EMAIL);
  clearResetCooldown('  ANA@VECINI.RO  ');
});

afterEach(() => {
  clearResetCooldown(EMAIL);
});

describe('remainingCooldownMs', () => {
  it('returns 0 when no request recorded', () => {
    expect(remainingCooldownMs(EMAIL, NOW)).toBe(0);
  });

  it('returns positive ms immediately after request', () => {
    recordResetRequest(EMAIL, NOW);
    expect(remainingCooldownMs(EMAIL, NOW)).toBe(COOLDOWN_MS);
  });

  it('decrements as time passes', () => {
    recordResetRequest(EMAIL, NOW);
    expect(remainingCooldownMs(EMAIL, NOW + 10_000)).toBe(COOLDOWN_MS - 10_000);
  });

  it('returns 0 after the window expires', () => {
    recordResetRequest(EMAIL, NOW);
    expect(remainingCooldownMs(EMAIL, NOW + COOLDOWN_MS)).toBe(0);
    expect(remainingCooldownMs(EMAIL, NOW + COOLDOWN_MS + 1)).toBe(0);
  });
});

describe('isOnCooldown', () => {
  it('blocks a second request within the window', () => {
    recordResetRequest(EMAIL, NOW);
    expect(isOnCooldown(EMAIL, NOW + 1)).toBe(true);
  });

  it('allows a request after the window expires', () => {
    recordResetRequest(EMAIL, NOW);
    expect(isOnCooldown(EMAIL, NOW + COOLDOWN_MS + 1)).toBe(false);
  });
});

describe('normalisation', () => {
  it('treats differently-cased and padded emails as the same key', () => {
    recordResetRequest('  ANA@VECINI.RO  ', NOW);
    expect(isOnCooldown(EMAIL, NOW)).toBe(true);
  });
});

describe('persistence via sessionStorage', () => {
  it('survives a simulated re-render (reads from sessionStorage)', () => {
    recordResetRequest(EMAIL, NOW);
    // Reading fresh from sessionStorage (no in-memory state) should still see cooldown.
    expect(remainingCooldownMs(EMAIL, NOW + 5_000)).toBeGreaterThan(0);
  });

  it('clearResetCooldown removes the entry', () => {
    recordResetRequest(EMAIL, NOW);
    clearResetCooldown(EMAIL);
    expect(isOnCooldown(EMAIL, NOW)).toBe(false);
  });
});
