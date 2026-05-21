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

test('F24 — resident adds a borrowable item', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/imprumut');
  await page.getByRole('button', { name: /Adaugă obiect/i }).click();
  await page.getByLabel('Obiect').fill('Aspirator de frunze');
  await page.getByLabel('Categorie').fill('grădină');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Aspirator de frunze')).toBeVisible();
});

test('F29 — resident registers a bike in the bike room', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/biciclete');
  await page.getByRole('button', { name: /Înregistrează bicicletă/i }).click();
  await page.getByLabel('Descriere').fill('Trek galben de cursă');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Trek galben de cursă')).toBeVisible();
});
