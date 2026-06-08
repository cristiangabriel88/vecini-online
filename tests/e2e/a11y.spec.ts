import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function dismissConsent(page: Page) {
  const banner = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole('button', { name: /Accept(ă)? tot/i }).click({ force: true });
    await banner.waitFor({ state: 'hidden' }).catch(() => {});
  }
}

async function enterDemo(page: Page) {
  await page.goto('/');
  await dismissConsent(page);
  const demoButton = page.getByRole('button', { name: /modul demonstrativ/i });
  if (await demoButton.count()) await demoButton.first().click();
  await expect(page).toHaveURL(/\/app$/);
}

/** Run axe with WCAG 2.0 A/AA tags, skip colour-contrast (tracked as design-token task).
 *  Returns only critical/serious violations so minor/moderate misses don't block the gate. */
async function scanForSerious(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['color-contrast'])
    .analyze();
  return results.violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? ''));
}

function describe(vs: { id: string; description: string; nodes: { html: string }[] }[]) {
  return vs.map((v) => `[${v.id}] ${v.description} — ${v.nodes[0]?.html ?? ''}`).join('\n');
}

test.describe('a11y — axe serious/critical gate', () => {
  test('login page', async ({ page }) => {
    await page.goto('/');
    await dismissConsent(page);
    const v = await scanForSerious(page);
    expect(v, describe(v)).toHaveLength(0);
  });

  test('dashboard', async ({ page }) => {
    await enterDemo(page);
    await expect(page.getByRole('heading', { name: 'Acasă' })).toBeVisible();
    const v = await scanForSerious(page);
    expect(v, describe(v)).toHaveLength(0);
  });

  test('announcements list', async ({ page }) => {
    await enterDemo(page);
    await page.goto('/app/anunturi');
    await expect(page.getByRole('heading', { name: /anun/i })).toBeVisible();
    const v = await scanForSerious(page);
    expect(v, describe(v)).toHaveLength(0);
  });

  test('apartment add form', async ({ page }) => {
    await enterDemo(page);
    await page.goto('/app/admin/apartamente/adauga');
    await expect(page.getByRole('heading', { name: /apartament/i })).toBeVisible();
    const v = await scanForSerious(page);
    expect(v, describe(v)).toHaveLength(0);
  });

  test('announcement compose modal', async ({ page }) => {
    await enterDemo(page);
    await page.goto('/app/anunturi');
    await page.getByRole('button', { name: /Anunț nou/i }).click();
    const dialog = page.getByRole('dialog', { name: /anun/i });
    await dialog.waitFor({ state: 'visible' });
    const v = await scanForSerious(page);
    expect(v, describe(v)).toHaveLength(0);
  });

  test('AGA page (governance, complex layout)', async ({ page }) => {
    await enterDemo(page);
    await page.evaluate(() => {
      localStorage.setItem('iv.demo.role', 'proprietar');
      const raw = localStorage.getItem('vecini.welcome');
      const data = raw
        ? (JSON.parse(raw) as { state: { seenByUser: Record<string, string> }; version: number })
        : { state: { seenByUser: {} }, version: 0 };
      data.state.seenByUser['u-res'] = new Date().toISOString();
      localStorage.setItem('vecini.welcome', JSON.stringify(data));
    });
    await page.goto('/app/aga');
    await expect(page.getByRole('heading', { name: /AGA digitală/i })).toBeVisible();
    const v = await scanForSerious(page);
    expect(v, describe(v)).toHaveLength(0);
  });

  test('my data page (GDPR subject-access)', async ({ page }) => {
    await enterDemo(page);
    await page.goto('/app/datele-mele');
    await expect(page.getByRole('heading', { name: /Datele mele personale/i })).toBeVisible();
    const v = await scanForSerious(page);
    expect(v, describe(v)).toHaveLength(0);
  });

  test('profile page', async ({ page }) => {
    await enterDemo(page);
    await page.goto('/app/profil');
    await expect(page.getByRole('heading', { name: /Profil/i })).toBeVisible();
    const v = await scanForSerious(page);
    expect(v, describe(v)).toHaveLength(0);
  });

  test('discussions page', async ({ page }) => {
    await enterDemo(page);
    await page.goto('/app/discutii');
    await expect(page.getByRole('heading', { name: /Discuții/i })).toBeVisible();
    const v = await scanForSerious(page);
    expect(v, describe(v)).toHaveLength(0);
  });

  test('admin features page', async ({ page }) => {
    await enterDemo(page);
    await page.goto('/app/admin/functionalitati');
    await expect(page.getByRole('heading', { name: /Funcționalități/i })).toBeVisible();
    const v = await scanForSerious(page);
    expect(v, describe(v)).toHaveLength(0);
  });

  // Color-contrast improvements are tracked as a design-token task; the rule is
  // disabled in all tests above until the palette is updated. This fixme test
  // makes the tracked item explicit: once the palette lands it will start
  // passing, at which point the disableRules calls above can be removed.
  test.fixme('color-contrast gate (design-token task, not yet resolved)', async ({ page }) => {
    await enterDemo(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const vs = results.violations.filter((v) => v.id === 'color-contrast');
    expect(vs, describe(vs)).toHaveLength(0);
  });
});
