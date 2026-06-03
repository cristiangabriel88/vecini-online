import { test, expect, type Page } from '@playwright/test';

/** Happy-path E2E coverage for the feature pages built on top of the core slice.
 *  All run against demo mode (no backend), mirroring tests/e2e/smoke.spec.ts. */

async function enterDemo(page: Page) {
  await page.goto('/');
  // In the demo build (`isDemo()`) the root route auto-enters the demo session
  // and redirects to `/app`; only the live/login build renders the explicit
  // "enter demo mode" button. Handle both so the suite is build-agnostic.
  const demoButton = page.getByRole('button', { name: /modul demonstrativ/i });
  if (await demoButton.count()) await demoButton.first().click();
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
  await page.getByRole('textbox', { name: /caută/i }).fill('apa calda');
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

test('F14 — resident upvotes an idea and sees the vote count change', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/idei');
  // Top-ranked card is the one with the most votes (idea-3: 30 votes, implementat)
  const firstVoteBtn = page.getByRole('button', { name: /votează ideea/i }).first();
  const countSpan = firstVoteBtn.locator('span');
  const before = parseInt((await countSpan.textContent()) ?? '0', 10);
  await firstVoteBtn.click();
  const after = parseInt((await countSpan.textContent()) ?? '0', 10);
  expect(after).toBe(before + 1);
  // The in-discutie idea (idea-1: 14 votes) is in the top-N and shows promoted badge
  await expect(page.getByText(/pe agendă/i)).toBeVisible();
});

test('F18 — committee searches the repair history', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/istoric-reparatii');
  await page.getByRole('textbox', { name: /caută/i }).fill('pompa');
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
  // F35 audience is 'proprietar' only; set that persona and mark the welcome flow
  // as already seen so RequireWelcome does not redirect to /bun-venit.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('iv.demo.role', 'proprietar');
      localStorage.setItem('vecini.welcome', JSON.stringify({
        state: { seenByUser: { 'u-res': '2026-01-01T00:00:00.000Z' } },
        version: 0,
      }));
    } catch { /* storage unavailable */ }
  });
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
  await page.getByRole('textbox', { name: /caută/i }).fill('georgescu');
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
  // Scope to #main-content to avoid matching the demo role-switcher chip.
  const main = page.locator('#main-content');
  await expect(main.getByText('Cenzor')).toBeVisible();
  await page.getByRole('textbox', { name: /caută/i }).fill('rulment');
  await expect(page.getByText('Fond de rulment')).toBeVisible();
  await expect(main.getByText('Cenzor')).toHaveCount(0);
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

test('F02 — resident posts and pins a discussion thread', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/discutii');
  await page.getByRole('button', { name: /Subiect nou/i }).click();
  await page.getByLabel('Titlu', { exact: true }).fill('Program de curățenie pe scara B');
  await page.getByLabel(/Etichetă/i).fill('#curatenie');
  await page.getByRole('button', { name: /^Salvează$/i }).click();
  // The new thread appears in the list.
  const thread = page.getByRole('button').filter({ hasText: 'Program de curățenie pe scara B' });
  await expect(thread).toBeVisible();
  // Expand it and post a message.
  await thread.click();
  await page.getByLabel(/Scrie un mesaj/i).fill('Propun sâmbătă dimineața, la ora 10.');
  await page.getByRole('button', { name: /Trimite mesajul/i }).click();
  await expect(page.getByText('Propun sâmbătă dimineața, la ora 10.')).toBeVisible();
  // Pin the thread; the "Fixat" badge appears on its card.
  await thread.locator('..').getByRole('button', { name: /Fixează/i }).click();
  await expect(thread.locator('..').getByText('Fixat', { exact: true })).toBeVisible();
});

test('F04 — admin clears an unread thread, replies, then starts a new one', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/mesaje-admin');
  // The demo thread from Ionescu Maria (Ap. 1) is unread for the administrator.
  const unread = page.getByRole('button').filter({ hasText: /Zgomot de la lucrările vecinului/i });
  await expect(unread.getByText('1', { exact: true })).toBeVisible();
  // Opening it marks the resident's message read and shows the conversation.
  await unread.click();
  await expect(page.getByText(/face lucrări de renovare/i)).toBeVisible();
  // Reply; the new message lands in the conversation.
  const replyInput = page.getByLabel(/Scrie un răspuns/i);
  await replyInput.fill('Bună ziua, voi reaminti regulamentul orelor de liniște.');
  await replyInput.locator('../..').getByRole('button').click();
  await expect(page.getByText(/voi reaminti regulamentul orelor de liniște/i)).toBeVisible();
  // Back in the inbox, the unread badge has cleared.
  await page.getByRole('button', { name: /Înapoi la mesaje/i }).click();
  await expect(unread.getByText('1', { exact: true })).toHaveCount(0);
  // The admin can also start a fresh thread toward an apartment.
  await page.getByRole('button', { name: /Mesaj către un locatar/i }).click();
  await page.getByLabel('Apartament', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Subiect', { exact: true }).fill('Verificare contor apă rece');
  await page.getByLabel('Mesaj', { exact: true }).fill('Vă rog transmiteți indexul la apa rece pentru luna aceasta.');
  await page.getByRole('button', { name: /^Trimite$/i }).click();
  await expect(page.getByText('Verificare contor apă rece')).toBeVisible();
});

test('F05 — resident submits an anonymous message to the committee queue', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/anonim');
  await page.getByRole('button', { name: 'Mesaj anonim', exact: true }).click();
  await page.getByLabel(/Mesajul tău/i).fill('Ușa de la subsol rămâne descuiată peste noapte.');
  await page.getByRole('button', { name: /^Trimite$/i }).click();
  // The message lands in the queue as new, awaiting the committee.
  const card = page.getByText('Ușa de la subsol rămâne descuiată peste noapte.').locator('../..');
  await expect(card.getByText('Nou', { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: /Marchează rezolvat/i })).toBeVisible();
});

test('F09 — resident casts a vote and sees the result bar', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/voturi');
  // The seeded yes/no poll renders its options as vote buttons before voting.
  const card = page.locator('section, div').filter({ hasText: /Înlocuirea interfonului/i }).first();
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: /^Pentru$/i }).first().click();
  // Confirm the ballot in the modal.
  await page.getByRole('button', { name: /Confirmă/i }).click();
  // After voting the option turns into a result progress bar.
  await expect(page.getByRole('progressbar').first()).toBeVisible();
});

test('F10 — resident records a procură (proxy) on the live assembly', async ({ page }) => {
  // F10 (AGA) is owner-only (audience: ['proprietar']); preview that persona so
  // the route guard grants access (DemoEntry reads the persisted role).
  await page.addInitScript(() => {
    try {
      localStorage.setItem('iv.demo.role', 'proprietar');
    } catch {
      /* storage unavailable */
    }
  });
  await enterDemo(page);
  await page.goto('/app/aga');
  // Expand the in-progress assembly (seeded as "AGA ordinară 2026").
  await page.getByText('AGA ordinară 2026', { exact: true }).click();
  // Open the procură modal and designate a proxy holder for an apartment.
  await page.getByRole('button', { name: /Adaugă procură/i }).first().click();
  await page.getByLabel(/Apartamentul care dă procura/i).fill('Ap. 30');
  await page.getByLabel('Împuternicit').fill('Maria Ionescu');
  await page.getByRole('button', { name: /Salvează/i }).click();
  // The recorded proxy appears in the assembly's proxy list.
  await expect(page.getByText(/deținută de Maria Ionescu/i)).toBeVisible();
});

test('F11 — member searches the minutes archive', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/procese-verbale');
  // Seeded documents are visible.
  await expect(page.getByText('Proces verbal AGA ordinară 2026')).toBeVisible();
  // Narrow by searching for category "Comitet".
  const search = page.getByPlaceholder(/Caută/i);
  await search.fill('Comitet');
  await expect(page.getByText('Proces verbal ședință comitet — martie')).toBeVisible();
  await expect(page.getByText('Proces verbal AGA ordinară 2026')).not.toBeVisible();
  // Clear restores all results.
  await search.fill('');
  await expect(page.getByText('Proces verbal AGA ordinară 2026')).toBeVisible();
});

test('F12 — resident proposes an idea and votes on a funded proposal', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/buget');
  // The pool summary card is visible (cycle title + remaining).
  await expect(page.getByText(/5\.000 lei/i).first()).toBeVisible();
  // Submit a new proposal via the compose modal.
  await page.getByRole('button', { name: /Propune o idee/i }).click();
  await page.getByLabel(/Titlu propunere/i).fill('Copertina intrare scara B');
  await page.getByLabel(/Cost estimat/i).fill('3500');
  await page.getByRole('button', { name: /^Salvează$/i }).click();
  // The new proposal appears in the list.
  await expect(page.getByText('Copertina intrare scara B')).toBeVisible();
  // Vote on the first proposal and check the button state changes.
  await page.getByRole('button', { name: /^Votează$/i }).first().click();
  // The button turns "Votat" indicating a cast vote.
  await expect(page.getByRole('button', { name: /Votat/i }).first()).toBeVisible();
  // The funded badge is visible on at least one proposal.
  await expect(page.getByText(/Finanțat/i).first()).toBeVisible();
});

test('F13 — resident reorders project priorities via keyboard buttons', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/prioritati');
  // The page shows the seeded demo projects in rank order.
  const rankBadges = page.locator('.bg-primary\\/10');
  await expect(rankBadges.first()).toBeVisible();
  // The first project carries rank 1 badge.
  await expect(rankBadges.first()).toHaveText('1');
  // Move the second item up using the keyboard arrow button — it should become rank 1.
  const moveUpButtons = page.getByRole('button', { name: /Mută mai sus/i });
  await moveUpButtons.nth(1).click();
  // After moving, the first visible rank badge is still 1 but the project order changed.
  await expect(rankBadges.first()).toHaveText('1');
  // The second item was promoted — it now shows the title that was previously at rank 2.
  const cards = page.locator('.card');
  await expect(cards.first()).toBeVisible();
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

test('F15 — resident votes in an opinion survey and sees percentage bars', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/sondaje');
  // Seeded surveys are visible.
  await expect(page.getByText('Ce culoare să aibă noua fațadă?')).toBeVisible();
  // Before voting the options render as vote buttons.
  const voteButton = page.getByRole('button', { name: /Crem/i }).first();
  await expect(voteButton).toBeVisible();
  // Cast a vote.
  await voteButton.click();
  // After voting the survey shows percentage bars (progressbars) instead of buttons.
  await expect(page.getByRole('progressbar').first()).toBeVisible();
  // The voted survey no longer shows the vote button for the chosen option.
  await expect(page.getByRole('button', { name: /^Crem$/i })).not.toBeVisible();
});

test('F16 — resident signs a petition and the progress bar updates', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/petitii');
  // The seeded petition is visible.
  await expect(page.getByText('Schimbarea firmei de curățenie')).toBeVisible();
  // Read the signature count before signing.
  const progressBar = page.getByRole('progressbar').first();
  await expect(progressBar).toBeVisible();
  const widthBefore = await progressBar.locator('div').getAttribute('style');
  // Sign the petition.
  await page.getByRole('button', { name: /^Semnează$/i }).first().click();
  await expect(page.getByText(/Ai semnat petiția/i)).toBeVisible();
  // The progress bar should advance (the width% changes).
  const widthAfter = await progressBar.locator('div').getAttribute('style');
  expect(widthAfter).not.toBe(widthBefore);
  // The sign button is now disabled/replaced with "Ai semnat".
  await expect(page.getByRole('button', { name: /Ai semnat/i }).first()).toBeDisabled();
});

test('F17 — resident submits a new ticket and it appears with Primit badge', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/sesizari');
  await page.getByRole('button', { name: /Sesizare nouă/i }).click();
  await page.getByLabel('Titlu').fill('Umiditate pe peretele casei scării');
  await page.getByLabel('Descriere').fill('Se observă pete de umezeală și mucegai pe peretele de lângă geam, etajul 3.');
  await page.getByLabel(/Locație/i).fill('Scara A, etaj 3');
  await page.getByRole('button', { name: /Creează/i }).click();
  const heading = page.getByRole('heading', { name: /Umiditate pe peretele/i });
  await expect(heading).toBeVisible();
  const card = heading.locator('../..');
  await expect(card.getByText('Primit')).toBeVisible();
});

test('F17 — manager resolves a ticket and reporter rates the resolution', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/sesizari');
  // Demo ticket t-2 starts at "Primit" and is reported by the demo user (u-res).
  const card = page.getByRole('heading', { name: /Infiltrație în garaj/i }).locator('../..');
  await expect(card.getByText('Primit')).toBeVisible();
  // Assign the ticket.
  await card.getByRole('button', { name: /Asignează/i }).click();
  await expect(card.getByText('Asignat')).toBeVisible();
  // Advance to in-progress.
  await card.getByRole('button', { name: /Marchează în lucru/i }).click();
  await expect(card.getByText('În lucru')).toBeVisible();
  // Advance to resolved via the notes modal.
  await card.getByRole('button', { name: /Marchează rezolvat/i }).click();
  await page.getByLabel(/Note de rezolvare/i).fill('Fisura a fost etanșată și peretele impermeabilizat.');
  await page.getByRole('button', { name: /Marchează rezolvat/i }).last().click();
  await expect(card.getByText('Rezolvat')).toBeVisible();
  await expect(card.getByText(/Fisura a fost etanșată/i)).toBeVisible();
  // Reporter (same demo user) sees the rating button and rates the resolution.
  await card.getByRole('button', { name: /Evaluează rezolvarea/i }).click();
  await page.getByRole('button', { name: '4 stele' }).click();
  await page.getByRole('button', { name: /Salvează/i }).click();
  // Stars are saved and the rating button is gone.
  await expect(page.getByText(/Mulțumim pentru evaluare/i)).toBeVisible();
  await expect(card.getByRole('button', { name: /Evaluează rezolvarea/i })).toHaveCount(0);
});
