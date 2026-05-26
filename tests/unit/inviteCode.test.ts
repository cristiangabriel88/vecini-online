import { describe, expect, it } from 'vitest';
import {
  buildOnboardingLink,
  generateInviteCode,
  generateInviteToken,
  isValidInviteCodeFormat,
  isValidInviteToken,
  normalizeInviteCode,
  normalizeInviteToken,
} from '@/shared/lib/inviteCode';

describe('inviteCode', () => {
  it('generates 8-character codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z2-9]{8}$/);
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it('is deterministic given a seeded rng', () => {
    const seeded = () => {
      const seq = [0.1, 0.5, 0.9, 0.2, 0.7, 0.3, 0.8, 0.05];
      let i = 0;
      return () => seq[i++ % seq.length];
    };
    expect(generateInviteCode(seeded())).toBe(generateInviteCode(seeded()));
  });

  it('validates code format', () => {
    expect(isValidInviteCodeFormat('AB23CD45')).toBe(true);
    expect(isValidInviteCodeFormat('ab23cd45')).toBe(true);
    expect(isValidInviteCodeFormat('AB23CD4')).toBe(false);
    expect(isValidInviteCodeFormat('AB01CD45')).toBe(false);
  });

  it('normalises user input', () => {
    expect(normalizeInviteCode(' ab23-cd45 ')).toBe('AB23CD45');
  });
});

describe('inviteToken', () => {
  it('generates 64-char lower-case hex tokens', () => {
    for (let i = 0; i < 50; i++) {
      const token = generateInviteToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('produces distinct tokens across calls (high entropy)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(generateInviteToken());
    expect(seen.size).toBe(100);
  });

  it('is deterministic given a seeded fill', () => {
    const seededFill = (bytes: Uint8Array) => {
      for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 7) % 256;
    };
    expect(generateInviteToken(seededFill)).toBe(generateInviteToken(seededFill));
  });

  it('validates and normalises token shape', () => {
    const token = generateInviteToken();
    expect(isValidInviteToken(token)).toBe(true);
    expect(isValidInviteToken(token.toUpperCase())).toBe(true);
    expect(isValidInviteToken(`  ${token}  `)).toBe(true);
    expect(isValidInviteToken('short')).toBe(false);
    expect(isValidInviteToken('z'.repeat(64))).toBe(false);
    expect(normalizeInviteToken(`  ${'A'.repeat(64)} `)).toBe('a'.repeat(64));
  });
});

describe('buildOnboardingLink', () => {
  it('joins base URL, redeem path and url-encoded token', () => {
    expect(buildOnboardingLink('https://app.vecini.online', 'abc123')).toBe(
      'https://app.vecini.online/onboarding/alatura?token=abc123',
    );
  });

  it('strips trailing slashes from the base URL', () => {
    expect(buildOnboardingLink('https://app.vecini.online///', 'tok')).toBe(
      'https://app.vecini.online/onboarding/alatura?token=tok',
    );
  });
});
