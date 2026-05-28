import { test, expect, type Page } from '@playwright/test';

// T08 — tenant isolation: unauthenticated routes redirect to login and
// sign-out clears the session and returns to the login page.

async function dismissConsent(page: Page) {
  const banner = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole('button', { name: /Doar esențiale|essential only|Reject/i }).click();
  }
}

async function enterDemo(page: Page) {
  await page.goto('/');
  await dismissConsent(page);
  await page.getByRole('button', { name: /modul demonstrativ/i }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test('T08: unauthenticated access to /app redirects to the login page', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL('/');
  // The demo entry point must be visible so the user knows how to proceed.
  await expect(page.getByRole('button', { name: /modul demonstrativ/i })).toBeVisible();
});

test('T08: unauthenticated access to a nested route also redirects', async ({ page }) => {
  await page.goto('/app/anunturi');
  await expect(page).toHaveURL('/');
});

test('T08: sign-out from demo session returns to the login page', async ({ page }) => {
  await enterDemo(page);
  // Open the account menu via its accessible trigger.
  await page.getByRole('button', { name: /Meniu cont/i }).click();
  // Click the sign-out item (rendered as a menuitem in the dropdown).
  await page.getByRole('menuitem', { name: /Deconectare/i }).click();
  await expect(page).toHaveURL('/');
  // The demo entry point should be available again.
  await expect(page.getByRole('button', { name: /modul demonstrativ/i })).toBeVisible();
});
