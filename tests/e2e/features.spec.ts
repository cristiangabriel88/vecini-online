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

test('F21 — committee reviews and acknowledges a recurring issue', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/sesizari-recurente');
  // The repeated lift breakdown on scara A surfaces as a recurring pattern.
  await expect(page.getByRole('heading', { name: /Lift, scara A/i })).toBeVisible();
  await page.getByRole('button', { name: /Marchează drept cunoscut/i }).first().click();
  await expect(page.getByText('Cunoscut').first()).toBeVisible();
});

test('F35 — resident sees their apartment info aggregation', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/apartament-info');
  // Apartment summary header.
  await expect(page.getByRole('heading', { name: 'Ap. 5' })).toBeVisible();
  // Meter readings aggregated from the meters store.
  await expect(page.getByText(/Ultimul index/).first()).toBeVisible();
  // Tickets submitted by this resident are listed.
  await expect(page.getByText(/în lucru · .* rezolvate/)).toBeVisible();
});

test('F36 — resident searches the opt-in neighbour directory', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/vecini');
  await expect(page.getByText('Georgescu Elena')).toBeVisible();
  await page.getByLabel(/caută/i).fill('georgescu');
  await expect(page.getByText('Georgescu Elena')).toBeVisible();
  await expect(page.getByText('Stan Gabriela')).toHaveCount(0);
});

test('F38 — resident posts a thank-you to the wall', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/multumiri');
  await page.getByRole('button', { name: /Mulțumește/i }).click();
  await page.getByLabel(/Către apartamentul/i).fill('17');
  await page.getByLabel('Mesaj').fill('Mulțumesc pentru ajutorul cu mutarea canapelei!');
  await page.getByRole('button', { name: /Publică/i }).click();
  await expect(page.getByText(/ajutorul cu mutarea canapelei/i)).toBeVisible();
});

test('F40 — resident searches the glossary', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/glosar');
  await expect(page.getByText('Cenzor')).toBeVisible();
  await page.getByLabel(/caută/i).fill('rulment');
  await expect(page.getByText('Fond de rulment')).toBeVisible();
  await expect(page.getByText('Cenzor')).toHaveCount(0);
});

test('T67 - admin advances a ticket through the status lifecycle', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/sesizari');
  // Demo ticket t-2 "Infiltrație în garaj" starts at status "Primit" (primit).
  const card = page.getByRole('heading', { name: /Infiltrație în garaj/i }).locator('../..');
  await expect(card.getByText('Primit')).toBeVisible();
  // Admin action bar: assign the ticket.
  await card.getByRole('button', { name: /Asignează/i }).click();
  await expect(card.getByText('Asignat')).toBeVisible();
  // Advance to in-progress.
  await card.getByRole('button', { name: /Marchează în lucru/i }).click();
  await expect(card.getByText('În lucru')).toBeVisible();
  // Advance to resolved via the notes modal.
  await card.getByRole('button', { name: /Marchează rezolvat/i }).click();
  await page.getByLabel(/Note de rezolvare/i).fill('Fisura a fost etanșată.');
  await page.getByRole('button', { name: /Marchează rezolvat/i }).last().click();
  await expect(card.getByText('Rezolvat')).toBeVisible();
  await expect(card.getByText(/Fisura a fost etanșată/i)).toBeVisible();
});

test('F08 — resident views upcoming events and RSVPs', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/evenimente');
  // Agenda view groups events; the demo AGA event is upcoming.
  await expect(page.getByRole('heading', { name: /Adunarea Generală anuală/i })).toBeVisible();
  const card = page.getByRole('heading', { name: /Adunarea Generală anuală/i }).locator('../..');
  // RSVP toggles the attendee count from 7 to 8.
  await card.getByRole('button', { name: /^Particip$/i }).click();
  await expect(card.getByText(/8 participanți/)).toBeVisible();
  // The month view is reachable via the toggle.
  await page.getByRole('button', { name: /Pe luni/i }).click();
  await expect(page.getByRole('heading', { name: /Adunarea Generală anuală/i })).toBeVisible();
});

test('F03 — committee sends an emergency alert to the building', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/alerte');
  await page.getByRole('button', { name: /Trimite alertă/i }).click();
  // The compose modal shows the real recipient count (9 demo residents).
  await expect(page.getByText(/va ajunge la 9 locatari/i)).toBeVisible();
  await page.getByLabel('Titlu').fill('Scurgere de gaz pe scara A');
  await page.getByLabel(/Conținut|Mesaj|Text/i).fill('Evacuați imediat scara A.');
  // First "Trimite alertă" in the modal opens the bypass confirmation.
  await page.getByRole('button', { name: /^Trimite alertă$/i }).last().click();
  await page.getByRole('button', { name: /Confirmă/i }).click();
  await expect(page.getByRole('heading', { name: /Scurgere de gaz pe scara A/i })).toBeVisible();
});
