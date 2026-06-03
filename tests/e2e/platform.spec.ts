import { test, expect, type Page } from '@playwright/test';

/**
 * T119 — Platform-shell access E2E.
 *
 * Covers: demo console smoke (login → /consola → asociatii nav → sign out),
 * and the live-path guard (unauthenticated redirect to login, live denial
 * screen skipped in demo builds where Supabase is absent).
 *
 * No GDPR consent banner or welcome tour on the platform app.
 * Runs against /platform.html (the superadmin console entry point).
 */

const PLATFORM_PATH = '/platform.html';

/**
 * Load the platform app and wait for the login page.
 * React Router: /platform.html → * catch-all → /consola → unauthenticated → /
 */
async function goPlatformLogin(page: Page) {
  await page.goto(PLATFORM_PATH);
  await expect(
    page.getByRole('heading', { name: /Operator sign in|Autentificare operator/i }),
  ).toBeVisible();
}

/**
 * True when running in demo mode (no Supabase configured).
 * In demo mode the login page shows "Enter demo console" instead of a password form.
 */
async function isDemoMode(page: Page): Promise<boolean> {
  return (
    (await page
      .getByRole('button', { name: /Enter demo console|Intră în consola demo/i })
      .count()) > 0
  );
}

// T119-1: Login page is accessible and identifies the restricted console.
test('T119: platform login page is visible and describes the operator gate', async ({ page }) => {
  await goPlatformLogin(page);
  await expect(
    page.getByRole('heading', { name: /Operator sign in|Autentificare operator/i }),
  ).toBeVisible();
  // In live mode the subtitle says "Restricted to platform operators".
  // In demo mode the card shows the demo-notice ("no backend configured").
  // Either way, something describes the restricted/demo nature of the console.
  await expect(
    page.getByText(/Restricted to platform|Acces restricționat|no backend|fără backend/i),
  ).toBeVisible();
});

// T119-2: Demo console smoke — full round trip.
test('T119: demo — enter demo console, reach overview, sign out returns to login', async ({
  page,
}) => {
  await goPlatformLogin(page);
  if (!(await isDemoMode(page))) { test.skip(); return; }

  // Click the demo entry button.
  await page.getByRole('button', { name: /Enter demo console|Intră în consola demo/i }).click();
  await expect(page).toHaveURL(/\/consola$/);

  // Overview: welcome heading contains the demo operator name.
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toBeVisible();
  await expect(h1).toContainText(/Hello|Bun[ăa]/i);

  // Topbar carries the "Demo mode" badge (unique span, not the longer hint paragraph).
  await expect(page.locator('.platform-demobadge')).toBeVisible();

  // Platform stats section (seeded demo totals) is rendered.
  await expect(
    page.getByRole('region', { name: /Platform at a glance|Platforma pe scurt/i }),
  ).toBeVisible();

  // Sign out via the topbar button.
  await page.getByRole('button', { name: /Sign out|Ieșire/i }).click();

  // Back at the platform login.
  await expect(
    page.getByRole('heading', { name: /Operator sign in|Autentificare operator/i }),
  ).toBeVisible();
});

// T119-3: Navigate to the asociatii list via the overview section card link.
// Uses the section card link (visible in the main content area on both desktop and mobile)
// rather than the sidebar nav button which may be hidden on narrow viewports.
test('T119: demo — navigate to asociatii list within the console', async ({ page }) => {
  await goPlatformLogin(page);
  if (!(await isDemoMode(page))) { test.skip(); return; }

  await page.getByRole('button', { name: /Enter demo console|Intră în consola demo/i }).click();
  await expect(page).toHaveURL(/\/consola$/);

  // The overview section grid has a link card for "Asociații" (the only ready section
  // rendered as an <a>; the rest are <article> cards).
  await page.getByRole('link', { name: /Asociații|Associations/i }).click();
  await expect(page).toHaveURL(/\/consola\/asociatii$/);

  // Associations page h1 and operator provision CTA.
  await expect(page.getByRole('heading', { level: 1, name: /Asociații|Associations/i })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Provizionează|Add association/i }),
  ).toBeVisible();
});

// T119-4: Live path — unauthenticated access is denied (redirect to login).
// Skipped in demo builds where Supabase is absent and the denial state is unreachable.
test('T119: live — unauthenticated access to /consola is denied (live path only)', async ({
  page,
}) => {
  await goPlatformLogin(page);
  if (await isDemoMode(page)) { test.skip(); return; }

  // Live mode: the email/password form is shown instead of a demo button.
  await expect(page.getByLabel(/Email/i)).toBeVisible();

  // The RequirePlatformAdmin gate already redirected from /consola to / —
  // confirmed by the login heading being visible at the platform root.
  await expect(
    page.getByRole('heading', { name: /Operator sign in|Autentificare operator/i }),
  ).toBeVisible();
});
