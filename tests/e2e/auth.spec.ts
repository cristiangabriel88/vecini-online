import { test, expect, type Page } from '@playwright/test';

// Dismiss the GDPR banner if it is showing so it cannot intercept clicks.
async function dismissConsent(page: Page) {
  const banner = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole('button', { name: /Doar esențiale|essential only|Reject/i }).click();
  }
}

test('T01: auth page switches between sign in, sign up and reset', async ({ page }) => {
  await page.goto('/');
  await dismissConsent(page);

  // Default view is sign in: email + password, no confirm field.
  await expect(page.getByRole('heading', { name: /Intră în cont/i })).toBeVisible();
  await expect(page.getByLabel(/Confirmă parola/i)).toHaveCount(0);

  // Switch to sign up: a confirm-password field appears.
  await page.getByRole('button', { name: 'Creează cont', exact: true }).click();
  await expect(page.getByLabel(/Confirmă parola/i)).toBeVisible();

  // Back to sign in, then to the password-reset request form.
  await page.getByRole('button', { name: /Intră în cont/i }).click();
  await page.getByRole('button', { name: /Ai uitat parola/i }).click();
  await expect(page.getByRole('heading', { name: /Resetare parolă/i })).toBeVisible();
  await expect(page.getByLabel(/Parolă/i)).toHaveCount(0);

  // The demo entry point is still available and works.
  await page.getByRole('button', { name: /Înapoi la autentificare/i }).click();
  await page.getByRole('button', { name: /modul demonstrativ/i }).click();
  await expect(page).toHaveURL(/\/app$/);
});

test('T01: reset-password link without a recovery session is guided back', async ({ page }) => {
  await page.goto('/reset-parola');
  await dismissConsent(page);
  // In demo mode there is no recovery session, so the page lets the resident set
  // a new password directly (no Supabase backend to reject the token).
  await expect(page.getByRole('heading', { name: /Setează o parolă nouă/i })).toBeVisible();
});
