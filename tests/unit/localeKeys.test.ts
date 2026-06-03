import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function flatKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return [prefix];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    keys.push(...flatKeys(v, path));
  }
  return keys;
}

const localesDir = join(process.cwd(), 'src', 'shared', 'locales');
const en = JSON.parse(readFileSync(join(localesDir, 'en.json'), 'utf8')) as unknown;
const ro = JSON.parse(readFileSync(join(localesDir, 'ro.json'), 'utf8')) as unknown;

const enKeys = new Set(flatKeys(en));
const roKeys = new Set(flatKeys(ro));

const missingFromEn = [...roKeys].filter((k) => !enKeys.has(k));
const missingFromRo = [...enKeys].filter((k) => !roKeys.has(k));

describe('locale key parity (T202)', () => {
  it('en.json has a meaningful number of keys', () => {
    expect(enKeys.size).toBeGreaterThan(2000);
  });

  it('ro.json has a meaningful number of keys', () => {
    expect(roKeys.size).toBeGreaterThan(2000);
  });

  it('en.json contains every key present in ro.json', () => {
    expect(missingFromEn).toEqual([]);
  });

  it('ro.json contains every key present in en.json', () => {
    expect(missingFromRo).toEqual([]);
  });
});
