import { test, expect, type Page } from '@playwright/test';

/** Happy-path E2E for maintenance + issues features (F18-F24).
 *  Covers: repair records, scheduled maintenance, meter readings, recurring
 *  issue detection, RFP/quotes, duty roster, and the lending library.
 *  All tests run in demo mode (no backend required). */

async function enterDemo(page: Page) {
  await page.goto('/');
  const consent = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  if (await consent.isVisible().catch(() => false)) {
    await consent.getByRole('button', { name: /Accept(ă)? tot/i }).click({ force: true });
    await consent.waitFor({ state: 'hidden' }).catch(() => {});
  }
  const demoButton = page.getByRole('button', { name: /modul demonstrativ/i });
  if (await demoButton.count()) await demoButton.first().click();
  await expect(page).toHaveURL(/\/app$/);
}

test('F18 — committee adds a repair record with a future warranty; badge reads "în garanție"', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/istoric-reparatii');
  await page.getByRole('button', { name: /Adaugă reparație/i }).click();
  await page.getByLabel('Titlu lucrare').fill('Hidroizolație terasă');
  await page.getByLabel('Garanție până la').fill('2028-01-01');
  await page.getByRole('button', { name: /Salvează/i }).click();
  const heading = page.getByRole('heading', { name: /Hidroizolație terasă/i });
  await expect(heading).toBeVisible();
  // The warranty end date is in the future, so the badge shows "în garanție".
  await expect(heading.locator('../..').getByText(/în garanție/i)).toBeVisible();
});

test('F19 — committee adds a scheduled maintenance task and marks it done', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/mentenanta');
  await page.getByRole('button', { name: /Adaugă lucrare/i }).click();
  await page.getByLabel('Lucrare').fill('Verificare instalație paratrăsnet');
  await page.getByRole('button', { name: /Salvează/i }).click();
  // The new item appears in the list.
  await expect(page.getByText('Verificare instalație paratrăsnet')).toBeVisible();
  // Mark the first overdue item done; the toast confirms the rescheduling.
  await page.getByRole('button', { name: /Marchează efectuat/i }).first().click();
  await expect(page.getByText(/Lucrare marcată ca efectuată/i)).toBeVisible();
});

test('F20 — resident submits a high meter reading and the anomaly warning appears', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/contoare');
  // Open the submit modal for the first meter (Apă rece, last_value 312).
  await page.getByRole('button', { name: /Trimite index/i }).first().click();
  // 345 - 312 = 33 consumption, well above the 6 * 3 = 18 anomaly threshold.
  await page.getByLabel('Index nou').fill('345');
  await expect(page.getByText(/Consum neobișnuit/i)).toBeVisible();
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText(/Index trimis/i)).toBeVisible();
});

test('F21 — recurring issue banner is visible and lift pattern card is present', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/sesizari-recurente');
  // The seeded lift tickets (3 in 90-day window) generate an active recurring pattern.
  // The summary banner at the top includes the word "recurente" or "recurentă".
  await expect(page.getByText(/recurente? detectate?/i)).toBeVisible();
  // The specific pattern card surfaces the lift failures on scara A.
  await expect(page.getByRole('heading', { name: /Lift.*scara A/i })).toBeVisible();
});

test('F22 — committee posts an RFP, adds a quote, and cheapest badge is highlighted', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/oferte');
  // The seeded rfp-1 (two quotes: HidroTech 8.500 lei, AquaFix 7.200 lei) already
  // shows the "Cea mai mică" badge on the cheaper offer.
  await expect(page.getByText('Cea mai mică')).toBeVisible();
  // Post a new RFP.
  await page.getByRole('button', { name: /Cerere nouă/i }).click();
  await page.getByLabel('Titlu').fill('Zugrăvit casa scărilor B');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Cerere de ofertă publicată.')).toBeVisible();
  // The new RFP appears in the list with status "Deschis".
  const rfpCard = page.getByText('Zugrăvit casa scărilor B').locator('../..');
  await expect(rfpCard.getByText('Deschis')).toBeVisible();
  // Add a quote to the new RFP.
  await rfpCard.getByRole('button', { name: /Adaugă ofertă/i }).click();
  await page.getByLabel('Contractor').fill('ZugravPro SRL');
  await page.getByLabel('Sumă (lei)').fill('5000');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Ofertă adăugată.')).toBeVisible();
  await expect(rfpCard.getByText('ZugravPro SRL')).toBeVisible();
});

test('F23 — resident signs up for a free duty weekend; slot becomes covered', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/garda');
  // The "De gardă acum" summary card is always visible at the top of the page.
  await expect(page.getByText(/De gardă acum/i)).toBeVisible();
  // Sign up for the first uncovered slot (duty-2 is seeded with no volunteer).
  await page.getByRole('button', { name: /Mă înscriu/i }).first().click();
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText(/Te-ai înscris de gardă/i)).toBeVisible();
  // The slot transitions from "Liber" to "Acoperit".
  await expect(page.getByText('Acoperit').first()).toBeVisible();
});

test('F24 — resident adds a borrowable item and marks it borrowed', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/imprumut');
  await page.getByRole('button', { name: /Adaugă obiect/i }).click();
  await page.getByLabel('Obiect', { exact: true }).fill('Polizor unghiular');
  await page.getByLabel('Categorie').fill('unelte');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Obiect adăugat în listă.')).toBeVisible();
  // The new item appears at the top of the list and is available.
  const itemCard = page.getByText('Polizor unghiular').locator('../..');
  await expect(itemCard.getByText('Disponibil')).toBeVisible();
  // Mark it borrowed; the badge flips.
  await itemCard.getByRole('button', { name: /Marchează împrumutat/i }).click();
  await expect(itemCard.getByText('Împrumutat', { exact: true })).toBeVisible();
});
