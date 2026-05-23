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

test('T48: resident can start a discussion thread and reply in it', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/discutii');
  await page.getByRole('button', { name: /Subiect nou/i }).click();
  await page.getByLabel('Titlu').fill('Subiect de test E2E');
  await page.getByRole('button', { name: /Salvează/i }).click();
  const thread = page.getByRole('button', { name: /Subiect de test E2E/i });
  await expect(thread).toBeVisible();
  await thread.click();
  await page.getByLabel('Scrie un mesaj…').fill('Primul răspuns de test.');
  await page.getByRole('button', { name: /Trimite mesajul/i }).click();
  await expect(page.getByText('Primul răspuns de test.')).toBeVisible();
});

test('T49: resident can submit a sesizare and see it listed', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/sesizari');
  await page.getByRole('button', { name: /Sesizare nouă/i }).click();
  await page.getByLabel('Titlu').fill('Sesizare de test E2E');
  await page.getByLabel('Descriere').fill('Descriere de test pentru sesizare.');
  await page.getByRole('button', { name: /Creează/i }).click();
  await expect(page.getByRole('heading', { name: 'Sesizare de test E2E' })).toBeVisible();
});

test('T12: resident customizes the home — hides a card and the choice persists', async ({ page }) => {
  await enterDemo(page);
  const main = page.locator('main');
  // The F01 shortcut card is on the home grid by default (scoped to main so the
  // sidebar nav item of the same name does not interfere).
  await expect(main.getByText('Anunțuri oficiale')).toBeVisible();
  // Enter edit mode and hide the first visible card (F01).
  await page.getByRole('button', { name: /Personalizează/i }).click();
  await expect(page.getByText(/Modificările se salvează automat/i)).toBeVisible();
  await main.getByRole('button', { name: 'Ascunde cardul' }).first().click();
  // Exit edit mode — the hidden card no longer shows on the grid.
  await page.getByRole('button', { name: /^Gata$/ }).click();
  await expect(main.getByText('Anunțuri oficiale')).toBeHidden();
  // The personalized layout survives a reload (saved per resident).
  await page.reload();
  await expect(main.getByText('Anunțuri oficiale')).toBeHidden();
});

test('T22: admin records a personal-data breach and sees it logged with notifications', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/admin/incidente-date');
  await expect(page.getByRole('heading', { name: 'Incidente de securitate a datelor' })).toBeVisible();
  await page.getByLabel('Titlu').fill('Acces neautorizat E2E');
  await page.getByLabel('Descriere').fill('Lista de contacte a fost expusă în testul E2E.');
  // High risk → article 34 resident notice becomes available.
  await page.getByRole('switch', { name: 'Date sensibile' }).click();
  await page.getByRole('button', { name: /Înregistrează incidentul/i }).click();
  await expect(page.getByText('Acces neautorizat E2E')).toBeVisible();
  await expect(page.getByRole('button', { name: /Notificare ANSPDCP/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Informare locatari/i })).toBeVisible();
});

test('T09: admin views the audit log and a feature toggle is recorded', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/admin/jurnal');
  await expect(page.getByRole('heading', { name: 'Jurnal de audit' })).toBeVisible();
  // The demo asociație is seeded with a valid chain; integrity must verify.
  await expect(page.getByText('Lanț integru')).toBeVisible();
  await expect(page.getByText('Curățenie generală scara A')).toBeVisible();
  // Toggle a feature, then confirm the change is appended to the trail.
  await page.goto('/app/admin/functionalitati');
  const row = page.locator('div', { hasText: 'Anunțuri oficiale' }).first();
  await row.getByRole('switch').click();
  await page.goto('/app/admin/jurnal');
  await expect(page.getByText('Funcționalitate dezactivată')).toBeVisible();
  await expect(page.getByText('Lanț integru')).toBeVisible();
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

test('T44: a disabled module is blocked when reached by direct URL', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/admin/functionalitati');
  // Disable F01 Anunțuri, then try to reach its page by typing the URL.
  const row = page.locator('div', { hasText: 'Anunțuri oficiale' }).first();
  await row.getByRole('switch').click();
  await page.goto('/app/anunturi');
  await expect(page.getByText(/nu este activată pentru asociația ta/i)).toBeVisible();
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

test('T42: resident joins an asociație with an issued invite code', async ({ page }) => {
  await enterDemo(page);
  // Admin issues an invite code from the invites surface.
  await page.goto('/app/admin/invitatii');
  await page.getByRole('button', { name: /Generează codul/i }).click();
  const code = (await page.locator('code').first().innerText()).trim();
  expect(code).toMatch(/^[A-Z2-9]{8}$/);
  // Redeem it from the join screen.
  await page.goto('/onboarding/alatura');
  await page.getByLabel(/Cod de invitație/i).fill(code);
  await page.getByRole('button', { name: /Alătură-mă/i }).click();
  await expect(page).toHaveURL(/\/app$/);
});

test('T42: an invalid invite code is rejected with a clear message', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/onboarding/alatura');
  await page.getByLabel(/Cod de invitație/i).fill('NOPE2345');
  await page.getByRole('button', { name: /Alătură-mă/i }).click();
  await expect(page.getByText(/Cod invalid/i)).toBeVisible();
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

test('F19: admin can add a scheduled maintenance task', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/mentenanta');
  await page.getByRole('button', { name: /Adaugă lucrare/i }).click();
  await page.getByLabel('Lucrare').fill('Test revizie E2E');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Test revizie E2E')).toBeVisible();
});

test('F28: resident can add a parking spot', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/parcare');
  await page.getByRole('button', { name: /Adaugă loc/i }).click();
  await page.getByLabel('Loc (etichetă)').fill('P99');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('P99')).toBeVisible();
});

test('F16: resident can sign a petition', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/petitii');
  await expect(page.getByText(/firmei de curățenie/i)).toBeVisible();
  await page.getByRole('button', { name: 'Semnează', exact: true }).first().click();
  await expect(page.getByText('Ai semnat').first()).toBeVisible();
});

test('F44: resident can pledge to a crowdfund', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/crowdfund');
  await page.getByRole('button', { name: /Promite o contribuție/i }).first().click();
  await page.getByLabel(/Suma promisă/i).fill('100');
  await page.getByRole('button', { name: /Promite o contribuție/i }).last().click();
  await expect(page.getByText('Mulțumim pentru promisiune').first()).toBeVisible();
});

test('F46: repair-fund calculator shows a recommendation', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/fond-reparatii');
  await page.getByLabel(/Suprafață construită/i).fill('2400');
  await expect(page.getByText(/lei\/m²\/lună/i)).toBeVisible();
});

test('F51: comitet can add a PSI asset', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/psi');
  await page.getByRole('button', { name: /Adaugă echipament/i }).click();
  await page.getByLabel('Echipament').fill('Test stingător E2E');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Test stingător E2E')).toBeVisible();
});

test('F52: comitet can add an insurance policy', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/asigurare');
  await page.getByRole('button', { name: /Adaugă poliță/i }).click();
  await page.getByLabel('Asigurător').fill('Test Asig E2E');
  await page.getByLabel('Număr poliță').fill('POL-E2E-1');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Test Asig E2E')).toBeVisible();
});

test('F53: comitet can add a key record', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/chei');
  await page.getByRole('button', { name: /Adaugă cheie/i }).click();
  await page.getByLabel('Spațiu').fill('Test spațiu E2E');
  await page.getByLabel('Deținător').fill('Test deținător');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Test spațiu E2E')).toBeVisible();
});

test('F05: resident can send an anonymous message', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/anonim');
  await page.getByRole('button', { name: /Mesaj anonim/i }).click();
  await page.getByLabel(/Mesajul tău/i).fill('Sesizare anonimă de test E2E pentru comitet.');
  await page.getByRole('button', { name: /Trimite/i }).click();
  await expect(page.getByText(/trimis anonim/i)).toBeVisible();
});

test('F11: comitet can add a minutes document', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/procese-verbale');
  await page.getByRole('button', { name: /Adaugă document/i }).click();
  await page.getByLabel('Titlu').fill('PV test E2E');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('PV test E2E')).toBeVisible();
});

test('F22: comitet can post an RFP', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/oferte');
  await page.getByRole('button', { name: /Cerere nouă/i }).click();
  await page.getByLabel('Titlu').fill('RFP test E2E');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('RFP test E2E')).toBeVisible();
});

test('F23: resident can sign up for weekend duty', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/garda');
  await page.getByRole('button', { name: /Mă înscriu/i }).first().click();
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText(/de gardă\. Mulțumim/i)).toBeVisible();
});

test('F31: resident can sign up for a green-space task', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/plante');
  await page.getByRole('button', { name: /Mă înscriu/i }).first().click();
  await expect(page.getByText('Popescu Andrei').first()).toBeVisible();
});

test('F39: resident can add a wiki page', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/wiki');
  await page.getByRole('button', { name: /Pagină nouă/i }).click();
  await page.getByLabel('Titlu').fill('Pagină wiki E2E');
  await page.getByLabel('Conținut').fill('Conținut de test pentru wiki.');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Pagină wiki E2E')).toBeVisible();
});

test('F43: comitet can add a contractor', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/contractori');
  await page.getByRole('button', { name: /Adaugă contractor/i }).click();
  await page.getByLabel('Nume').fill('Contractor E2E');
  await page.getByLabel('Specialitate').fill('Testare');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Contractor E2E')).toBeVisible();
});

test('F55: admin can add an alarm system', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/alarma');
  await page.getByRole('button', { name: /Adaugă sistem/i }).click();
  await page.getByLabel(/Denumire sistem/i).fill('Sistem alarmă E2E');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Sistem alarmă E2E')).toBeVisible();
});

test('F02: resident can start a discussion thread', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/discutii');
  await page.getByRole('button', { name: /Subiect nou/i }).click();
  await page.getByLabel('Titlu').fill('Subiect E2E');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Subiect E2E')).toBeVisible();
});

test('F12: resident can vote on a budget proposal', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/buget');
  await page.getByRole('button', { name: 'Votează', exact: true }).first().click();
  await expect(page.getByRole('button', { name: /Votat/i }).first()).toBeVisible();
});

test('F10: proprietar can vote on an AGA agenda item', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/aga');
  await page.getByRole('button', { name: /AGA ordinară 2026/i }).click();
  await page.getByRole('button', { name: 'Pentru', exact: true }).first().click();
  await expect(page.getByText(/Pentru \d+ ·/).first()).toBeVisible();
});

test('F13: resident can reorder project priorities', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/prioritati');
  await page.getByRole('button', { name: /Mută mai sus/i }).nth(1).click();
  await expect(page.getByText('Modernizare lift')).toBeVisible();
});

test('F25: resident can book a laundry slot', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/spalatorie');
  await page.getByRole('button', { name: /Rezervă slot/i }).click();
  await page.getByLabel('Interval orar').selectOption('12:00–14:00');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('12:00–14:00')).toBeVisible();
});

test('F26: resident can book the moving elevator', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/lift-mutare');
  await page.getByRole('button', { name: /Rezervă liftul/i }).click();
  await page.getByLabel('Interval orar').selectOption('11:00–14:00');
  await page.getByLabel('Etajul destinație').fill('5');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('11:00–14:00')).toBeVisible();
});

test('F27: resident can book the community room', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/sala');
  await page.getByRole('button', { name: /Rezervă spațiul/i }).click();
  await page.getByLabel('Interval orar').selectOption('14:00–18:00');
  await page.getByLabel('Eveniment').fill('Aniversare');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Aniversare').first()).toBeVisible();
});

test('F04: resident can message the administrator', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/mesaje-admin');
  await page.getByRole('button', { name: /Mesaj nou/i }).click();
  await page.getByLabel('Subiect').fill('Întrebare despre fond rulment');
  await page.getByLabel('Mesaj').fill('Bună ziua, am o întrebare despre fondul de rulment.');
  await page.getByRole('button', { name: /Trimite/i }).click();
  await expect(page.getByText('Întrebare despre fond rulment')).toBeVisible();
});

test('F62: resident can add a welcome-kit step', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/welcome-kit');
  await page.getByRole('button', { name: /Adaugă pas/i }).click();
  await page.getByLabel('Titlu').fill('Pas de test E2E');
  await page.getByLabel('Detalii').fill('Descriere de test pentru pasul de bun-venit.');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Pas de test E2E')).toBeVisible();
});

test('F64: resident can propose a kids activity', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/copii');
  await page.getByRole('button', { name: /Propune o activitate/i }).click();
  await page.getByLabel('Titlu').fill('Concurs de desene pe asfalt');
  await page.getByLabel('Locul').fill('Locul de joacă din curte');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Concurs de desene pe asfalt')).toBeVisible();
});

test('F41: comitet can add a project', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/proiecte');
  await page.getByRole('button', { name: /Proiect nou/i }).click();
  await page.getByLabel('Titlu').fill('Înlocuire interfon E2E');
  await page.getByLabel(/Buget alocat/i).fill('15000');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Înlocuire interfon E2E')).toBeVisible();
});

test('F42: resident can add a photo-journal entry', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/jurnal-foto');
  await page.getByRole('button', { name: /Adaugă fotografie/i }).click();
  await page.getByLabel('Descriere').fill('Fotografie de test E2E pentru jurnal.');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Fotografie de test E2E pentru jurnal.')).toBeVisible();
});

test('F49: resident can add a trusted contact', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/cod-siguranta');
  await page.getByRole('button', { name: /Adaugă persoană/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nume').fill('Vecina Ana E2E');
  await dialog.getByLabel('Telefon').fill('+40 740 222 333');
  await dialog.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Vecina Ana E2E')).toBeVisible();
});

test('F50: resident can mark pets for the evacuation plan', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/evacuare');
  await page.getByRole('button', { name: /Marchează animale/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Animale/i).fill('2 pisici E2E');
  await dialog.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText(/2 pisici E2E/)).toBeVisible();
});

test('T54: the full MVP loop works end-to-end in demo mode', async ({ page }) => {
  // 1. Demo entry lands on the home feed (no backend required).
  await enterDemo(page);

  // 2. There is an active asociație + role: the home header shows the active
  //    asociație's name as its subtitle (demo entry seeds currentAsociatieId).
  await expect(page.getByRole('heading', { name: 'Acasă' })).toBeVisible();
  await expect(page.getByText('Asociația de Proprietari Bloc 12, Scara A')).toBeVisible();

  // 3. Create/join: an admin issues an invite code, a user redeems it and lands
  //    back in an active tenant context.
  await page.goto('/app/admin/invitatii');
  await page.getByRole('button', { name: /Generează codul/i }).click();
  const code = (await page.locator('code').first().innerText()).trim();
  expect(code).toMatch(/^[A-Z2-9]{8}$/);
  await page.goto('/onboarding/alatura');
  await page.getByLabel(/Cod de invitație/i).fill(code);
  await page.getByRole('button', { name: /Alătură-mă/i }).click();
  await expect(page).toHaveURL(/\/app$/);

  // 4. An enabled module loads.
  await page.goto('/app/anunturi');
  await expect(page.getByRole('heading', { name: /Anunțuri/i }).first()).toBeVisible();

  // 5. Admin publishes an announcement; a resident can read it.
  await page.getByRole('button', { name: /Anunț nou/i }).click();
  await page.getByLabel('Titlu').fill('Anunț pentru bucla MVP');
  await page.getByLabel('Conținut').fill('Conținut de test pentru bucla completă.');
  await page.getByRole('button', { name: /Publică/i }).click();
  await expect(page.getByRole('heading', { name: 'Anunț pentru bucla MVP' })).toBeVisible();
  // Read it from the home feed's recent-announcements widget.
  await page.goto('/app');
  await expect(page.getByText('Anunț pentru bucla MVP').first()).toBeVisible();

  // 6. A resident starts a structured discussion and posts in it.
  await page.goto('/app/discutii');
  await page.getByRole('button', { name: /Subiect nou/i }).click();
  await page.getByLabel('Titlu').fill('Subiect pentru bucla MVP');
  await page.getByRole('button', { name: /Salvează/i }).click();
  const thread = page.getByRole('button', { name: /Subiect pentru bucla MVP/i });
  await expect(thread).toBeVisible();
  await thread.click();
  await page.getByLabel('Scrie un mesaj…').fill('Mesaj de test în bucla MVP.');
  await page.getByRole('button', { name: /Trimite mesajul/i }).click();
  await expect(page.getByText('Mesaj de test în bucla MVP.')).toBeVisible();

  // 7. A resident submits a sesizare and sees it listed.
  await page.goto('/app/sesizari');
  await page.getByRole('button', { name: /Sesizare nouă/i }).click();
  await page.getByLabel('Titlu').fill('Sesizare pentru bucla MVP');
  await page.getByLabel('Descriere').fill('Descriere de test pentru bucla MVP.');
  await page.getByRole('button', { name: /Creează/i }).click();
  await expect(page.getByRole('heading', { name: 'Sesizare pentru bucla MVP' })).toBeVisible();

  // 8. A disabled module is hidden AND blocked by direct URL. Demo enables every
  //    module (T44), so disable F01 Anunțuri first, then type its URL.
  await page.goto('/app/admin/functionalitati');
  const row = page.locator('div', { hasText: 'Anunțuri oficiale' }).first();
  await row.getByRole('switch').click();
  await page.goto('/app/anunturi');
  await expect(page.getByText(/nu este activată pentru asociația ta/i)).toBeVisible();
});

test('T06: resident files an erasure request and an admin actions it', async ({ page }) => {
  await enterDemo(page);
  // Resident self-service: request account erasure from "Datele mele personale".
  await page.goto('/app/datele-mele');
  await page.getByRole('button', { name: /Cere ștergerea contului/i }).click();
  // It appears in the resident's own request list as pending.
  await expect(page.getByText('În așteptare').first()).toBeVisible();
  // The association admin reviews and completes it in the request queue.
  await page.goto('/app/admin/cereri-date');
  await page.getByRole('button', { name: /Finalizează/i }).first().click();
  await expect(page.getByText('Finalizată').first()).toBeVisible();
});

test('T11 (F66): resident edits their profile and adds a custom field', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/profil');
  await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
  // Editing a standard field autosaves and shows the "saved" indicator.
  await page.getByLabel('Nume afișat').fill('Andrei E2E');
  await expect(page.getByText('Salvat')).toBeVisible();
  // Add a custom field through the modal and see it render in the list.
  await page.getByRole('button', { name: 'Adaugă câmp' }).click();
  await page.getByLabel('Eticheta câmpului').fill('Hobby');
  await page.getByRole('button', { name: /Creează/i }).click();
  await expect(page.getByText('Hobby')).toBeVisible();
});

test('home page has no critical accessibility violations', async ({ page }) => {
  await enterDemo(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const serious = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? ''));
  expect(serious).toEqual([]);
});
