import { describe, expect, it } from 'vitest';
import {
  generateInviteCode,
  isValidInviteCodeFormat,
  normalizeInviteCode,
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
