/**
 * Bilingual (RO + EN) invitation-email template (T147).
 *
 * Pure and dependency-free so it can be imported by both the client (offline
 * preview / demo) and the `invite-email` Netlify function under esbuild, exactly
 * like the Telegram reply builders in `telegramStart.ts`. It does not touch
 * i18next (a React concern): the strings live here keyed by a resolved locale so
 * the server function can render the same copy the client would, picking the
 * recipient's locale (`users.locale` live, the inviter's UI locale offline).
 *
 * The email carries only the onboarding link, the recipient's name and the
 * asociație name. It never embeds a token in plain prose beyond the link itself,
 * and callers must never log the rendered body (it contains the secret link).
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
