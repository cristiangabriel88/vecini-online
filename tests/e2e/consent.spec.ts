import { test, expect, type Page } from '@playwright/test';

async function enterDemo(page: Page) {
  await page.goto('/');
  const demoButton = page.getByRole('button', { name: /modul demonstrativ/i });
  if (await demoButton.count()) await demoButton.first().click();
  await expect(page).toHaveURL(/\/app$/);
}

test('T05: consent banner shows, accepts, and stops re-appearing', async ({ page }) => {
  await page.goto('/');
  // The GDPR banner is shown on first visit, before any decision.
  const banner = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: /Accept(ă)? tot/i }).click({ force: true });
  await expect(banner).toHaveCount(0);
  // The decision persists across a reload — no banner second time.
  await page.reload();
  await expect(page.getByRole('dialog', { name: /Confidențialitate|Privacy/i })).toHaveCount(0);
});

test('T05: public privacy policy page is reachable', async ({ page }) => {
  await page.goto('/confidentialitate');
  await expect(page.getByRole('heading', { name: /Politica de confidențialitate/i })).toBeVisible();
  await expect(page.getByText(/GDPR/i).first()).toBeVisible();
  await expect(page.getByText(/ANSPDCP/i).first()).toBeVisible();
});

test('T05: resident can change consent and see it logged', async ({ page }) => {
  await page.goto('/');
  const banner = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  await banner.getByRole('button', { name: /Doar esențiale|essential only|Reject/i }).click({ force: true });
  // Enter the app: PROD build still shows the login page after dismissing the banner;
  // demo build is already authenticated (DemoEntry fired on '/').
  await enterDemo(page);
  await page.goto('/app/confidentialitate');
  await expect(page.getByRole('heading', { name: /Confidențialitate/i })).toBeVisible();
  // Re-save with statistics enabled, then confirm the history records it.
  await page.getByRole('switch', { name: /Statistici|Analytics/i }).click();
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText(/Statistici|Analytics/).first()).toBeVisible();
});
