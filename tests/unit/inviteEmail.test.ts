import { describe, expect, it } from 'vitest';
import {
  buildInviteEmail,
  resolveEmailLocale,
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
