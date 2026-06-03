import { test, expect, type Page } from '@playwright/test';

/** Happy-path E2E for F25 (spălătorie), F26 (lift mutare), F27 (sală) booking features.
 *  All run in demo mode (offline stores), chromium + mobile. */

async function enterDemo(page: Page) {
  await page.goto('/');
  const demoButton = page.getByRole('button', { name: /modul demonstrativ/i });
  if (await demoButton.count()) await demoButton.first().click();
  await expect(page).toHaveURL(/\/app$/);
}

test('F25 — resident books a laundry slot and cancels it', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/spalatorie');
  // Demo seeded booking lb-2 (Mașină 2, today, u-res) already shows with mine badge.
  await expect(page.getByText('Rezervarea mea').first()).toBeVisible();
  // Open the booking modal; default resource is "Mașină 1" (LAUNDRY_RESOURCES[0]).
  await page.getByRole('button', { name: /Rezervă slot/i }).click();
  // Set a far-future date to avoid any demo-slot conflict.
  await page.getByLabel(/Ziua/i).fill('2027-01-10');
  await page.getByRole('button', { name: /Salvează/i }).click();
  // Success toast.
  await expect(page.getByText('Slot rezervat.')).toBeVisible();
  // The new "Mașină 1" booking is mine (lb-1 belongs to Georgescu Elena, not the demo user).
  const newCard = page.locator('.card').filter({ hasText: /Mașină 1/ }).filter({ hasText: /Rezervarea mea/ });
  await expect(newCard).toBeVisible();
  // Cancel it; the card disappears.
  await newCard.getByRole('button', { name: /Anulează/i }).click();
  await expect(newCard).not.toBeVisible();
});

test('F26 — resident books the elevator for moving and cancels it', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/lift-mutare');
  // Demo seeded booking mv-2 (day+3, u-res) already shows with mine badge.
  await expect(page.getByText('Rezervarea mea').first()).toBeVisible();
  // Open the booking modal; default slot is "08:00–11:00" (MOVING_SLOTS[0]).
  await page.getByRole('button', { name: /Rezervă liftul/i }).click();
  await page.getByLabel(/Ziua/i).fill('2027-02-10');
  // Floor is required for isValidBooking; use 5 (distinct from demo floors 4 and 7).
  await page.getByLabel(/Etajul destinație/i).fill('5');
  await page.getByRole('button', { name: /Salvează/i }).click();
  // Success toast.
  await expect(page.getByText('Lift rezervat.')).toBeVisible();
  // "Etaj 5" is unique in the demo list (mv-1=4, mv-2=7).
  const newCard = page.locator('.card').filter({ hasText: /Etaj 5/ });
  await expect(newCard).toBeVisible();
  await expect(newCard.getByText('Rezervarea mea')).toBeVisible();
  // Cancel it.
  await newCard.getByRole('button', { name: /Anulează/i }).click();
  await expect(newCard).not.toBeVisible();
});

test('F27 — resident books the community room and cancels it', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/sala');
  // Demo seeded booking vn-2 (Terasă, u-res) already shows with mine badge.
  await expect(page.getByText('Rezervarea mea').first()).toBeVisible();
  // Open the booking modal; default venue is "Sală comună" (VENUES[0]).
  await page.getByRole('button', { name: /Rezervă spațiul/i }).click();
  await page.getByLabel(/Ziua/i).fill('2027-03-10');
  // Purpose is required for isValidBooking; use a unique string.
  await page.getByLabel(/Eveniment/i).fill('Ședință bloc');
  await page.getByRole('button', { name: /Salvează/i }).click();
  // Success toast.
  await expect(page.getByText('Spațiu rezervat.')).toBeVisible();
  // "Ședință bloc" is unique (demo purposes: "Aniversare 7 ani", "Grătar de vară").
  const newCard = page.locator('.card').filter({ hasText: /Ședință bloc/ });
  await expect(newCard).toBeVisible();
  await expect(newCard.getByText('Rezervarea mea')).toBeVisible();
  // Cancel it.
  await newCard.getByRole('button', { name: /Anulează/i }).click();
  await expect(newCard).not.toBeVisible();
});
