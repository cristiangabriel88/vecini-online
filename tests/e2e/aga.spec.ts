import { test, expect, type Page } from '@playwright/test';

async function dismissConsent(page: Page) {
  const banner = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole('button', { name: /Accept(ă)? tot/i }).click({ force: true });
    await banner.waitFor({ state: 'hidden' }).catch(() => {});
  }
}

async function enterDemoAsProprietar(page: Page) {
  await page.goto('/');
  await dismissConsent(page);
  const demoButton = page.getByRole('button', { name: /modul demonstrativ/i });
  if (await demoButton.count()) await demoButton.first().click();
  await expect(page).toHaveURL(/\/app$/);
  // AGA is audience-gated to proprietar; mark the welcome tour as seen so we
  // land straight on the app page on the next navigation.
  await page.evaluate(() => {
    localStorage.setItem('iv.demo.role', 'proprietar');
    const raw = localStorage.getItem('vecini.welcome');
    const data = raw
      ? (JSON.parse(raw) as { state: { seenByUser: Record<string, string> }; version: number })
      : { state: { seenByUser: {} }, version: 0 };
    data.state.seenByUser['u-res'] = new Date().toISOString();
    localStorage.setItem('vecini.welcome', JSON.stringify(data));
  });
}

test('F10 AGA lifecycle: convocare -> RSVP -> agenda item -> open -> vote -> quorum -> close -> PV', async ({
  page,
}) => {
  await enterDemoAsProprietar(page);
  await page.goto('/app/aga');
  await expect(page.getByRole('heading', { name: /AGA digitală/i })).toBeVisible();

  // --- Step 1: Convocare (create a new meeting) ---
  await page.getByRole('button', { name: /AGA nouă/i }).click();
  const newMeetingDialog = page.getByRole('dialog', { name: /AGA nouă/i });
  await newMeetingDialog.waitFor({ state: 'visible' });
  await newMeetingDialog.getByLabel('Titlul adunării').fill('AGA test lifecycle E2E');
  await newMeetingDialog.getByLabel('Data și ora').fill('2026-12-20T18:00');
  await newMeetingDialog.getByLabel('Locul').fill('Sala de ședințe E2E');
  await newMeetingDialog.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Adunare convocată.')).toBeVisible();
  await expect(page.getByText('AGA test lifecycle E2E')).toBeVisible();

  // --- Step 2: Expand the newly created meeting ---
  await page.getByRole('button', { name: /AGA test lifecycle E2E/i }).click();

  // --- Step 3: Add an agenda item (button only shown while convocata) ---
  await page.getByRole('button', { name: /Adaugă punct pe ordinea de zi/i }).click();
  const agendaDialog = page.getByRole('dialog', { name: /Adaugă punct/i });
  await agendaDialog.waitFor({ state: 'visible' });
  await agendaDialog.getByLabel('Titlul punctului').fill('Aprobarea bugetului test E2E');
  await agendaDialog.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Punct adăugat pe ordinea de zi.')).toBeVisible();
  await expect(page.getByText('Aprobarea bugetului test E2E')).toBeVisible();

  // --- Step 4: RSVP as present (only my meeting is expanded so button is unambiguous) ---
  await page.getByRole('button', { name: 'Prezent', exact: true }).click();

  // --- Step 5: Open the meeting (convocata -> in_desfasurare) ---
  await page.getByRole('button', { name: /Deschide adunarea/i }).click();
  await expect(page.getByText('În desfășurare').first()).toBeVisible();

  // --- Step 6: Vote on the agenda item (vote buttons appear only for in_desfasurare) ---
  await page.getByRole('button', { name: 'Pentru', exact: true }).first().click();
  // itemTally adds my_vote to the stored votes, so the tally now shows "Pentru 1".
  await expect(page.getByText(/Pentru 1/).first()).toBeVisible();

  // --- Step 7: Quorum indicator is rendered ---
  await expect(page.getByText(/Reprezentate \d+ din \d+ apartamente/).first()).toBeVisible();

  // --- Step 8: Close the meeting (in_desfasurare -> incheiata) ---
  await page.getByRole('button', { name: /Închide adunarea/i }).click();
  await expect(page.getByText('Încheiată').first()).toBeVisible();

  // --- Step 9: Download proces-verbal (text fallback in demo mode) ---
  await page.getByRole('button', { name: /Descarcă proces-verbal/i }).click();
  await expect(page.getByText('Proces-verbal descărcat.')).toBeVisible();
});
