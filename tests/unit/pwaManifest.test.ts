import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const manifestPath = join(process.cwd(), 'public', 'manifest.webmanifest');

describe('PWA manifest (T227)', () => {
  it('manifest file exists', () => {
    expect(existsSync(manifestPath)).toBe(true);
  });

  it('required fields are present', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest.name).toBe('vecini.online');
    expect(manifest.short_name).toBe('Vecini');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();
  });

  it('icons array is non-empty', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('start_url is /app', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest.start_url).toBe('/app');
  });
});
