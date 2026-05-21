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

test('F07 — resident searches the FAQ and marks an answer helpful', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/faq');
  await page.getByLabel(/caută/i).fill('apa calda');
  const card = page.getByRole('heading', { name: /apa caldă/i });
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: /^Util$/i }).first().click();
});

test('F14 — resident submits an idea to the idea box', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/idei');
  await page.getByRole('button', { name: /Propune o idee/i }).click();
  await page.getByLabel('Titlu').fill('Ghivece cu flori la intrare');
  await page.getByLabel('Descriere').fill('Câteva ghivece ar înviora intrarea în bloc.');
  await page.getByRole('button', { name: /Creează/i }).click();
  await expect(page.getByRole('heading', { name: 'Ghivece cu flori la intrare' })).toBeVisible();
});

test('F18 — committee searches the repair history', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/istoric-reparatii');
  await page.getByLabel(/caută/i).fill('pompa');
  await expect(page.getByRole('heading', { name: /pompă hidrofor/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /revizie/i })).toHaveCount(0);
});

test('F20 — resident submits a meter reading', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/contoare');
  await page.getByRole('button', { name: /Trimite index/i }).first().click();
  await page.getByLabel('Index nou').fill('320');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText(/Ultimul index: 320/)).toBeVisible();
});
