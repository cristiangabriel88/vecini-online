import { test, expect, type Page } from '@playwright/test';

/** Happy-path E2E for projects + safety + community-life features (F41-F48, F50-F53, F57, F62-F63, F65).
 *  Covers: project phase advancement, crowdfunding pledge + funded tracker, energy records,
 *  warranty expiry badge, evacuation plan, PSI check, insurance expiry badge, key holder,
 *  marketplace listing, welcome-kit step completion, birthday opt-in, and feedback submission.
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

test('F41 — committee advances an in-progress project phase to completed', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/proiecte');
  // Seeded project "Reabilitare termică" has phase "Termoizolație fațadă" in in_curs state,
  // which shows the "Finalizează" action button.
  const phaseLi = page.locator('li').filter({ hasText: 'Termoizolație fațadă' });
  await expect(phaseLi).toBeVisible();
  await phaseLi.getByRole('button', { name: /Finalizează/i }).click();
  // After advancing to finalizat the action button disappears from this phase row.
  await expect(phaseLi.getByRole('button', { name: /Finalizează/i })).toHaveCount(0);
});

test('F44 — funded crowdfund shows "Țintă atinsă"; resident pledges to open project', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/crowdfund');
  // Seeded cf-2 has pledged === target_amount so the funded badge appears.
  await expect(page.getByText('Țintă atinsă')).toBeVisible();
  // Pledge to the open project (cf-1: Loc de joacă, 1500 / 4000 lei raised).
  await page.getByRole('button', { name: /Promite o contribuție/i }).click();
  await page.getByLabel('Suma promisă (lei)').fill('200');
  await page.getByRole('button', { name: /Promite o contribuție/i }).last().click();
  await expect(page.getByText('Mulțumim pentru promisiune!')).toBeVisible();
});

test('F47 — committee adds a common-area energy reading', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/energie');
  await page.getByRole('button', { name: /Adaugă citire/i }).click();
  // Period defaults to current month; leave it and only fill consumption + cost.
  await page.getByLabel('Consum').fill('420');
  await page.getByLabel('Cost (lei)').fill('318');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Citire adăugată.')).toBeVisible();
});

test('F48 — warranty registry shows expired and active status badges', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/garantii');
  // Seeded wr-3: Pompă circulație, expires_at 2024-04-01 — well past today.
  await expect(page.getByText('expirată').first()).toBeVisible();
  // Seeded wr-1: Hidrofor Grundfos, expires_at 2027-09-15 — valid today.
  await expect(page.getByText('în garanție').first()).toBeVisible();
});

test('F50 — resident views the evacuation plan route and listed fire-safety equipment', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/evacuare');
  // Seeded ev-1: scara A plan with a route description and two equipment entries.
  await expect(page.getByText('Scara A')).toBeVisible();
  await expect(page.getByText('Echipamente de siguranță')).toBeVisible();
  // Equipment entry: stingator -> "Stingător"
  await expect(page.getByText('Stingător').first()).toBeVisible();
});

test('F51 — committee marks an overdue PSI check done; rescheduling toast appears', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/psi');
  // Seeded psi-1 has next_check 3 days in the past, so it shows the "depășit" badge.
  await expect(page.getByText('depășit').first()).toBeVisible();
  await page.getByRole('button', { name: /Marchează verificat/i }).first().click();
  await expect(page.getByText('Verificare înregistrată. Termenul a fost reprogramat.')).toBeVisible();
});

test('F52 — insurance policy expiring within 30 days shows "expiră curând" badge', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/asigurare');
  // Seeded ins-1 expires in 18 days from today → within the expiring-soon threshold.
  await expect(page.getByText('expiră curând')).toBeVisible();
  // Renewal alert banner is also shown.
  await expect(page.getByText(/polițe expiră/i)).toBeVisible();
});

test('F53 — committee adds a new key holder for a common space', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/chei');
  await page.getByRole('button', { name: /Adaugă cheie/i }).click();
  await page.getByLabel('Spațiu').fill('Sala de fitness');
  await page.getByLabel('Deținător').fill('Ionescu Mihai');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Cheie adăugată.')).toBeVisible();
  await expect(page.getByText('Sala de fitness')).toBeVisible();
});

test('F57 — resident posts a marketplace listing; it appears in the feed', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/marketplace');
  await page.getByRole('button', { name: /Anunț nou/i }).click();
  await page.getByLabel('Titlu').fill('Bicicletă copii 20"');
  await page.getByLabel('Preț (lei)').fill('150');
  await page.getByRole('button', { name: /Publică/i }).click();
  await expect(page.getByText('Anunț publicat.')).toBeVisible();
  await expect(page.getByText('Bicicletă copii 20"')).toBeVisible();
});

test('F62 — resident ticks a welcome-kit step and "Parcurs" badge appears', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/welcome-kit');
  // Seeded wk-1: "Citește regulamentul de ordine interioară" is the first step.
  const firstStep = page.locator('.card').filter({ hasText: 'Citește regulamentul' });
  await expect(firstStep).toBeVisible();
  // The checkmark button carries aria-label "Marchează parcurs" when unchecked.
  await firstStep.getByRole('button', { name: /Marchează parcurs/i }).click();
  await expect(firstStep.getByText('Parcurs')).toBeVisible();
});

test('F63 — resident opts into birthday display for today; entry appears in today section', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/aniversari');
  // The demo user (u-res, Popescu Andrei) already has an entry for May 24.
  // The button reads "Editează ziua mea" when an entry exists, "Adaugă ziua mea" otherwise.
  await page.getByRole('button', { name: /ziua mea/i }).click();
  // Set the birthday to today (4 June) so it appears in the "Aniversări azi" section.
  await page.getByLabel('Zi').fill('4');
  await page.getByLabel('Lună').selectOption('6');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Ziua ta a fost salvată.')).toBeVisible();
  // The updated consent now matches today, so the section heading appears.
  await expect(page.getByText('Aniversări azi')).toBeVisible();
});

test('F65 — resident submits platform feedback and thanks toast appears', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/feedback');
  await page.getByLabel('Mesaj').fill('Mi-ar plăcea un calendar pentru evenimente de bloc.');
  await page.getByRole('button', { name: /Trimite feedback/i }).click();
  await expect(page.getByText('Mulțumim pentru feedback!')).toBeVisible();
});
