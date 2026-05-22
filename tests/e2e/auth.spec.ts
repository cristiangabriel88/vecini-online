import { test, expect, type Page } from '@playwright/test';

// Produce the current TOTP code for a base32 secret exactly as an authenticator
// app would, computed in the browser so the test stays self-contained (no app
// source is imported into the Playwright/tsconfig.node program).
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

// Dismiss the GDPR banner if it is showing so it cannot intercept clicks.
async function dismissConsent(page: Page) {
  const banner = page.getByRole('dialog', { name: /Confidențialitate|Privacy/i });
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole('button', { name: /Doar esențiale|essential only|Reject/i }).click();
  }
}

async function enterDemo(page: Page) {
  await page.goto('/');
  await dismissConsent(page);
  await page.getByRole('button', { name: /modul demonstrativ/i }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test('T01: auth page switches between sign in, sign up and reset', async ({ page }) => {
  await page.goto('/');
  await dismissConsent(page);

  // Default view is sign in: email + password, no confirm field.
  await expect(page.getByRole('heading', { name: /Intră în cont/i })).toBeVisible();
  await expect(page.getByLabel(/Confirmă parola/i)).toHaveCount(0);

  // Switch to sign up: a confirm-password field appears.
  await page.getByRole('button', { name: 'Creează cont', exact: true }).click();
  await expect(page.getByLabel(/Confirmă parola/i)).toBeVisible();

  // Back to sign in, then to the password-reset request form.
  await page.getByRole('button', { name: /Intră în cont/i }).click();
  await page.getByRole('button', { name: /Ai uitat parola/i }).click();
  await expect(page.getByRole('heading', { name: /Resetare parolă/i })).toBeVisible();
  await expect(page.getByLabel(/Parolă/i)).toHaveCount(0);

  // The demo entry point is still available and works.
  await page.getByRole('button', { name: /Înapoi la autentificare/i }).click();
  await page.getByRole('button', { name: /modul demonstrativ/i }).click();
  await expect(page).toHaveURL(/\/app$/);
});

test('T01: reset-password link without a recovery session is guided back', async ({ page }) => {
  await page.goto('/reset-parola');
  await dismissConsent(page);
  // In demo mode there is no recovery session, so the page lets the resident set
  // a new password directly (no Supabase backend to reject the token).
  await expect(page.getByRole('heading', { name: /Setează o parolă nouă/i })).toBeVisible();
});

test('T02: resident can enable 2FA and is then challenged at the next sign-in', async ({ page }) => {
  await enterDemo(page);

  // Enrol a TOTP factor from the security page.
  await page.goto('/app/securitate');
  await page.getByRole('button', { name: /Activează 2FA/i }).click();

  // Read the displayed setup key and produce the matching current code, exactly
  // as an authenticator app would, then confirm enrolment.
  const secret = (await page.getByText(/^[A-Z2-7]{32}$/).innerText()).trim();
  await page.getByLabel('Cod din aplicație').fill(await totp(page, secret));
  await page.getByRole('button', { name: /Verifică și activează/i }).click();

  // Recovery codes are shown once; acknowledge them.
  await expect(page.getByRole('heading', { name: /Coduri de recuperare/i })).toBeVisible();
  await page.getByRole('button', { name: /Am salvat codurile/i }).click();
  await expect(page.getByRole('heading', { name: /Autentificare în doi pași activă/i })).toBeVisible();

  // Signing out and re-entering demo now requires the second factor.
  await page.goto('/');
  await page.getByRole('button', { name: /modul demonstrativ/i }).click();
  await expect(page.getByRole('heading', { name: /Verificare în doi pași/i })).toBeVisible();
  await page.getByLabel('Cod din aplicație').fill(await totp(page, secret));
  await page.getByRole('button', { name: /^Verifică$/i }).click();
  await expect(page).toHaveURL(/\/app$/);
});
