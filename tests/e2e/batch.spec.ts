import { test, expect } from '@playwright/test';

/** Happy-path E2E coverage for the features built out in this batch.
 *  All run against demo mode (no backend). */

async function enterDemo(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /modul demonstrativ/i }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test('F15 — resident votes in an opinion survey and sees results', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/sondaje');
  await page.getByRole('button', { name: 'Gri deschis', exact: true }).click();
  await expect(page.getByText(/răspunsuri/).first()).toBeVisible();
});
