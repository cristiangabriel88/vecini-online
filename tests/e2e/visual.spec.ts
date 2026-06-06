import { test, expect, type Page } from '@playwright/test';

// Frozen wall-clock for stable relative-date rendering in demo seed data.
const FREEZE_ISO = '2026-06-06T12:00:00.000Z';
const FREEZE_DATE = new Date(FREEZE_ISO);

// Fixed desktop viewport for all visual shots.
const VIEWPORT = { width: 1280, height: 900 } as const;

/**
 * Seed localStorage before the page boots so the app renders with the desired
 * theme/tint, consent already accepted, and the welcome tour already seen.
 * Must be called before page.goto() — addInitScript fires before any scripts.
 */
function seedStorage(page: Page, theme: 'light' | 'dark', tint = 'sage') {
  return page.addInitScript(
    ({ t, p, ts }) => {
      localStorage.setItem(
        'vecini.consent',
        JSON.stringify({
          state: {
            record: {
              choices: { necessary: true, preferences: true, analytics: true, marketing: true },
              version: 1,
              decidedAt: ts,
            },
            history: [],
          },
          version: 0,
        }),
      );
      localStorage.setItem('vecini.theme', JSON.stringify({ state: { theme: t }, version: 0 }));
      localStorage.setItem('vecini.tint',  JSON.stringify({ state: { tint:  p }, version: 0 }));
      // Mark the welcome tour as already seen for the demo resident user.
      localStorage.setItem(
        'vecini.welcome',
        JSON.stringify({
          state: { seenByUser: { 'u-res': '2026-06-01T10:00:00.000Z' } },
          version: 0,
        }),
      );
    },
    { t: theme, p: tint, ts: FREEZE_ISO },
  );
}

/** Inject a style tag that stops all CSS transitions and animations. */
async function freezeMotion(page: Page) {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }`,
  });
}

/**
 * Enter the app in demo mode. In PROD/pi builds the "modul demonstrativ"
 * button must be clicked; in demo builds the app auto-redirects to /app.
 */
async function enterDemo(page: Page) {
  await page.goto('/');
  const demoBtn = page.getByRole('button', { name: /modul demonstrativ/i });
  if (await demoBtn.count()) await demoBtn.first().click();
  await expect(page).toHaveURL(/\/app$/);
}

// ── Visual regression suite ────────────────────────────────────────────────

test.describe('visual regression', () => {
  test.use({ viewport: VIEWPORT });

  test('login — light/sage', async ({ page }) => {
    await seedStorage(page, 'light', 'sage');
    await page.clock.setFixedTime(FREEZE_DATE);
    await page.goto('/');
    await freezeMotion(page);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-light-sage.png', { animations: 'disabled' });
  });

  test('dashboard — light/sage', async ({ page }) => {
    await seedStorage(page, 'light', 'sage');
    await page.clock.setFixedTime(FREEZE_DATE);
    await enterDemo(page);
    await freezeMotion(page);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard-light-sage.png', { animations: 'disabled' });
  });

  test('dashboard — dark/ocean', async ({ page }) => {
    await seedStorage(page, 'dark', 'ocean');
    await page.clock.setFixedTime(FREEZE_DATE);
    await enterDemo(page);
    await freezeMotion(page);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard-dark-ocean.png', { animations: 'disabled' });
  });

  test('announcements list — light/sage', async ({ page }) => {
    await seedStorage(page, 'light', 'sage');
    await page.clock.setFixedTime(FREEZE_DATE);
    await enterDemo(page);
    await page.goto('/app/anunturi');
    await expect(page.getByRole('heading', { name: /Anun/i })).toBeVisible();
    await freezeMotion(page);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('announcements-light-sage.png', { animations: 'disabled' });
  });

  test('component gallery — light/sage', async ({ page }) => {
    await seedStorage(page, 'light', 'sage');
    await page.clock.setFixedTime(FREEZE_DATE);
    await enterDemo(page);
    await page.goto('/app/dev/componente');
    await expect(page.getByRole('heading', { name: /galerie|gallery/i, level: 1 })).toBeVisible();
    await freezeMotion(page);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('component-gallery-light-sage.png', { animations: 'disabled' });
  });
});
