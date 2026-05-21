import { test, expect, type Page } from '@playwright/test';

/** Happy-path E2E coverage for the feature pages built on top of the core slice.
 *  All run against demo mode (no backend), mirroring tests/e2e/smoke.spec.ts. */

async function enterDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /modul demonstrativ/i }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test('F06 — resident publishes a neighbour post', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/locator');
  await page.getByRole('button', { name: /Anunț nou/i }).click();
  await page.getByLabel('Titlu').fill('Vând masă de bucătărie');
  await page.getByLabel('Detalii').fill('Masă din lemn, stare bună. 150 lei.');
  await page.getByRole('button', { name: /Publică/i }).click();
  await expect(page.getByRole('heading', { name: 'Vând masă de bucătărie' })).toBeVisible();
});
