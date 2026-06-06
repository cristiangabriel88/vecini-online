import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Service worker registration (T263)', () => {
  it('vite.config includes VitePWA plugin', () => {
    const config = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');
    expect(config).toContain('VitePWA');
    expect(config).toContain("registerType: 'prompt'");
    expect(config).toContain("injectRegister: null");
  });

  it('VitePWA uses selfDestroying for DEV stage', () => {
    const config = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');
    expect(config).toContain('selfDestroying: true');
    expect(config).toContain('isDevStage');
  });

  it('workbox navigateFallback excludes platform routes', () => {
    const config = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');
    expect(config).toContain('navigateFallback');
    expect(config).toContain('/platform');
  });

  it('devOptions disables SW in the dev server', () => {
    const config = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');
    expect(config).toContain("devOptions: { enabled: false }");
  });

  it('UpdatePrompt component exists and exports a function', async () => {
    const src = readFileSync(
      join(process.cwd(), 'src', 'shared', 'components', 'UpdatePrompt.tsx'),
      'utf8',
    );
    expect(src).toContain('export function UpdatePrompt');
    expect(src).toContain('useRegisterSW');
    expect(src).toContain('needRefresh');
    expect(src).toContain('updateServiceWorker');
  });

  it('UpdatePrompt is wired into AppProviders', () => {
    const providers = readFileSync(
      join(process.cwd(), 'src', 'app', 'providers.tsx'),
      'utf8',
    );
    expect(providers).toContain('UpdatePrompt');
  });

  it('pwa locale keys present in both ro.json and en.json', () => {
    const ro = JSON.parse(
      readFileSync(join(process.cwd(), 'src', 'shared', 'locales', 'ro.json'), 'utf8'),
    ) as Record<string, unknown>;
    const en = JSON.parse(
      readFileSync(join(process.cwd(), 'src', 'shared', 'locales', 'en.json'), 'utf8'),
    ) as Record<string, unknown>;

    const roPwa = ro.pwa as Record<string, string>;
    const enPwa = en.pwa as Record<string, string>;

    expect(roPwa.updateAvailable).toBeTruthy();
    expect(roPwa.updateNow).toBeTruthy();
    expect(roPwa.updateLater).toBeTruthy();
    expect(enPwa.updateAvailable).toBeTruthy();
    expect(enPwa.updateNow).toBeTruthy();
    expect(enPwa.updateLater).toBeTruthy();
  });

  it('CSP worker-src allows self (covers SW script)', () => {
    const cspHelpers = readFileSync(
      join(process.cwd(), 'scripts', 'cspHeaders.ts'),
      'utf8',
    );
    expect(cspHelpers).toContain("worker-src 'self'");
  });

  it('manifest has correct scope for SW', () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'public', 'manifest.webmanifest'), 'utf8'),
    ) as { scope: string };
    expect(manifest.scope).toBe('/');
  });
});
