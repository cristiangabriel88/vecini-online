import { test, expect, type Page } from '@playwright/test';

/** Happy-path E2E for shared spaces + information + community registry features (F28-F34, F37-F39).
 *  Covers: parking, bikes, storage rooms, green tasks, courier codes, suppliers,
 *  pets, thank-you wall, and the wiki. All tests run in demo mode (no backend). */

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

test('F28 — committee adds a parking spot and can find it by plate number', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/parcare');
  await page.getByRole('button', { name: /Adaugă loc/i }).click();
  await page.getByLabel('Loc (etichetă)').fill('P5');
  await page.getByLabel('Număr de înmatriculare').fill('B 100 NEW');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Loc adăugat.')).toBeVisible();
  // Filter by plate — accent-insensitive search
  await page.getByPlaceholder(/Caută după loc, apartament sau număr/i).fill('B 100 NEW');
  await expect(page.getByText('P5')).toBeVisible();
  await expect(page.getByText('B 100 NEW')).toBeVisible();
});

test('F29 — resident registers a bike and it appears in the list', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/biciclete');
  await page.getByRole('button', { name: /Înregistrează bicicletă/i }).click();
  await page.getByLabel('Descriere').fill('Trek Marlin albastru');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Bicicletă înregistrată.')).toBeVisible();
  await expect(page.getByText('Trek Marlin albastru')).toBeVisible();
});

test('F30 — storage rooms list shows assigned apartment badges from seeded data', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/boxe');
  // Seeded: Boxa 1 — subsol is assigned to Ap. 1
  await expect(page.getByText('Boxa 1 — subsol')).toBeVisible();
  const assignedCard = page.locator('.card').filter({ hasText: 'Boxa 1 — subsol' });
  await expect(assignedCard.getByText('Ap. 1')).toBeVisible();
  // Seeded unassigned room shows the "Neatribuită" badge
  const unassignedCard = page.locator('.card').filter({ hasText: 'Dependință pod' });
  await expect(unassignedCard.getByText('Neatribuită')).toBeVisible();
});

test('F31 — resident signs up for a free green-space task; slot becomes covered', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/plante');
  // Open-tasks banner is visible (seeded gt-2 and gt-3 have no volunteer)
  await expect(page.getByText(/sarcini caută/i)).toBeVisible();
  // Sign up for the first free task (gt-2: Tuns gazonul din față)
  const freeTask = page.locator('.card').filter({ hasText: 'Tuns gazonul din față' });
  await freeTask.getByRole('button', { name: /Mă înscriu/i }).click();
  // After sign-up, "Renunț" replaces "Mă înscriu" on that task card
  await expect(freeTask.getByRole('button', { name: /Renunț/i })).toBeVisible();
});

test('F32 — resident generates a courier access code; 30-min countdown is visible', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/curier');
  await page.getByRole('button', { name: /Generează cod/i }).click();
  await expect(page.getByText(/Cod generat/i)).toBeVisible();
  // Freshly generated code shows exactly the 30-minute active countdown
  await expect(page.getByText(/Activ.*30 min/i)).toBeVisible();
});

test('F34 — committee adds a supplier with a past contract end; "Expirat" badge shows', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/furnizori');
  // Alert banner is already visible from seeded expired/expiring suppliers
  await expect(page.getByText(/contracte expirate/i)).toBeVisible();
  await page.getByRole('button', { name: /Adaugă furnizor/i }).click();
  await page.getByLabel('Denumire').fill('EnergoMax SRL');
  await page.getByLabel('Tip').fill('energie electrică');
  // Contract end in the past → "Expirat" badge
  await page.getByLabel('Sfârșit contract').fill('2025-01-01');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Furnizor adăugat.')).toBeVisible();
  const supplierCard = page.locator('.card').filter({ hasText: 'EnergoMax SRL' });
  await expect(supplierCard.getByText('Expirat')).toBeVisible();
});

test('F37 — resident registers a pet then marks it lost; lost badge appears', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/animale');
  await page.getByRole('button', { name: /Adaugă animal/i }).click();
  await page.getByLabel('Nume').fill('Lola');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Animal înregistrat.')).toBeVisible();
  const petCard = page.locator('.card').filter({ hasText: 'Lola' });
  await petCard.getByRole('button', { name: /Marchează pierdut/i }).click();
  await expect(petCard.getByText('Pierdut')).toBeVisible();
});

test('F38 — resident posts a thank-you and it appears at the top of the feed', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/multumiri');
  await page.getByRole('button', { name: /Mulțumește/i }).click();
  await page.getByLabel(/Către apartamentul/i).fill('7');
  await page.getByLabel('Mesaj').fill('Mulțumesc vecinului de la 7 pentru ajutor!');
  await page.getByRole('button', { name: /Publică/i }).click();
  await expect(page.getByText('Mulțumirea a fost publicată.')).toBeVisible();
  await expect(page.getByText('Mulțumesc vecinului de la 7 pentru ajutor!')).toBeVisible();
});

test('F39 — committee adds a wiki page and search returns it by keyword', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/wiki');
  await page.getByRole('button', { name: /Pagină nouă/i }).click();
  await page.getByLabel('Titlu').fill('Reguli de zgomot');
  await page.getByLabel('Conținut').fill('Liniștea este obligatorie între orele 22:00 și 08:00.');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Pagină adăugată.')).toBeVisible();
  // Search confirms the new page is indexed
  await page.getByPlaceholder(/Caută în wiki/i).fill('zgomot');
  await expect(page.getByText('Reguli de zgomot')).toBeVisible();
});
