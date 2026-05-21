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

test('home page has no critical accessibility violations', async ({ page }) => {
  await enterDemo(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const serious = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? ''));
  expect(serious).toEqual([]);
});
