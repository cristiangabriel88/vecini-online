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

test('F58: resident can add a carpool profile', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/carpool');
  await page.getByRole('button', { name: /profilul meu/i }).click();
  await page.getByLabel('Destinație').fill('Aeroport Otopeni');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Aeroport Otopeni')).toBeVisible();
});

test('F63: resident can list their birthday', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/aniversari');
  await page.getByRole('button', { name: /ziua mea/i }).click();
  await page.getByLabel('Zi').fill('24');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Ziua ta este listată')).toBeVisible();
});

test('F47: admin can add an energy reading', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/energie');
  await page.getByRole('button', { name: /Adaugă citire/i }).click();
  await page.getByLabel('Consum').fill('100');
  await page.getByLabel('Cost (lei)').fill('80');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText(/mai 2026/i)).toBeVisible();
});

test('F45: comitet can add a multi-year plan item', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/plan-multianual');
  await page.getByRole('button', { name: /Adaugă lucrare/i }).click();
  await page.getByLabel('An').fill('2030');
  await page.getByLabel('Lucrare').fill('Test E2E plan');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Test E2E plan')).toBeVisible();
});

test('F32: resident can generate a courier access code', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/curier');
  await page.getByRole('button', { name: /Generează cod/i }).click();
  await expect(page.getByText(/Activ ·/).first()).toBeVisible();
});

test('F59: resident can add a sitter profile', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/babysitting');
  await page.getByRole('button', { name: /profilul meu/i }).click();
  await page.getByLabel('Disponibilitate').fill('Seri în timpul săptămânii');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Seri în timpul săptămânii')).toBeVisible();
});

test('F60: resident can post a barter offer', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/barter');
  await page.getByRole('button', { name: /oferta mea/i }).click();
  await page.getByLabel('Ofer').fill('Reparații calculatoare');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Reparații calculatoare')).toBeVisible();
});

test('F61: resident can join a group buy', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/cumparaturi');
  await expect(page.getByText(/50 kg cartofi/i)).toBeVisible();
  await page.getByRole('button', { name: /Mă bag/i }).first().click();
  await expect(page.getByText('Te-ai înscris').first()).toBeVisible();
});

test('home page has no critical accessibility violations', async ({ page }) => {
  await enterDemo(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const serious = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? ''));
  expect(serious).toEqual([]);
});
