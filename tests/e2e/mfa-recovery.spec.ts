import { test, expect, type Page } from '@playwright/test';

// Produce the current TOTP code for a base32 secret exactly as an authenticator
// app would, computed in the browser so the test stays self-contained.
function totp(page: Page, secret: string): Promise<string> {
  return page.evaluate(async (s) => {
    const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const ch of s.toUpperCase()) {
      const idx = B32.indexOf(ch);
      if (idx < 0) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    const key = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(bytes),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign'],
    );
    const counter = Math.floor(Date.now() / 1000 / 30);
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint32(0, Math.floor(counter / 2 ** 32));
    view.setUint32(4, counter >>> 0);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
    const offset = sig[sig.length - 1] & 0x0f;
    const bin =
      ((sig[offset] & 0x7f) << 24) |
      (sig[offset + 1] << 16) |
      (sig[offset + 2] << 8) |
      sig[offset + 3];
    return (bin % 1_000_000).toString().padStart(6, '0');
  }, secret);
}

async function dismissConsent(page: Page) {
  const banner = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  if (await banner.isVisible().catch(() => false)) {
    await banner
      .getByRole('button', { name: /Doar esențiale|essential only|Reject/i })
      .click({ force: true });
  }
}

// Sign in using the login form in demo mode (any valid email + 8-char password).
// `challengeRequired()` triggers if TOTP or an email channel is enrolled.
async function signInWithForm(page: Page) {
  await page.getByLabel('Email', { exact: true }).fill('demo@example.com');
  await page.getByLabel('Parolă', { exact: true }).fill('parola123');
  await page.getByRole('button', { name: /Intră în cont/i }).click();
}

async function signOutViaMenu(page: Page) {
  await page.getByRole('button', { name: /Meniu cont|Account menu/i }).click();
  await page.getByRole('menuitem', { name: /Deconectare|Sign out/i }).click();
  await expect(page).toHaveURL('/');
}

test('T296a: lost-authenticator recovery via email code, then reset authenticator', async ({
  page,
}) => {
  await page.goto('/');
  await dismissConsent(page);

  // The login page (with the demo button) does not exist in the demo build.
  const demoButton = page.getByRole('button', { name: /modul demonstrativ/i });
  test.skip(!(await demoButton.count()), 'Login page not rendered in demo build');

  // Enter demo and enroll TOTP on the security page.
  await demoButton.first().click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto('/app/securitate');

  await page.getByRole('button', { name: /Activează 2FA/i }).click();
  const secret = (await page.getByText(/^[A-Z2-7]{32}$/).innerText()).trim();
  await page.getByLabel('Cod din aplicație').fill(await totp(page, secret));
  await page.getByRole('button', { name: /Verifică și activează/i }).click();
  await expect(page.getByRole('heading', { name: /Coduri de recuperare/i })).toBeVisible();
  await page.getByRole('button', { name: /Am salvat codurile/i }).click();
  await expect(page.getByText(/Autentificare în doi pași activă/i)).toBeVisible();

  // Sign out so we can test the login challenge flow.
  await signOutViaMenu(page);

  // Sign in via the form -- the TOTP challenge appears because demoSecret persists.
  await signInWithForm(page);
  await expect(page.getByRole('heading', { name: /Verificare în doi pași/i })).toBeVisible();

  // Open the lost-authenticator recovery sub-flow.
  await page
    .getByRole('button', { name: /Nu mai ai acces la aplicația de autentificare/i })
    .click();

  // Request a recovery code by email (demo shows it on-screen).
  await page.getByRole('button', { name: /Trimite-mi un cod pe email/i }).click();
  const demoCodeEl = page.locator('[aria-label="Cod de unică folosință demo"]');
  await expect(demoCodeEl).toBeVisible();
  const recoveryCode = (await demoCodeEl.innerText()).trim();
  expect(recoveryCode).toMatch(/^\d{6}$/);

  // Enter the code and complete sign-in.
  await page.getByLabel('Cod de unică folosință', { exact: true }).fill(recoveryCode);
  await page.getByRole('button', { name: /^Verifică$/i }).click();
  await expect(page).toHaveURL(/\/app$/);

  // On the security page, reset the authenticator to start a fresh enrollment.
  await page.goto('/app/securitate');
  await page.getByRole('button', { name: /Resetează aplicația de autentificare/i }).click();
  // Fresh enrollment form shows (QR code + setup-key step).
  await expect(
    page.getByRole('heading', { name: /Configurează autentificarea în doi pași/i }),
  ).toBeVisible();
  await expect(page.getByText(/Cheie de configurare/i)).toBeVisible();
});

test('T296b: email-only 2FA factor -- enable on security page, sign out, challenge at login', async ({
  page,
}) => {
  await page.goto('/');
  await dismissConsent(page);

  const demoButton = page.getByRole('button', { name: /modul demonstrativ/i });
  test.skip(!(await demoButton.count()), 'Login page not rendered in demo build');

  // Enter demo without enrolling TOTP.
  await demoButton.first().click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto('/app/securitate');

  // Enable the email second-factor channel.
  // "Activează" (channel enable) vs "Activează 2FA" (TOTP enable) -- exact match.
  await page.getByRole('button', { name: 'Activează', exact: true }).click();

  // Demo shows the setup-confirm code on-screen.
  const setupDemoCode = page.locator('[aria-label="Cod de unică folosință demo"]');
  await expect(setupDemoCode).toBeVisible();
  const setupCode = (await setupDemoCode.innerText()).trim();
  expect(setupCode).toMatch(/^\d{6}$/);

  // Confirm the code to activate the channel.
  await page.getByLabel('Cod de unică folosință', { exact: true }).fill(setupCode);
  await page.getByRole('button', { name: /Confirmă și activează/i }).click();

  // Email row now shows "Dezactivează" -- the channel is on.
  await expect(page.getByRole('button', { name: 'Dezactivează', exact: true })).toBeVisible();

  // Sign out so we can test the email-only login challenge.
  await signOutViaMenu(page);

  // Sign in -- email is the only factor, so it is auto-selected.
  await signInWithForm(page);
  await expect(page.getByRole('heading', { name: /Verificare în doi pași/i })).toBeVisible();

  // Request the email OTP (auto-selected channel shows the "Send" button directly).
  await page.getByRole('button', { name: /Trimite cod prin email/i }).click();
  const challengeDemoCode = page.locator('[aria-label="Cod de unică folosință demo"]');
  await expect(challengeDemoCode).toBeVisible();
  const challengeCode = (await challengeDemoCode.innerText()).trim();
  expect(challengeCode).toMatch(/^\d{6}$/);

  // Enter the code and complete sign-in.
  await page.getByLabel('Cod de unică folosință', { exact: true }).fill(challengeCode);
  await page.getByRole('button', { name: /^Verifică$/i }).click();
  await expect(page).toHaveURL(/\/app$/);
});
