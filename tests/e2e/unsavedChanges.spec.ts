import { test, expect, type Page } from '@playwright/test';

async function dismissConsent(page: Page) {
  const banner = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole('button', { name: /Accept(ă)? tot/i }).click({ force: true });
    await banner.waitFor({ state: 'hidden' }).catch(() => {});
  }
}

async function enterDemoAsAdmin(page: Page) {
  await page.goto('/');
  await dismissConsent(page);
  const demoButton = page.getByRole('button', { name: /modul demonstrativ/i });
  if (await demoButton.count()) await demoButton.first().click();
  await expect(page).toHaveURL(/\/app$/);
}

test('T267: guard blocks navigation on dirty form, cancel keeps user on page', async ({ page }) => {
  await enterDemoAsAdmin(page);
  await page.goto('/app/admin/apartamente/adauga');

  // Type in the apartment-number field to make the form dirty.
  await page.getByLabel(/apartament\s*\*/i).fill('99');

  // Click the Back button, which triggers a programmatic navigate.
  await page.getByRole('button', { name: /Înapoi|Back/i }).click();

  // The unsaved-changes modal must appear.
  const modal = page.getByRole('dialog', { name: /Modificări nesalvate|Unsaved changes/i });
  await expect(modal).toBeVisible();

  // Click "Stay" -- navigation is cancelled, user stays on the form.
  await modal.getByRole('button', { name: /Rămâi|Stay/i }).click();
  await expect(modal).toBeHidden();
  await expect(page).toHaveURL(/\/adauga$/);
});

test('T267: guard allows navigation when user confirms leaving', async ({ page }) => {
  await enterDemoAsAdmin(page);
  await page.goto('/app/admin/apartamente/adauga');

  // Make the form dirty.
  await page.getByLabel(/apartament\s*\*/i).fill('88');

  // Trigger navigation away.
  await page.getByRole('button', { name: /Înapoi|Back/i }).click();

  const modal = page.getByRole('dialog', { name: /Modificări nesalvate|Unsaved changes/i });
  await expect(modal).toBeVisible();

  // Click "Leave" -- navigation proceeds.
  await modal.getByRole('button', { name: /Pleacă|Leave/i }).click();
  await expect(page).toHaveURL(/\/apartamente$/);
});

test('T267: guard does not trigger on a clean (unmodified) form', async ({ page }) => {
  await enterDemoAsAdmin(page);
  await page.goto('/app/admin/apartamente/adauga');

  // Do not modify any field; click Back immediately.
  await page.getByRole('button', { name: /Înapoi|Back/i }).click();

  // No guard modal -- navigation proceeds directly.
  await expect(page).toHaveURL(/\/apartamente$/);
});
