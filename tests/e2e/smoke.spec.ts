import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function enterDemo(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /modul demonstrativ/i }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test('demo login lands on the home feed', async ({ page }) => {
  await enterDemo(page);
  await expect(page.getByRole('heading', { name: 'Acasă' })).toBeVisible();
});

test('admin can publish an announcement', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/anunturi');
  await page.getByRole('button', { name: /Anunț nou/i }).click();
  await page.getByLabel('Titlu').fill('Test anunț E2E');
  await page.getByLabel('Conținut').fill('Conținut de test pentru anunț.');
  await page.getByRole('button', { name: /Publică/i }).click();
  await expect(page.getByRole('heading', { name: 'Test anunț E2E' })).toBeVisible();
});

test('resident can cast a vote and see results', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/voturi');
  await page.getByRole('button', { name: 'Pentru', exact: true }).first().click();
  await page.getByRole('button', { name: /Confirmă/i }).click();
  await expect(page.getByText(/voturi/)).toBeVisible();
});

test('disabling a feature removes it from navigation', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/admin/functionalitati');
  // F01 Anunțuri is enabled by default; toggle it off.
  const row = page.locator('div', { hasText: 'Anunțuri oficiale' }).first();
  await row.getByRole('switch').click();
  await page.goto('/app');
  await expect(page.getByRole('navigation', { name: 'Navigare mobil' }).getByText('Anunțuri')).toHaveCount(0);
});

test('home page has no critical accessibility violations', async ({ page }) => {
  await enterDemo(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const serious = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? ''));
  expect(serious).toEqual([]);
});
