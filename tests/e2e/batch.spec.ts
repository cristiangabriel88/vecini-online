import { test, expect, type Page } from '@playwright/test';

/** Happy-path E2E coverage for the features built out in this batch.
 *  All run against demo mode (no backend). */

async function dismissConsent(page: Page) {
  const banner = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole('button', { name: /Accept(ă)? tot/i }).click({ force: true });
    await banner.waitFor({ state: 'hidden' }).catch(() => {});
  }
}

async function enterDemo(page: Page) {
  await page.goto('/');
  await dismissConsent(page);
  // In the demo build the root route auto-enters and redirects to /app immediately.
  // In PROD/pi builds the login page renders and the button must be clicked.
  const demoButton = page.getByRole('button', { name: /modul demonstrativ/i });
  if (await demoButton.count()) await demoButton.first().click();
  await expect(page).toHaveURL(/\/app$/);
}

test('F15 — resident votes in an opinion survey and sees results', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/sondaje');
  await page.getByRole('button', { name: 'Gri deschis', exact: true }).click();
  await expect(page.locator('main').getByText(/răspunsuri/).first()).toBeVisible();
});

test('F24 — resident adds a borrowable item', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/imprumut');
  await page.getByRole('button', { name: /Adaugă obiect/i }).click();
  await page.getByLabel('Obiect', { exact: true }).fill('Aspirator de frunze');
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
  await page.getByLabel('Echipament', { exact: true }).fill('Cazan ACM');
  await page.getByLabel('Data achiziției').fill('2025-03-01');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Cazan ACM')).toBeVisible();
});
