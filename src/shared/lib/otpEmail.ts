/**
 * Bilingual (RO + EN) OTP verification email templates (T142).
 *
 * Pure and dependency-free so it can be imported by both the client and the
 * `mfa-otp-request` Netlify function under esbuild, exactly like `inviteEmail`.
 * No i18next dependency -- strings live here keyed by resolved locale.
 *
 * Callers must never log the rendered body (it contains the plaintext code
 * and the confirm link, both of which are secrets).
 */

export type OtpEmailLocale = 'ro' | 'en';

/** Resolve any locale string to the two languages the app supports. */
export function resolveOtpEmailLocale(locale: string | null | undefined): OtpEmailLocale {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'ro';
}

/** Escape the five characters that are unsafe in HTML text/attribute contexts. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface OtpEmailParams {
  locale: string | null | undefined;
  /** The 6-digit numeric code to display prominently. */
  code: string;
  /** Absolute URL for the one-click confirm link (email channel only). */
  confirmLink: string;
  /** How many minutes the code is valid; default 10. */
  expiryMinutes?: number;
}

export interface OtpEmailContent {
  subject: string;
  text: string;
  html: string;
}

interface OtpCopy {
  subject: string;
  intro: string;
  yourCode: string;
  orClick: string;
  clickLink: string;
  expires: (minutes: number) => string;
  ignore: string;
  signoff: string;
}

const COPY: Record<OtpEmailLocale, OtpCopy> = {
  ro: {
    subject: 'Codul tau de verificare vecini.online',
    intro: 'Ai solicitat un cod de verificare pentru autentificarea in doi pasi pe vecini.online.',
    yourCode: 'Codul tau este:',
    orClick: 'Sau confirma autentificarea direct printr-un singur click:',
    clickLink: 'Confirma autentificarea',
    expires: (m) => `Codul expira in ${m} minute.`,
    ignore: 'Daca nu ai solicitat acest cod, poti ignora mesajul.',
    signoff: 'Echipa vecini.online',
  },
  en: {
    subject: 'Your vecini.online verification code',
    intro: 'You requested a two-factor verification code for your vecini.online account.',
    yourCode: 'Your code is:',
    orClick: 'Or confirm your sign-in with one click:',
    clickLink: 'Confirm sign-in',
    expires: (m) => `The code expires in ${m} minutes.`,
    ignore: 'If you did not request this code, you can safely ignore this message.',
    signoff: 'The vecini.online team',
  },
};

export function buildOtpEmail(params: OtpEmailParams): OtpEmailContent {
  const locale = resolveOtpEmailLocale(params.locale);
  const copy = COPY[locale];
  const minutes = params.expiryMinutes ?? 10;
  const safeLink = escapeHtml(params.confirmLink);

  const subject = copy.subject;

  const text = [
    copy.intro,
    '',
    `${copy.yourCode} ${params.code}`,
    '',
    `${copy.orClick}`,
    params.confirmLink,
    '',
    copy.expires(minutes),
    copy.ignore,
    '',
    copy.signoff,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2933;background:#fff">
  <p style="margin-bottom:16px">${escapeHtml(copy.intro)}</p>
  <p style="margin-bottom:8px;font-weight:600">${escapeHtml(copy.yourCode)}</p>
  <div style="font-size:36px;font-weight:700;letter-spacing:10px;padding:20px;background:#f0f4ff;border-radius:8px;text-align:center;margin-bottom:24px;color:#1a3399">${escapeHtml(params.code)}</div>
  <p style="margin-bottom:12px;color:#486581">${escapeHtml(copy.orClick)}</p>
  <p style="text-align:center;margin-bottom:24px">
    <a href="${safeLink}" style="display:inline-block;padding:12px 28px;background:#3d63dd;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px">${escapeHtml(copy.clickLink)}</a>
  </p>
  <p style="font-size:12px;word-break:break-all;color:#829ab1;margin-bottom:16px">${safeLink}</p>
  <hr style="border:none;border-top:1px solid #e8edf2;margin:16px 0">
  <p style="font-size:12px;color:#829ab1;margin-bottom:8px">${escapeHtml(copy.expires(minutes))}</p>
  <p style="font-size:12px;color:#829ab1;margin-bottom:8px">${escapeHtml(copy.ignore)}</p>
  <p style="font-size:12px;color:#829ab1">${escapeHtml(copy.signoff)}</p>
</body>
</html>`;

  return { subject, text, html };
}
