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

/**
 * T121 — Provisioning console E2E: add-association form validation + happy path.
 *
 * Covers: (1) empty-form submit blocks and shows validation errors; (2) filling
 * in a valid admin name + email, submitting, observing the success banner, then
 * navigating back to the list and asserting the new invite appears in the Pending
 * invitations section with a "Setup pending" badge. Runs offline in demo.
 */

// T121-1: Validation — empty form submit shows per-field required errors.
test('T121: demo — add-association form rejects empty submission', async ({ page }) => {
  await goPlatformLogin(page);
  if (!(await isDemoMode(page))) { test.skip(); return; }

  await page.getByRole('button', { name: /Enter demo console|Intră în consola demo/i }).click();
  await expect(page).toHaveURL(/\/consola$/);

  await page.getByRole('link', { name: /Asociații|Associations/i }).click();
  await expect(page).toHaveURL(/\/consola\/asociatii$/);

  // Click the "Add association" CTA (matches "Provizionează asociație nouă" / "Add association").
  await page.getByRole('button', { name: /Provizionează|Add association/i }).click();
  await expect(page).toHaveURL(/\/consola\/asociatii\/adauga$/);

  // The page heading confirms we are on the add form.
  await expect(
    page.getByRole('heading', { name: /Add new association|Adaugă asociație nouă/i }),
  ).toBeVisible();

  // Submit with both fields empty — validation fires on the first click.
  await page.getByRole('button', { name: /Send invitation|Trimite invitație/i }).click();

  // At least one "Required field" error should be visible.
  await expect(
    page.getByText(/Required field|Câmp obligatoriu/i).first(),
  ).toBeVisible();
});

// T121-2: Happy path — provision a new admin invite and verify it appears with a
// "Setup pending" badge on the associations list.
test('T121: demo — provision new admin invite, verify pending-setup badge on list', async ({
  page,
}) => {
  await goPlatformLogin(page);
  if (!(await isDemoMode(page))) { test.skip(); return; }

  await page.getByRole('button', { name: /Enter demo console|Intră în consola demo/i }).click();
  await expect(page).toHaveURL(/\/consola$/);

  await page.getByRole('link', { name: /Asociații|Associations/i }).click();
  await expect(page).toHaveURL(/\/consola\/asociatii$/);

  // Same pattern as T119-3: matches "Provizionează asociație nouă" (RO) / "Add association" (EN).
  await page.getByRole('button', { name: /Provizionează|Add association/i }).click();
  await expect(page).toHaveURL(/\/consola\/asociatii\/adauga$/);

  // Fill in valid admin details using a unique email so the test is idempotent.
  const testEmail = 't121-admin@example.com';
  await page.getByLabel(/Administrator name|Numele administratorului/i).fill('Ion Popescu');
  await page.getByLabel(/Administrator email|Email administrator/i).fill(testEmail);

  // Submit — demo path resolves after a short simulated delay.
  await page.getByRole('button', { name: /Send invitation|Trimite invitație/i }).click();

  // Success banner shows the email and the demo-mode note in the success note paragraph.
  const successBanner = page.getByRole('status');
  await expect(successBanner).toContainText(testEmail);
  // The `.platform-add-asoc__success-note` paragraph is scoped to avoid the
  // topbar badge which also contains "Mod demonstrativ".
  await expect(
    page.locator('.platform-add-asoc__success-note'),
  ).toContainText(/Demo mode|Mod demonstrativ/i);

  // Navigate back to the list via the "View associations list" button.
  await page.getByRole('button', { name: /View associations list|Vezi lista de asociații/i }).click();
  await expect(page).toHaveURL(/\/consola\/asociatii$/);

  // The new invite appears in the "Pending invitations" section.
  await expect(
    page.getByRole('region', { name: /Pending invitations|Invitații în așteptare/i }),
  ).toBeVisible();
  await expect(page.getByText('Ion Popescu')).toBeVisible();
  await expect(page.getByText(testEmail)).toBeVisible();

  // The "Setup pending" badge confirms the invite is in the right state.
  await expect(
    page.getByText(/Setup pending|Configurare în așteptare/i).first(),
  ).toBeVisible();
});

/**
 * T249 — Asociatie detail page + lifecycle (suspend / reactivate / archive).
 *
 * Covers: (1) the suspended demo asociatie shows a "Suspended" badge on the
 * list; (2) navigating to its detail page shows the status; (3) clicking
 * "Reactivate" changes the badge back to "Active".
 * Runs offline in demo mode only.
 */

// T249-1: Suspended badge is visible on the list for the seeded suspended asociatie.
test('T249: demo — suspended asociatie shows Suspended badge on list', async ({ page }) => {
  await goPlatformLogin(page);
  if (!(await isDemoMode(page))) { test.skip(); return; }

  await page.getByRole('button', { name: /Enter demo console|Intră în consola demo/i }).click();
  await page.getByRole('link', { name: /Asociații|Associations/i }).click();
  await expect(page).toHaveURL(/\/consola\/asociatii$/);

  // The demo data has one suspended asociatie (Timișoara). Its badge should show "Suspended".
  await expect(
    page.getByText(/Suspended|Suspendată/i).first(),
  ).toBeVisible();
});

// T249-2: Clicking a card navigates to the detail page.
test('T249: demo — clicking asociatie card navigates to detail page', async ({ page }) => {
  await goPlatformLogin(page);
  if (!(await isDemoMode(page))) { test.skip(); return; }

  await page.getByRole('button', { name: /Enter demo console|Intră în consola demo/i }).click();
  await page.getByRole('link', { name: /Asociații|Associations/i }).click();
  await expect(page).toHaveURL(/\/consola\/asociatii$/);

  // Click the overlay link on the first card (navigates to detail).
  const firstCard = page.locator('article.platform-asoc-card').first();
  const detailLink = firstCard.locator('.platform-asoc-card__link-overlay');
  await detailLink.click();

  // Should be on a detail route /consola/asociatii/<id>.
  await expect(page).toHaveURL(/\/consola\/asociatii\/[^/]+$/);

  // Back button should be visible.
  await expect(
    page.getByRole('button', { name: /Back to associations|Înapoi la asociații/i }),
  ).toBeVisible();
});

// T249-3: Suspended asociatie detail shows "Suspended" status; reactivate changes it to "Active".
test('T249: demo — suspend badge on detail, reactivate changes status to active', async ({ page }) => {
  await goPlatformLogin(page);
  if (!(await isDemoMode(page))) { test.skip(); return; }

  await page.getByRole('button', { name: /Enter demo console|Intră în consola demo/i }).click();
  await page.getByRole('link', { name: /Asociații|Associations/i }).click();
  await expect(page).toHaveURL(/\/consola\/asociatii$/);

  // Navigate directly to the suspended demo asociatie detail page.
  await page.goto('/platform.html#/consola/asociatii/demo-asoc-3');
  // Wait for the detail content.
  await expect(
    page.getByText(/Suspended|Suspendată/i).first(),
  ).toBeVisible();

  // Click "Reactivate".
  await page.getByRole('button', { name: /Reactivate association|Reactivează asociația/i }).click();

  // Status should now show "Active".
  await expect(
    page.getByText(/^Active$|^Activă$/i).first(),
  ).toBeVisible();

  // The "Reactivate" button should no longer be visible (status is active now).
  await expect(
    page.getByRole('button', { name: /Reactivate association|Reactivează asociația/i }),
  ).not.toBeVisible();
});

/**
 * T250 — Pending-invite resend / revoke + per-tenant admin roster.
 *
 * Covers: (1) provisioning a new invite then revoking it from the list page
 * causes it to disappear; (2) navigating to an asociatie detail page shows the
 * Administrators section; (3) provisioning an additional admin via the form
 * shows the new admin in the roster.
 * Runs offline in demo mode only.
 */

// T250-1: Revoke a pending invite from the list page -- it disappears.
test('T250: demo -- revoke pending invite removes it from the list', async ({ page }) => {
  await goPlatformLogin(page);
  if (!(await isDemoMode(page))) { test.skip(); return; }

  await page.getByRole('button', { name: /Enter demo console|Intră în consola demo/i }).click();
  await page.getByRole('link', { name: /Asociații|Associations/i }).click();
  await expect(page).toHaveURL(/\/consola\/asociatii$/);

  // Add a new invite so we have something to revoke.
  await page.getByRole('button', { name: /Provizionează|Add association/i }).click();
  await page.getByLabel(/Administrator name|Numele administratorului/i).fill('Radu Test');
  await page.getByLabel(/Administrator email|Email administrator/i).fill('radu-t250@example.com');
  await page.getByRole('button', { name: /Send invitation|Trimite invitație/i }).click();
  await page.getByRole('button', { name: /View associations list|Vezi lista de asociații/i }).click();
  await expect(page).toHaveURL(/\/consola\/asociatii$/);

  // The invite appears in the pending section.
  await expect(page.getByText('Radu Test')).toBeVisible();

  // Click "Revoke" for this invite.
  const pendingSection = page.getByRole('region', { name: /Pending invitations|Invitații în așteptare/i });
  const revokeBtn = pendingSection.getByRole('button', { name: /Revoke|Revocă/i }).first();
  await revokeBtn.click();

  // The invite should disappear from the list.
  await expect(page.getByText('Radu Test')).not.toBeVisible();
});

// T250-2: Detail page shows Administrators section and provision-admin form.
test('T250: demo -- detail page shows admin roster and provision form', async ({ page }) => {
  await goPlatformLogin(page);
  if (!(await isDemoMode(page))) { test.skip(); return; }

  await page.getByRole('button', { name: /Enter demo console|Intră în consola demo/i }).click();
  await page.getByRole('link', { name: /Asociații|Associations/i }).click();

  // Navigate to the first asociatie's detail page.
  const firstCard = page.locator('article.platform-asoc-card').first();
  await firstCard.locator('.platform-asoc-card__link-overlay').click();
  await expect(page).toHaveURL(/\/consola\/asociatii\/[^/]+$/);

  // The Administrators section heading should be visible.
  await expect(
    page.getByRole('region', { name: /Administrators|Administratori/i }),
  ).toBeVisible();

  // The "Add additional administrator" button/CTA should be visible.
  await expect(
    page.getByRole('button', { name: /Add additional|Adaugă administrator/i }),
  ).toBeVisible();
});

// T250-3: Provision additional admin via detail page form, verify it appears in roster.
test('T250: demo -- provision additional admin appears in roster', async ({ page }) => {
  await goPlatformLogin(page);
  if (!(await isDemoMode(page))) { test.skip(); return; }

  await page.getByRole('button', { name: /Enter demo console|Intră în consola demo/i }).click();

  // Navigate directly to the first demo asociatie detail page.
  await page.goto('/platform.html#/consola/asociatii/demo-asoc-2');
  await expect(
    page.getByRole('region', { name: /Administrators|Administratori/i }),
  ).toBeVisible();

  // Open the provision form.
  await page.getByRole('button', { name: /Add additional|Adaugă administrator/i }).click();

  // Fill in the new admin details.
  await page.getByLabel(/Administrator name|Numele administratorului/i).last().fill('Claudia T250');
  await page.getByLabel(/Administrator email|Email administrator/i).last().fill('claudia-t250@example.com');

  // Submit.
  await page.getByRole('button', { name: /Send invitation|Trimite invitație/i }).click();

  // Success message shows the email.
  await expect(page.getByRole('status')).toContainText('claudia-t250@example.com');

  // The new admin appears in the roster.
  await expect(page.getByText('Claudia T250')).toBeVisible();
});
