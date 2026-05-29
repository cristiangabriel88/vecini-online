/**
 * Bilingual (RO + EN) notification email templates (T14).
 *
 * Pure and dependency-free -- no @/ aliases, no i18next. Follows the same
 * pattern as inviteEmail.ts so it can be imported by both the client (preview,
 * demo) and the notify-email Netlify function under esbuild.
 *
 * Callers must never log the rendered body (may contain user-specific links).
 */

import { resolveEmailLocale, type EmailLocale, type EmailContent } from './inviteEmail';
export type { EmailLocale, EmailContent };

export type NotifEmailKind = 'membership.joined' | 'announcement.published' | 'generic';

export interface NotifEmailParams {
  /** Recipient locale; anything not starting with 'en' resolves to Romanian. */
  locale: string | null | undefined;
  kind: NotifEmailKind;
  /** Kind-specific data fields (name, role, title, body, link, etc.). */
  data: Record<string, string>;
  /** Base URL of the resident app, used for CTA links and footer. */
  appUrl: string;
  /** Recipient user id -- not logged, used only to build the preferences link. */
  recipientUserId: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- Footer -----------------------------------------------------------------

const FOOTER_COPY: Record<EmailLocale, { prefs: string; unsubscribe: string; signoff: string }> = {
  ro: {
    prefs: 'Preferințe notificări',
    unsubscribe: 'Dezabonare email',
    signoff: 'Echipa vecini.online',
  },
  en: {
    prefs: 'Notification preferences',
    unsubscribe: 'Unsubscribe from emails',
    signoff: 'The vecini.online team',
  },
};

function footerText(lang: EmailLocale, appUrl: string): string {
  const c = FOOTER_COPY[lang];
  return `\n${c.prefs}: ${appUrl}/app/notificari\n${c.signoff}`;
}

function footerHtml(lang: EmailLocale, appUrl: string): string {
  const c = FOOTER_COPY[lang];
  const prefsUrl = escapeHtml(`${appUrl}/app/notificari`);
  const unsubUrl = escapeHtml(`${appUrl}/app/notificari?action=unsubscribe-email`);
  return [
    '<p style="margin:0;font-size:12px;color:#9ca3af;">',
    `<a href="${prefsUrl}" style="color:#6b7280;">${escapeHtml(c.prefs)}</a>`,
    ` &middot; `,
    `<a href="${unsubUrl}" style="color:#6b7280;">${escapeHtml(c.unsubscribe)}</a>`,
    '</p>',
  ].join('');
}

function ctaButton(label: string, href: string): string {
  const safeHref = escapeHtml(href);
  return [
    '<p style="margin:0 0 24px;">',
    `<a href="${safeHref}" style="display:inline-block;padding:12px 24px;background:#2563eb;`,
    `color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">`,
    `${escapeHtml(label)}</a>`,
    '</p>',
  ].join('');
}

function wrapHtml(lang: EmailLocale, bodyHtml: string, footHtml: string): string {
  return [
    '<!doctype html>',
    `<html lang="${lang}">`,
    '<body style="margin:0;padding:24px;background:#f4f4f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"',
    ' style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">',
    '<tr><td style="padding:32px;">',
    bodyHtml,
    '<hr style="margin:24px 0 16px;border:none;border-top:1px solid #f3f4f6;" />',
    footHtml,
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
}

// ---- membership.joined ------------------------------------------------------

const MEMBERSHIP_COPY: Record<
  EmailLocale,
  {
    subject: (name: string) => string;
    heading: (name: string) => string;
    body: (name: string, role: string) => string;
    cta: string;
    anonymous: string;
  }
> = {
  ro: {
    subject: (name) => `${name} s-a alăturat asociației`,
    heading: (name) => `${name} s-a alăturat`,
    body: (name, role) =>
      `${name}${role ? ` (${role})` : ''} a acceptat invitația și și-a creat contul.`,
    cta: 'Administrează membrii',
    anonymous: 'Un locatar',
  },
  en: {
    subject: (name) => `${name} joined your building`,
    heading: (name) => `${name} joined`,
    body: (name, role) =>
      `${name}${role ? ` (${role})` : ''} accepted the invitation and set up their account.`,
    cta: 'Manage members',
    anonymous: 'A resident',
  },
};

// ---- announcement.published -------------------------------------------------

const ANNOUNCEMENT_COPY: Record<
  EmailLocale,
  { subject: (title: string) => string; heading: string; cta: string }
> = {
  ro: {
    subject: (title) => `Anunț nou: ${title}`,
    heading: 'Anunț nou publicat',
    cta: 'Citește anunțul',
  },
  en: {
    subject: (title) => `New announcement: ${title}`,
    heading: 'New announcement published',
    cta: 'Read announcement',
  },
};

// ---- generic ----------------------------------------------------------------

const GENERIC_COPY: Record<EmailLocale, { cta: string }> = {
  ro: { cta: 'Deschide aplicația' },
  en: { cta: 'Open app' },
};

// ---- Main builder -----------------------------------------------------------

/**
 * Render a notification email for the given kind.
 * Returns subject, plain-text body, and HTML body.
 */
export function buildNotificationEmail(params: NotifEmailParams): EmailContent {
  const lang = resolveEmailLocale(params.locale);
  const { kind, data, appUrl } = params;
  const foot = { text: footerText(lang, appUrl), html: footerHtml(lang, appUrl) };

  if (kind === 'membership.joined') {
    const c = MEMBERSHIP_COPY[lang];
    const name = data.name?.trim() || c.anonymous;
    const role = data.role?.trim() ?? '';
    const ctaUrl = `${appUrl}/app/admin/invitatii`;
    return {
      subject: c.subject(name),
      text: [c.heading(name), '', c.body(name, role), '', `${c.cta}: ${ctaUrl}`, foot.text].join(
        '\n',
      ),
      html: wrapHtml(
        lang,
        [
          `<h2 style="margin:0 0 16px;font-size:18px;font-weight:700;">${escapeHtml(c.heading(name))}</h2>`,
          `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;">${escapeHtml(c.body(name, role))}</p>`,
          ctaButton(c.cta, ctaUrl),
        ].join(''),
        foot.html,
      ),
    };
  }

  if (kind === 'announcement.published') {
    const c = ANNOUNCEMENT_COPY[lang];
    const title = data.title?.trim() || c.heading;
    const body = data.body?.trim() || '';
    const ctaUrl = data.link ? `${appUrl}${data.link}` : `${appUrl}/app/anunturi`;
    const textParts: string[] = [c.heading, '', title];
    if (body) textParts.push('', body);
    textParts.push('', `${c.cta}: ${ctaUrl}`, foot.text);
    return {
      subject: c.subject(title),
      text: textParts.join('\n'),
      html: wrapHtml(
        lang,
        [
          `<h2 style="margin:0 0 8px;font-size:18px;font-weight:700;">${escapeHtml(c.heading)}</h2>`,
          `<p style="margin:0 0 4px;font-size:16px;font-weight:600;">${escapeHtml(title)}</p>`,
          body
            ? `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(body)}</p>`
            : '<p style="margin:0 0 24px;"></p>',
          ctaButton(c.cta, ctaUrl),
        ].join(''),
        foot.html,
      ),
    };
  }

  // generic
  const c = GENERIC_COPY[lang];
  const title = data.title?.trim() || '';
  const body = data.body?.trim() || '';
  const ctaUrl = data.link ? `${appUrl}${data.link}` : `${appUrl}/app`;
  const textParts: string[] = [];
  if (title) textParts.push(title);
  if (body) textParts.push('', body);
  textParts.push('', `${c.cta}: ${ctaUrl}`, foot.text);
  return {
    subject: title,
    text: textParts.join('\n'),
    html: wrapHtml(
      lang,
      [
        title
          ? `<h2 style="margin:0 0 16px;font-size:18px;font-weight:700;">${escapeHtml(title)}</h2>`
          : '',
        body
          ? `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;">${escapeHtml(body)}</p>`
          : '',
        ctaButton(c.cta, ctaUrl),
      ].join(''),
      foot.html,
    ),
  };
}
