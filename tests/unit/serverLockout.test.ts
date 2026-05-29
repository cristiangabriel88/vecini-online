import { describe, expect, it } from 'vitest';
import { hashEmail, reconcileLockMs } from '@/features/auth/serverLockout';

describe('reconcileLockMs', () => {
  it('returns 0 when both are 0', () => {
    expect(reconcileLockMs(0, 0)).toBe(0);
  });

  it('returns client lock when server is 0', () => {
    expect(reconcileLockMs(5000, 0)).toBe(5000);
  });

  it('returns server lock when client is 0', () => {
    expect(reconcileLockMs(0, 3000)).toBe(3000);
  });

  it('returns the larger when server is greater', () => {
    expect(reconcileLockMs(5000, 8000)).toBe(8000);
  });

  it('returns the larger when client is greater', () => {
    expect(reconcileLockMs(9000, 3000)).toBe(9000);
  });

  it('floors negative values to 0', () => {
    expect(reconcileLockMs(-100, 0)).toBe(0);
    expect(reconcileLockMs(0, -50)).toBe(0);
  });
});

describe('hashEmail', () => {
  it('returns a 64-character hex string', async () => {
    const hash = await hashEmail('user@example.com');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('normalises case so the same email always hashes the same', async () => {
    const h1 = await hashEmail('Test@Example.COM');
    const h2 = await hashEmail('test@example.com');
    expect(h1).toBe(h2);
  });

  it('strips surrounding whitespace before hashing', async () => {
    const h1 = await hashEmail('  user@example.com  ');
    const h2 = await hashEmail('user@example.com');
    expect(h1).toBe(h2);
  });

  it('returns different hashes for different emails', async () => {
    const h1 = await hashEmail('alice@example.com');
    const h2 = await hashEmail('bob@example.com');
    expect(h1).not.toBe(h2);
  });
});
