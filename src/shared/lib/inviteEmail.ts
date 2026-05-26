/**
 * Bilingual (RO + EN) invitation-email templates (T147, T153).
 *
 * Pure and dependency-free so it can be imported by both the client (offline
 * preview / demo) and the `invite-email` Netlify function under esbuild, exactly
 * like the Telegram reply builders in `telegramStart.ts`. It does not touch
 * i18next (a React concern): the strings live here keyed by a resolved locale so
 * the server function can render the same copy the client would, picking the
 * recipient's locale (`users.locale` live, the inviter's UI locale offline).
 *
 * Two templates:
 *   - `buildInviteEmail`      -- resident invite (T147), unchanged.
 *   - `buildAdminInviteEmail` -- superadmin-issued admin setup invite (T153):
 *       distinct copy, rounded-pill CTA, embedded QR code (optional, pre-
 *       generated base64 PNG by the caller so this module stays dependency-free).
 *
 * Callers must never log the rendered body (it contains the secret link).
 */

export type EmailLocale = 'ro' | 'en';

export interface InviteEmailParams {
  /** Recipient locale; anything not starting with `en` resolves to Romanian. */
  locale: string | null | undefined;
  /** Recipient display name, when known. Falls back to a neutral greeting. */
  recipientName?: string | null;
  /** The asociație the invite is for (shown in the subject and body). */
  asociatieName: string;
  /** Absolute onboarding link the recipient follows to set up their account. */
  inviteLink: string;
}

export interface EmailContent {
  subject: string;
  /** Plain-text body (multipart fallback + accessibility). */
  text: string;
  /** HTML body. */
  html: string;
}

/** Resolve any locale string to the two languages the app supports. */
export function resolveEmailLocale(locale: string | null | undefined): EmailLocale {
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

interface Copy {
  subject: (asociatie: string) => string;
  greeting: (name: string | null) => string;
  intro: (asociatie: string) => string;
  cta: string;
  fallback: string;
  ignore: string;
  signoff: string;
}

const COPY: Record<EmailLocale, Copy> = {
  ro: {
    subject: (asociatie) => `Invitație de a te alătura asociației ${asociatie}`,
    greeting: (name) => (name ? `Bună, ${name},` : 'Bună,'),
    intro: (asociatie) =>
      `Ai fost invitat să îți creezi un cont în aplicația asociației ${asociatie}. ` +
      'De acolo poți vedea anunțurile, sesizările, voturile și restul informațiilor clădirii.',
    cta: 'Creează-ți contul',
    fallback: 'Dacă butonul nu funcționează, copiază și deschide acest link în browser:',
    ignore: 'Dacă nu te așteptai la această invitație, poți ignora mesajul.',
    signoff: 'Echipa vecini.online',
  },
  en: {
    subject: (asociatie) => `Invitation to join ${asociatie}`,
    greeting: (name) => (name ? `Hello ${name},` : 'Hello,'),
    intro: (asociatie) =>
      `You have been invited to set up an account in the ${asociatie} building app. ` +
      'From there you can see announcements, issues, votes and the rest of the building information.',
    cta: 'Create your account',
    fallback: 'If the button does not work, copy and open this link in your browser:',
    ignore: 'If you were not expecting this invitation, you can safely ignore this message.',
    signoff: 'The vecini.online team',
  },
};

/**
 * Render the invitation email for a recipient. Returns the subject plus a plain
 * text and an HTML body sharing the same copy, so a mail client renders either.
 */
export function buildInviteEmail(params: InviteEmailParams): EmailContent {
  const lang = resolveEmailLocale(params.locale);
  const c = COPY[lang];
  const name = params.recipientName?.trim() || null;
  const asociatie = params.asociatieName.trim();
  const link = params.inviteLink.trim();

  const subject = c.subject(asociatie);
  const text = [
    c.greeting(name),
    '',
    c.intro(asociatie),
    '',
    `${c.cta}: ${link}`,
    '',
    c.ignore,
    '',
    c.signoff,
  ].join('\n');

  const safeLink = escapeHtml(link);
  const html = [
    '<!doctype html>',
    `<html lang="${lang}">`,
    '<body style="margin:0;padding:24px;background:#f4f4f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">',
    '<tr><td style="padding:32px;">',
    `<p style="margin:0 0 16px;font-size:16px;">${escapeHtml(c.greeting(name))}</p>`,
    `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;">${escapeHtml(c.intro(asociatie))}</p>`,
    `<p style="margin:0 0 24px;"><a href="${safeLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">${escapeHtml(c.cta)}</a></p>`,
    `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${escapeHtml(c.fallback)}</p>`,
    `<p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${safeLink}" style="color:#2563eb;">${safeLink}</a></p>`,
    `<p style="margin:0 0 24px;font-size:13px;color:#6b7280;">${escapeHtml(c.ignore)}</p>`,
    `<p style="margin:0;font-size:14px;color:#1f2933;">${escapeHtml(c.signoff)}</p>`,
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');

  return { subject, text, html };
}

// ─── Admin setup invite (T153) ────────────────────────────────────────────────

export interface AdminInviteEmailParams {
  /** Recipient locale; anything not starting with `en` resolves to Romanian. */
  locale: string | null | undefined;
  /** Admin's display name. Falls back to a neutral greeting when absent. */
  adminName?: string | null;
  /** Absolute setup link the admin follows to configure their account. */
  setupLink: string;
  /**
   * Pre-generated `data:image/png;base64,...` QR code string produced by the
   * caller (e.g. `qrcode.toDataURL` in the Netlify function). When null/absent
   * the QR block is omitted from the HTML body so this module stays dep-free.
   */
  qrCodeDataUrl?: string | null;
}

interface AdminCopy {
  subject: string;
  greeting: (name: string | null) => string;
  intro: string;
  cta: string;
  qrHint: string;
  fallbackLabel: string;
  expiry: string;
  ignore: string;
  signoff: string;
}

const ADMIN_COPY: Record<EmailLocale, AdminCopy> = {
  ro: {
    subject: 'Invitatie Administrator - vecini.online',
    greeting: (name) => (name ? `Buna ziua, ${name},` : 'Buna ziua,'),
    intro:
      'Ati fost invitat ca Administrator pe platforma vecini.online. ' +
      'Faceti clic pe butonul de mai jos pentru a va configura contul si a incepe sa administrati asociatia.',
    cta: 'Accepta invitatia',
    qrHint: 'Sau scanati codul QR de pe telefonul mobil:',
    fallbackLabel: 'Daca butonul nu functioneaza, copiati si deschideti acest link:',
    expiry: 'Acest link expira in 24 de ore.',
    ignore: 'Daca nu ati solicitat aceasta invitatie, ignorati acest email.',
    signoff: 'Echipa vecini.online',
  },
  en: {
    subject: 'Administrator Invitation - vecini.online',
    greeting: (name) => (name ? `Hello, ${name},` : 'Hello,'),
    intro:
      'You were invited as an Administrator on the vecini.online platform. ' +
      'Click the button below to set up your account and start managing your building association.',
    cta: 'Accept Invitation',
    qrHint: 'Or scan the QR code on your mobile phone:',
    fallbackLabel: 'If the button does not work, copy and open this link:',
    expiry: 'This link expires in 24 hours.',
    ignore: 'If you did not request this invitation, please ignore this email.',
    signoff: 'The vecini.online team',
  },
};

/**
 * Render the admin setup invitation email. A distinct, polished template
 * targeting the platform admin recipient rather than a building resident.
 *
 * The `qrCodeDataUrl` parameter accepts a pre-generated base64 PNG data URL
 * produced by the Netlify function (via `qrcode`) so this module stays pure
 * and dependency-free. When absent, the QR block is simply omitted.
 */
export function buildAdminInviteEmail(params: AdminInviteEmailParams): EmailContent {
  const lang = resolveEmailLocale(params.locale);
  const c = ADMIN_COPY[lang];
  const name = params.adminName?.trim() || null;
  const link = params.setupLink.trim();

  // ── Plain-text body ───────────────────────────────────────────────────────
  const textParts = [
    c.greeting(name),
    '',
    c.intro,
    '',
    `${c.cta}: ${link}`,
    '',
    c.expiry,
    c.ignore,
    '',
    c.signoff,
  ];
  const text = textParts.join('\n');

  // ── HTML body ─────────────────────────────────────────────────────────────
  const safeLink = escapeHtml(link);

  const qrBlock =
    params.qrCodeDataUrl
      ? [
          `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${escapeHtml(c.qrHint)}</p>`,
          `<p style="margin:0 0 24px;">`,
          `<img src="${escapeHtml(params.qrCodeDataUrl)}" width="200" height="200" alt="QR code" `,
          `style="display:block;border-radius:8px;border:1px solid #e5e7eb;" />`,
          `</p>`,
        ].join('')
      : '';

  const html = [
    '<!doctype html>',
    `<html lang="${lang}">`,
    '<body style="margin:0;padding:24px;background:#f4f4f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">',
    // Header accent bar
    '<tr><td style="background:#2563eb;padding:20px 32px;">',
    '<p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">vecini.online</p>',
    '<p style="margin:4px 0 0;font-size:12px;color:#bfdbfe;">Platforma asociatiilor de proprietari</p>',
    '</td></tr>',
    // Body
    '<tr><td style="padding:32px;">',
    `<p style="margin:0 0 16px;font-size:16px;font-weight:600;">${escapeHtml(c.greeting(name))}</p>`,
    `<p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#374151;">${escapeHtml(c.intro)}</p>`,
    // CTA pill button
    '<p style="margin:0 0 28px;text-align:center;">',
    `<a href="${safeLink}" style="display:inline-block;padding:14px 36px;background:#2563eb;color:#ffffff;`,
    `text-decoration:none;border-radius:9999px;font-size:16px;font-weight:700;letter-spacing:0.01em;`,
    `box-shadow:0 2px 8px rgba(37,99,235,0.35);">${escapeHtml(c.cta)}</a>`,
    '</p>',
    // QR code block (optional)
    qrBlock,
    // Fallback link
    `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${escapeHtml(c.fallbackLabel)}</p>`,
    `<p style="margin:0 0 28px;font-size:13px;word-break:break-all;"><a href="${safeLink}" style="color:#2563eb;">${safeLink}</a></p>`,
    // Footer
    '<hr style="margin:0 0 20px;border:none;border-top:1px solid #f3f4f6;" />',
    `<p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">${escapeHtml(c.expiry)}</p>`,
    `<p style="margin:0 0 16px;font-size:12px;color:#9ca3af;">${escapeHtml(c.ignore)}</p>`,
    `<p style="margin:0;font-size:13px;color:#1f2933;">${escapeHtml(c.signoff)}</p>`,
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');

  return { subject: c.subject, text, html };
}
