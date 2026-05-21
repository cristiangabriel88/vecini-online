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

test('F37 — resident adds a pet to the directory', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/animale');
  await page.getByRole('button', { name: /Adaugă animal/i }).click();
  await page.getByLabel('Nume').fill('Bruno');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Bruno')).toBeVisible();
});

test('F48 — comitet adds an equipment warranty', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/garantii');
  await page.getByRole('button', { name: /Adaugă garanție/i }).click();
  await page.getByLabel('Echipament').fill('Cazan ACM');
  await page.getByLabel('Data achiziției').fill('2025-03-01');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Cazan ACM')).toBeVisible();
});
