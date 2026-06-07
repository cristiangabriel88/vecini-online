import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Dismiss the GDPR consent banner before test interactions.
// `force: true` is needed on mobile emulation where the fixed banner and the fixed
// bottom nav both anchor at bottom:0, causing the pointer hit-test to mismatch.
async function dismissConsent(page: Page) {
  const banner = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole('button', { name: /Accept(ă)? tot/i }).click({ force: true });
    await banner.waitFor({ state: 'hidden' }).catch(() => {});
  }
}

// Mark the welcome-tour as already seen so resident-tier roles skip straight to the app.
// Stores into vecini.welcome (the welcomeStore persist key) with the demo user id.
async function markWelcomeSeen(page: Page) {
  await page.evaluate(() => {
    const raw = localStorage.getItem('vecini.welcome');
    const data = raw ? JSON.parse(raw) : { state: { seenByUser: {} }, version: 0 };
    data.state.seenByUser['u-res'] = new Date().toISOString();
    localStorage.setItem('vecini.welcome', JSON.stringify(data));
  });
}

async function enterDemo(page: Page) {
  await page.goto('/');
  await dismissConsent(page);
  // In the demo build the root route auto-enters and redirects to /app immediately.
  // In PROD/pi builds the login page renders and the button must be clicked.
  const demoButton = page.getByRole('button', { name: /modul demonstrativ/i });
  if (await demoButton.count()) await demoButton.first().click();
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
  const row = page.getByRole('switch', { name: /Anunțuri oficiale/i });
  await row.click();
  await page.goto('/app/admin/jurnal');
  await expect(page.locator('main .badge').filter({ hasText: 'Funcționalitate dezactivată' }).first()).toBeVisible();
  await expect(page.locator('main').getByText('Lanț integru').first()).toBeVisible();
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
  const row = page.getByRole('switch', { name: /Anunțuri oficiale/i });
  await row.click();
  await page.goto('/app');
  await expect(page.getByRole('navigation', { name: 'Navigare mobil' }).getByText('Anunțuri')).toHaveCount(0);
});

test('T44: a disabled module is blocked when reached by direct URL', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/admin/functionalitati');
  // Disable F01 Anunțuri, then try to reach its page by typing the URL.
  const row = page.getByRole('switch', { name: /Anunțuri oficiale/i });
  await row.click();
  await page.goto('/app/anunturi');
  await expect(page.getByText(/nu este activată pentru asociația ta/i)).toBeVisible();
});

test('F58: resident can add a carpool profile', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/carpool');
  await page.getByRole('button', { name: /profilul meu/i }).click();
  await page.getByLabel('Destinație').fill('Aeroport Otopeni');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.locator('main').getByText('Aeroport Otopeni').first()).toBeVisible();
});

test('F63: resident can list their birthday', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/aniversari');
  await page.getByRole('button', { name: /ziua mea/i }).click();
  await page.getByLabel('Zi', { exact: true }).fill('24');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.locator('main').getByText('Ziua ta este listată').first()).toBeVisible();
});

test('T42: resident joins an asociație with an issued invite code', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/admin/invitatii');
  await page.getByRole('button', { name: /Generează codul/i }).click();
  // The invite card shows the code and the full token link.
  const code = (await page.locator('code').first().innerText()).trim();
  expect(code).toMatch(/^[A-Z2-9]{8}$/);
  const link = (await page.locator('p.break-all').first().innerText()).trim();
  expect(link).toContain('/configurare-cont?token=');
  const target = new URL(link).pathname + new URL(link).search;
  // Redeem the invite via the token link (AccountSetupPage resolves via URL ?token=).
  await page.goto(target);
  await expect(page.getByText(/invitație validă/i)).toBeVisible();
  await page.getByLabel('Nume complet').fill('Vecin Nou');
  await page.getByLabel('Email').fill('vecin.nou@example.com');
  await page.getByLabel('Parolă', { exact: true }).fill('Munte-Albastru-91');
  await page.getByLabel(/Confirmă parola/i).fill('Munte-Albastru-91');
  await page.getByRole('button', { name: /Creează contul/i }).click();
  // A first-time proprietar is redirected to the welcome tour; both are valid outcomes.
  await expect(page).toHaveURL(/\/(app|bun-venit)/);
});

test('T42/T124: an invalid invite token is rejected with a clear message', async ({ page }) => {
  await enterDemo(page);
  // Navigate to the setup page with a bogus token; the page resolves it as unknown.
  await page.goto('/configurare-cont?token=NOPE2345');
  await expect(page.getByText(/Link sau cod invalid/i)).toBeVisible();
});

test('T124: an onboarding link opens the account-creation landing and is single-use', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/admin/invitatii');
  await page.getByRole('button', { name: /Generează codul/i }).click();
  const link = (await page.locator('p.break-all').first().innerText()).trim();
  expect(link).toContain('/configurare-cont?token=');
  const target = new URL(link).pathname + new URL(link).search;

  // Open the link; invite persists in localStorage so it resolves offline.
  await page.goto(target);
  await expect(page.getByText(/invitație validă/i)).toBeVisible();
  await page.getByLabel('Nume complet').fill('Vecin Link');
  await page.getByLabel('Email').fill('vecin.link@example.com');
  await page.getByLabel('Parolă', { exact: true }).fill('Munte-Albastru-91');
  await page.getByLabel(/Confirmă parola/i).fill('Munte-Albastru-91');
  await page.getByRole('button', { name: /Creează contul/i }).click();
  await expect(page).toHaveURL(/\/(app|bun-venit)/);

  // Reusing the same link is rejected: the token is now spent.
  await page.goto(target);
  await expect(page.getByText(/deja folosit/i)).toBeVisible();
});

test('F47: admin can add an energy reading', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/energie');
  await page.getByRole('button', { name: /Adaugă citire/i }).click();
  await page.getByLabel('Consum').fill('100');
  await page.getByLabel('Cost (lei)').fill('80');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.locator('main').getByText(/(mai|iunie|iulie) 2026/i).first()).toBeVisible();
});

test('F45: comitet can add a multi-year plan item', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/plan-multianual');
  await page.getByRole('button', { name: /Adaugă lucrare/i }).click();
  await page.getByLabel('An', { exact: true }).fill('2030');
  await page.getByLabel('Lucrare', { exact: true }).fill('Test E2E plan');
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
  await expect(page.locator('main').getByText('Seri în timpul săptămânii').first()).toBeVisible();
});

test('F60: resident can post a barter offer', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/barter');
  await page.getByRole('button', { name: /oferta mea/i }).click();
  await page.getByLabel('Ofer', { exact: true }).fill('Reparații calculatoare');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.locator('main').getByText('Reparații calculatoare').first()).toBeVisible();
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
  await page.getByLabel('Lucrare', { exact: true }).fill('Test revizie E2E');
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
  await page.getByLabel('Echipament', { exact: true }).fill('Test stingător E2E');
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
  await page.getByLabel('Spațiu', { exact: true }).fill('Test spațiu E2E');
  await page.getByLabel('Deținător').fill('Test deținător');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.getByText('Test spațiu E2E')).toBeVisible();
});

test('F05: resident can send an anonymous message', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/anonim');
  await page.locator('main').getByRole('button', { name: /Mesaj anonim/i }).click();
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
  await expect(page.locator('main').getByText('Popescu Andrei').first()).toBeVisible();
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
  // AGA is audience-gated to proprietar. Set the persisted demo role and mark the
  // welcome tour as seen; the next navigation picks up the role from localStorage.
  await page.evaluate(() => { localStorage.setItem('iv.demo.role', 'proprietar'); });
  await markWelcomeSeen(page);
  await page.goto('/app/aga');
  await page.getByRole('button', { name: /AGA ordinară 2026/i }).click();
  await page.getByRole('button', { name: 'Pentru', exact: true }).first().click();
  await expect(page.getByText(/Pentru \d+ ·/).first()).toBeVisible();
});

test('F13: resident can reorder project priorities', async ({ page }) => {
  await enterDemo(page);
  // Priorities is audience-gated to proprietar; set the persisted demo role.
  await page.evaluate(() => { localStorage.setItem('iv.demo.role', 'proprietar'); });
  await markWelcomeSeen(page);
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
  await expect(page.locator('main').getByText('12:00–14:00').first()).toBeVisible();
});

test('F26: resident can book the moving elevator', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/lift-mutare');
  await page.getByRole('button', { name: /Rezervă liftul/i }).click();
  await page.getByLabel('Interval orar').selectOption('11:00–14:00');
  await page.getByLabel('Etajul destinație').fill('5');
  await page.getByRole('button', { name: /Salvează/i }).click();
  await expect(page.locator('main').getByText('11:00–14:00').first()).toBeVisible();
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
  // F04 shows "Mesaj nou" for residents; set the persisted demo role to proprietar.
  await page.evaluate(() => { localStorage.setItem('iv.demo.role', 'proprietar'); });
  await markWelcomeSeen(page);
  await page.goto('/app/mesaje-admin');
  await page.getByRole('button', { name: /Mesaj nou/i }).click();
  await page.getByLabel('Subiect', { exact: true }).fill('Întrebare despre fond rulment');
  await page.getByLabel('Mesaj', { exact: true }).fill('Bună ziua, am o întrebare despre fondul de rulment.');
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
  await expect(page.locator('#main-content').getByText('Asociația de Proprietari Bloc 12, Scara A').first()).toBeVisible();

  // 3. Create/join: an admin issues an invite, a user redeems it and lands back
  //    in an active tenant context.
  await page.goto('/app/admin/invitatii');
  await page.getByRole('button', { name: /Generează codul/i }).click();
  const mvpLink = (await page.locator('p.break-all').first().innerText()).trim();
  expect(mvpLink).toContain('/configurare-cont?token=');
  const mvpTarget = new URL(mvpLink).pathname + new URL(mvpLink).search;
  await page.goto(mvpTarget);
  await expect(page.getByText(/invitație validă/i)).toBeVisible();
  await page.getByLabel('Nume complet').fill('Vecin MVP');
  await page.getByLabel('Email').fill('bucla.mvp@example.com');
  await page.getByLabel('Parolă', { exact: true }).fill('Munte-Albastru-91');
  await page.getByLabel(/Confirmă parola/i).fill('Munte-Albastru-91');
  await page.getByRole('button', { name: /Creează contul/i }).click();
  // A first-time proprietar lands on the welcome tour; skip it and proceed.
  if (page.url().includes('bun-venit')) {
    await page.getByRole('button', { name: /Sari peste/i }).click();
    await expect(page).toHaveURL(/\/app/);
  } else {
    await expect(page).toHaveURL(/\/app$/);
  }

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
  const row = page.getByRole('switch', { name: /Anunțuri oficiale/i });
  await row.click();
  await page.goto('/app/anunturi');
  await expect(page.getByText(/nu este activată pentru asociația ta/i)).toBeVisible();
});

test('T06: resident files an erasure request and an admin actions it', async ({ page }) => {
  await enterDemo(page);
  // Resident self-service: request account erasure from "Datele mele personale".
  await page.goto('/app/datele-mele');
  await page.getByRole('button', { name: /Cere ștergerea contului/i }).click();
  // Confirmation modal opens; confirm the erasure request.
  await page.getByRole('dialog').getByRole('button', { name: /Cere ștergerea contului/i }).click();
  // It appears in the resident's own request list as pending.
  await expect(page.locator('main').getByText('În așteptare').first()).toBeVisible();
  // The association admin reviews and completes it in the request queue.
  await page.goto('/app/admin/cereri-date');
  await page.getByRole('button', { name: /Finalizează/i }).first().click();
  await expect(page.locator('main').getByText('Finalizată').first()).toBeVisible();
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

test('T126: admin sees a "joined" notification after a resident redeems an invite', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/admin/invitatii');
  await page.getByRole('button', { name: /Generează codul/i }).click();
  const link = (await page.locator('p.break-all').first().innerText()).trim();
  expect(link).toContain('/configurare-cont?token=');
  const target = new URL(link).pathname + new URL(link).search;
  // Resident redeems the invite via the token link.
  await page.goto(target);
  await expect(page.getByText(/invitație validă/i)).toBeVisible();
  await page.getByLabel('Nume complet').fill('Vecin T126');
  await page.getByLabel('Email').fill('nou.t126@example.com');
  await page.getByLabel('Parolă', { exact: true }).fill('Munte-Albastru-91');
  await page.getByLabel(/Confirmă parola/i).fill('Munte-Albastru-91');
  await page.getByRole('button', { name: /Creează contul/i }).click();
  // A first-time proprietar lands on the welcome tour; skip it.
  if (page.url().includes('bun-venit')) {
    await page.getByRole('button', { name: /Sari peste/i }).click();
    await expect(page).toHaveURL(/\/app/);
  } else {
    await expect(page).toHaveURL(/\/app$/);
  }
  // Navigate to the notifications inbox — the admin's bell should now have a
  // badge and the inbox should list the "joined" event.
  await page.goto('/app/notificari');
  await expect(page.getByRole('heading', { name: 'Notificări', level: 1 })).toBeVisible();
  // The membership.joined notice appears (the invitee name may vary since the
  // code is freshly issued with no inviteeName; the role is "proprietar").
  await expect(page.locator('main').getByText(/s-a alăturat/i).first()).toBeVisible();
});

test('T140: enable email 2FA channel -> sign in -> enter on-screen code -> reach /app', async ({ page }) => {
  // 1. Enter demo as admin. Detect build type at the very start (before any state
  // changes) by checking whether the "modul demonstrativ" button exists: in the
  // demo build DemoEntry auto-enters without showing it, so the channel challenge
  // never fires at sign-in and the rest of this test can be skipped.
  await page.goto('/');
  await dismissConsent(page);
  const demoBtn = page.getByRole('button', { name: /modul demonstrativ/i });
  const isDemoBuild = (await demoBtn.count()) === 0;
  if (!isDemoBuild) await demoBtn.first().click();
  await expect(page).toHaveURL(/\/app$/);

  await page.goto('/app/securitate');
  await expect(page.getByRole('heading', { name: /securitate/i, level: 1 })).toBeVisible();

  // 2. Enable the email channel (the enable button is in the "Canale" card).
  const emailRow = page.locator('li').filter({ hasText: /^Email/ });
  await emailRow.getByRole('button', { name: /activează/i }).click();

  // In the demo build the channel challenge never fires at sign-in — skip rest.
  if (isDemoBuild) return;

  // 3. Sign out (only reachable in PROD/pi builds).
  await page.goto('/app/securitate');
  await page.getByRole('button', { name: /deconectare de pe toate/i }).click().catch(() => {});
  await page.goto('/');
  await expect(page.getByRole('button', { name: /modul demonstrativ/i }).or(page.getByLabel(/email/i))).toBeVisible();

  // 5. Seed the mfa store so the email channel stays enabled after reload.
  // (State persists in localStorage from step 2, but ensure it is present.)
  await page.evaluate(() => {
    // Ensure the mfa store's demoEnabledChannels has email enabled (it was set in step 2).
    // Also clear any stale OTP challenges so requestOtp works fresh.
    try {
      const raw = localStorage.getItem('vecini.mfa');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed?.state?.demoEnabledChannels?.email) {
          // Seed the email channel manually if not persisted yet.
          parsed.state = parsed.state ?? {};
          parsed.state.demoEnabledChannels = { email: { targetHint: 'de***@mo.com' } };
          localStorage.setItem('vecini.mfa', JSON.stringify(parsed));
        }
      } else {
        localStorage.setItem('vecini.mfa', JSON.stringify({
          state: { demoEnabledChannels: { email: { targetHint: 'de***@mo.com' } }, demoResendAt: {}, otpThrottles: {}, demoSecret: null, demoRecoveryHashes: [], challengeThrottle: { failures: [], lockedUntil: 0, lockoutCount: 0 } },
          version: 0,
        }));
      }
    } catch { /* ignore */ }
  });
  await page.reload();

  // Enter demo as admin. This should trigger the channel challenge.
  const adminBtn = page.getByRole('button', { name: /^Admin$/i });
  await adminBtn.waitFor({ state: 'visible' });
  await adminBtn.click();

  // 6. The channel challenge / picker should appear. Pick email if a picker is shown.
  const emailOption = page.getByRole('button', { name: /^Email$/i });
  if (await emailOption.isVisible()) {
    await emailOption.click();
  }

  // 7. Click "Send code by email".
  await page.getByRole('button', { name: /trimite cod prin email/i }).click();

  // 8. The demo code should appear on screen.
  const demoCodeEl = page.locator('[aria-label*="ode"]').or(
    page.locator('.iv-mono').filter({ hasText: /^\d{6}$/ })
  );
  await expect(demoCodeEl).toBeVisible({ timeout: 5000 });
  const demoCode = (await demoCodeEl.innerText()).trim().replace(/\s/g, '');

  // 9. Enter the code and submit.
  await page.getByLabel(/cod de unică folosință/i).fill(demoCode);
  await page.getByRole('button', { name: /verifică/i }).click();

  // 10. Should land on /app.
  await expect(page).toHaveURL(/\/app$/, { timeout: 8000 });
});

test('T88: admin uploads a document file; resident sees download but not upload', async ({ page }) => {
  await enterDemo(page);
  await page.goto('/app/documente');
  await expect(page.getByRole('heading', { name: 'Documente' })).toBeVisible();
  // Admin role: the "Adaugă document" button is visible.
  await expect(page.getByRole('button', { name: /Adaugă document/i })).toBeVisible();

  // Open the modal and add a document with a file.
  await page.getByRole('button', { name: /Adaugă document/i }).click();
  await page.getByLabel('Titlu').fill('Regulament parcare E2E');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'regulament-parcare.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 regulament parcare test'),
  });
  await expect(page.getByText(/regulament-parcare.pdf/i)).toBeVisible();
  await page.getByRole('button', { name: /Salvează/i }).click();

  // The new card appears with a download button.
  await expect(page.getByText('Regulament parcare E2E')).toBeVisible();
  await expect(page.getByRole('button', { name: /Descarcă/i }).first()).toBeVisible();

  // Delete the document.
  await page.getByRole('button', { name: /Șterge/i }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /Șterge/i }).click();
  await expect(page.getByText('Regulament parcare E2E')).toBeHidden();
});

test('T284: full onboarding chain -- admin setup -> wizard -> invite resident -> resident joins', async ({ page }) => {
  // A deterministic 64-char hex token (valid shape for normalizeInviteToken).
  const setupToken = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
  const asocId = 'test-asoc-t284';

  // Seed a valid AdminProvisionRecord in the platform store before entering demo.
  await page.goto('/');
  await dismissConsent(page);
  await page.evaluate(({ token, id }) => {
    const key = 'vecini.platform.asociatii';
    const raw = localStorage.getItem(key);
    const data: { state: Record<string, unknown>; version: number } = raw
      ? JSON.parse(raw) as { state: Record<string, unknown>; version: number }
      : { state: {}, version: 6 };
    data.state.provisions = (data.state.provisions as Record<string, unknown>) ?? {};
    data.state.pendingInvites = (data.state.pendingInvites as unknown[]) ?? [];
    data.state.revokedInviteIds = (data.state.revokedInviteIds as unknown[]) ?? [];
    data.state.additionalAdmins = (data.state.additionalAdmins as Record<string, unknown>) ?? {};
    data.state.listFilter = (data.state.listFilter as string) ?? 'all';
    data.state.asociatii = (data.state.asociatii as unknown[]) ?? [];
    (data.state.provisions as Record<string, unknown>)[id] = {
      asociatieId: id,
      name: 'Admin Test T284',
      email: 'admin-t284@example.com',
      setupCode: 'T284CODE',
      setupToken: token,
      expiresAt: Date.now() + 86400000,
      redeemedAt: null,
      provisionedAt: new Date().toISOString(),
      revokedAt: null,
    };
    data.version = 6;
    localStorage.setItem(key, JSON.stringify(data));
  }, { token: setupToken, id: asocId });

  // Step 1: Navigate to the account-setup page with the admin setup token.
  // The offline resolver finds the seeded provision and shows the context card.
  await page.goto(`/configurare-cont?token=${setupToken}`);
  await expect(page.getByText(/Vei deveni administrator|You will become the administrator/i)).toBeVisible();

  // Step 2: Fill in the account-creation form and submit.
  await page.getByLabel(/Nume complet|Full name/i).fill('Administrator T284');
  await page.getByLabel(/Email/i).fill('admin-t284@example.com');
  await page.getByLabel(/^Parolă$|^Password$/i).fill('Munte-Albastru-91');
  await page.getByLabel(/Confirmă parola|Confirm password/i).fill('Munte-Albastru-91');
  await page.getByRole('button', { name: /Creează contul|Create account/i }).click();

  // The setup token redirects to the onboarding wizard.
  await expect(page).toHaveURL(/\/onboarding/);

  // Step 3: Wizard -- Profile step. Inline errors appear when required fields are blurred empty.
  await expect(page.getByRole('heading', { name: /Configurarea asociației|Association setup/i })).toBeVisible();
  // Blur the name field while empty to trigger the inline error.
  const nameInput = page.getByLabel(/Numele asociației|Association name/i);
  await nameInput.focus();
  await nameInput.blur();
  await expect(page.getByText(/Introdu numele asociației|Enter the association name/i)).toBeVisible();
  // Fill both required fields and proceed.
  await nameInput.fill('Asociația T284');
  await page.getByLabel(/^Adresa$|^Address$/i).fill('Str. Testului nr. 284');
  await page.getByRole('button', { name: /^Înainte$|^Next$/i }).click();

  // Step 4: Features step -- finish with the recommended defaults.
  await page.getByRole('button', { name: /Finalizează|Finish/i }).click();

  // After the wizard the admin lands on the Apartments page.
  await expect(page).toHaveURL(/\/app\/admin\/apartamente/);

  // Step 5: Issue a resident invite from the Invites admin page.
  await page.goto('/app/admin/invitatii');
  await page.getByRole('button', { name: /Generează codul/i }).click();
  const inviteLink = (await page.locator('p.break-all').first().innerText()).trim();
  expect(inviteLink).toContain('/configurare-cont?token=');
  const inviteTarget = new URL(inviteLink).pathname + new URL(inviteLink).search;

  // Step 6: Resident redeems the invite.
  await page.goto(inviteTarget);
  await expect(page.getByText(/invitație validă|valid invitation/i)).toBeVisible();
  await page.getByLabel(/Nume complet|Full name/i).fill('Locatar T284');
  await page.getByLabel(/Email/i).fill('locatar-t284@example.com');
  await page.getByLabel(/^Parolă$|^Password$/i).fill('Munte-Albastru-91');
  await page.getByLabel(/Confirmă parola|Confirm password/i).fill('Munte-Albastru-91');
  await page.getByRole('button', { name: /Creează contul|Create account/i }).click();

  // The resident lands on the welcome tour or the app home.
  if (page.url().includes('bun-venit')) {
    await page.getByRole('button', { name: /Sari peste/i }).click();
  }
  await expect(page).toHaveURL(/\/app/);
});

test('home page has no critical accessibility violations', async ({ page }) => {
  await enterDemo(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    // Colour-contrast improvements are tracked as a dedicated design-token task.
    .disableRules(['color-contrast'])
    .analyze();
  const serious = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? ''));
  expect(serious).toEqual([]);
});
