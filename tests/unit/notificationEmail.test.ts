import { describe, expect, it } from 'vitest';
import { buildNotificationEmail } from '@/shared/lib/notificationEmail';

const APP_URL = 'https://vecini.online';
const RECIPIENT = 'user-123';

describe('buildNotificationEmail -- membership.joined', () => {
  it('produces a Romanian subject when locale is ro', () => {
    const result = buildNotificationEmail({
      locale: 'ro',
      kind: 'membership.joined',
      data: { name: 'Ion Ionescu', role: 'proprietar' },
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(result.subject).toContain('Ion Ionescu');
    expect(result.subject).toMatch(/alăturat/);
  });

  it('produces an English subject when locale is en', () => {
    const result = buildNotificationEmail({
      locale: 'en',
      kind: 'membership.joined',
      data: { name: 'John Smith', role: 'resident' },
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(result.subject).toContain('John Smith');
    expect(result.subject).toMatch(/joined/);
  });

  it('uses anonymous fallback when name is empty', () => {
    const ro = buildNotificationEmail({
      locale: 'ro',
      kind: 'membership.joined',
      data: {},
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(ro.text).toMatch(/Un locatar/);

    const en = buildNotificationEmail({
      locale: 'en',
      kind: 'membership.joined',
      data: {},
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(en.text).toMatch(/A resident/);
  });

  it('includes manage-members CTA link in text', () => {
    const result = buildNotificationEmail({
      locale: 'ro',
      kind: 'membership.joined',
      data: { name: 'Maria', role: 'locatar' },
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(result.text).toContain(`${APP_URL}/app/admin/invitatii`);
  });

  it('HTML contains unsubscribe link', () => {
    const result = buildNotificationEmail({
      locale: 'en',
      kind: 'membership.joined',
      data: { name: 'Ann' },
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(result.html).toContain('unsubscribe-email');
  });
});

describe('buildNotificationEmail -- announcement.published', () => {
  it('produces subject with announcement title', () => {
    const result = buildNotificationEmail({
      locale: 'ro',
      kind: 'announcement.published',
      data: { title: 'Reparații lift', body: 'Liftul va fi oprit joi.' },
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(result.subject).toContain('Reparații lift');
    expect(result.text).toContain('Liftul va fi oprit joi.');
  });

  it('uses custom link when provided in data', () => {
    const result = buildNotificationEmail({
      locale: 'en',
      kind: 'announcement.published',
      data: { title: 'AGM Notice', link: '/app/anunturi/42' },
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(result.text).toContain(`${APP_URL}/app/anunturi/42`);
    expect(result.html).toContain('/app/anunturi/42');
  });

  it('falls back to /app/anunturi when no link provided', () => {
    const result = buildNotificationEmail({
      locale: 'ro',
      kind: 'announcement.published',
      data: { title: 'Test' },
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(result.text).toContain(`${APP_URL}/app/anunturi`);
  });
});

describe('buildNotificationEmail -- generic', () => {
  it('uses title as subject', () => {
    const result = buildNotificationEmail({
      locale: 'en',
      kind: 'generic',
      data: { title: 'Water outage', body: 'Water will be cut tomorrow.' },
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(result.subject).toBe('Water outage');
    expect(result.text).toContain('Water will be cut tomorrow.');
  });

  it('includes prefs link in footer text', () => {
    const result = buildNotificationEmail({
      locale: 'ro',
      kind: 'generic',
      data: { title: 'Test' },
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(result.text).toContain(`${APP_URL}/app/notificari`);
  });

  it('produces valid HTML with doctype', () => {
    const result = buildNotificationEmail({
      locale: 'en',
      kind: 'generic',
      data: { title: 'Hello', body: 'World' },
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(result.html).toMatch(/^<!doctype html>/i);
    expect(result.html).toContain('<html lang="en">');
  });

  it('defaults to Romanian for unrecognised locale', () => {
    const result = buildNotificationEmail({
      locale: 'fr',
      kind: 'generic',
      data: { title: 'Test' },
      appUrl: APP_URL,
      recipientUserId: RECIPIENT,
    });
    expect(result.html).toContain('lang="ro"');
  });
});
