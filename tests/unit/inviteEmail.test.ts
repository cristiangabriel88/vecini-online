import { describe, expect, it } from 'vitest';
import {
  buildAdminInviteEmail,
  buildInviteEmail,
  resolveEmailLocale,
  type AdminInviteEmailParams,
  type InviteEmailParams,
} from '@/shared/lib/inviteEmail';

const LINK = 'https://app.vecini.online/configurare-cont?token=abc123';

function params(overrides: Partial<InviteEmailParams> = {}): InviteEmailParams {
  return {
    locale: 'ro',
    recipientName: 'Ionescu Maria',
    asociatieName: 'Asociația Florilor 12',
    inviteLink: LINK,
    ...overrides,
  };
}

describe('resolveEmailLocale', () => {
  it('maps en variants to en and everything else to ro', () => {
    expect(resolveEmailLocale('en')).toBe('en');
    expect(resolveEmailLocale('en-US')).toBe('en');
    expect(resolveEmailLocale('ro')).toBe('ro');
    expect(resolveEmailLocale('ro-RO')).toBe('ro');
    expect(resolveEmailLocale(undefined)).toBe('ro');
    expect(resolveEmailLocale(null)).toBe('ro');
    expect(resolveEmailLocale('fr')).toBe('ro');
  });
});

describe('buildInviteEmail', () => {
  it('builds a Romanian email carrying the link, name and asociație', () => {
    const email = buildInviteEmail(params());
    expect(email.subject).toContain('Asociația Florilor 12');
    expect(email.text).toContain('Ionescu Maria');
    expect(email.text).toContain(LINK);
    expect(email.html).toContain(LINK);
    // The CTA copy is present in both bodies.
    expect(email.text).toContain('Creează-ți contul');
    expect(email.html).toContain('Creează-ți contul');
  });

  it('builds an English email when the locale is en', () => {
    const email = buildInviteEmail(params({ locale: 'en' }));
    expect(email.subject).toContain('Invitation to join');
    expect(email.text).toContain('Create your account');
    expect(email.html).toContain('lang="en"');
  });

  it('falls back to a neutral greeting when no name is given', () => {
    const ro = buildInviteEmail(params({ recipientName: null }));
    expect(ro.text.startsWith('Bună,')).toBe(true);
    const en = buildInviteEmail(params({ locale: 'en', recipientName: '   ' }));
    expect(en.text.startsWith('Hello,')).toBe(true);
  });

  it('escapes HTML-significant characters in dynamic values', () => {
    const email = buildInviteEmail(
      params({ recipientName: 'A & B <Co>', asociatieName: 'X "Y" <Z>' }),
    );
    expect(email.html).toContain('A &amp; B &lt;Co&gt;');
    expect(email.html).toContain('X &quot;Y&quot; &lt;Z&gt;');
    // The raw, unescaped angle brackets must not leak into the markup.
    expect(email.html).not.toContain('<Co>');
  });

  it('renders the link as both a button and a copyable fallback', () => {
    const email = buildInviteEmail(params());
    // Two href occurrences: the button and the visible fallback link.
    const hrefs = email.html.match(new RegExp(`href="${LINK.replace(/[?]/g, '\\?')}"`, 'g'));
    expect(hrefs?.length).toBe(2);
  });
});

// ── buildAdminInviteEmail ─────────────────────────────────────────────────────

const SETUP_LINK = 'https://app.vecini.online/configurare-cont?token=setup456';
const QR_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

function adminParams(overrides: Partial<AdminInviteEmailParams> = {}): AdminInviteEmailParams {
  return {
    locale: 'ro',
    adminName: 'Popescu Ion',
    setupLink: SETUP_LINK,
    qrCodeDataUrl: QR_DATA_URL,
    ...overrides,
  };
}

describe('buildAdminInviteEmail', () => {
  it('builds a Romanian admin email with the correct subject and CTA', () => {
    const email = buildAdminInviteEmail(adminParams());
    expect(email.subject).toContain('Administrator');
    expect(email.text).toContain('Popescu Ion');
    expect(email.text).toContain('Administrator');
    expect(email.text).toContain(SETUP_LINK);
    expect(email.html).toContain('Accepta invitatia');
  });

  it('builds an English admin email when locale is en', () => {
    const email = buildAdminInviteEmail(adminParams({ locale: 'en' }));
    expect(email.subject).toContain('Administrator Invitation');
    expect(email.html).toContain('Accept Invitation');
    expect(email.html).toContain('lang="en"');
  });

  it('falls back to a neutral greeting when no name is given', () => {
    const ro = buildAdminInviteEmail(adminParams({ adminName: null }));
    expect(ro.text.startsWith('Buna ziua,')).toBe(true);
    const en = buildAdminInviteEmail(adminParams({ locale: 'en', adminName: '   ' }));
    expect(en.text.startsWith('Hello,')).toBe(true);
  });

  it('embeds the QR code data URL in the HTML when provided', () => {
    const email = buildAdminInviteEmail(adminParams());
    expect(email.html).toContain(QR_DATA_URL);
    // Should also carry a QR hint text.
    expect(email.html).toContain('QR');
  });

  it('omits the QR block when qrCodeDataUrl is absent', () => {
    const email = buildAdminInviteEmail(adminParams({ qrCodeDataUrl: null }));
    expect(email.html).not.toContain('data:image/png;base64');
    // The link should still be present.
    expect(email.html).toContain(SETUP_LINK);
  });

  it('escapes HTML-significant characters in the admin name', () => {
    const email = buildAdminInviteEmail(adminParams({ adminName: 'A & B <Test>' }));
    expect(email.html).toContain('A &amp; B &lt;Test&gt;');
    expect(email.html).not.toContain('<Test>');
  });

  it('includes a 24-hour expiry notice and an ignore instruction', () => {
    const ro = buildAdminInviteEmail(adminParams());
    expect(ro.text).toContain('24');
    expect(ro.text).toContain('ignorati');
    const en = buildAdminInviteEmail(adminParams({ locale: 'en' }));
    expect(en.text).toContain('24 hours');
    expect(en.text).toContain('ignore');
  });

  it('renders the branded header in the HTML body', () => {
    const email = buildAdminInviteEmail(adminParams());
    expect(email.html).toContain('vecini.online');
    // The CTA is a rounded-pill button (border-radius 9999px).
    expect(email.html).toContain('9999px');
  });
});
