import { describe, expect, it } from 'vitest';
import ro from '@/shared/locales/ro.json';
import en from '@/shared/locales/en.json';

const PLURAL_SUFFIXES = ['_one', '_few', '_other', '_zero', '_many', '_two'];
const isPlural = (key: string) => PLURAL_SUFFIXES.some(s => key.endsWith(s));

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(acc, flatten(v as Record<string, unknown>, key));
    } else if (typeof v === 'string') {
      acc[key] = v;
    }
    return acc;
  }, {});
}

const roFlat = flatten(ro as unknown as Record<string, unknown>);
const enFlat = flatten(en as unknown as Record<string, unknown>);

describe('Romanian plural-form correctness', () => {
  it('ro.json has no bare count-bearing keys (all must use _one/_few/_other)', () => {
    const bad = Object.entries(roFlat)
      .filter(([k, v]) => !isPlural(k) && v.includes('{{count}}'));
    expect(bad, `Non-plural count keys found: ${bad.map(([k]) => k).join(', ')}`).toHaveLength(0);
  });

  it('en.json has no bare count-bearing keys (all must use _one/_other)', () => {
    const bad = Object.entries(enFlat)
      .filter(([k, v]) => !isPlural(k) && v.includes('{{count}}'));
    expect(bad, `Non-plural count keys found: ${bad.map(([k]) => k).join(', ')}`).toHaveLength(0);
  });

  it('every ro.json plural group has _one, _few, and _other', () => {
    const roots = [...new Set(
      Object.keys(roFlat)
        .filter(isPlural)
        .map(k => PLURAL_SUFFIXES.reduce((a, s) => (a.endsWith(s) ? a.slice(0, -s.length) : a), k))
    )];
    const missing: string[] = [];
    for (const root of roots) {
      if (!roFlat[`${root}_one`]) missing.push(`${root}_one`);
      if (!roFlat[`${root}_few`]) missing.push(`${root}_few`);
      if (!roFlat[`${root}_other`]) missing.push(`${root}_other`);
    }
    expect(missing, `Missing plural variants: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('every en.json plural group has _one and _other', () => {
    const roots = [...new Set(
      Object.keys(enFlat)
        .filter(isPlural)
        .map(k => PLURAL_SUFFIXES.reduce((a, s) => (a.endsWith(s) ? a.slice(0, -s.length) : a), k))
    )];
    const missing: string[] = [];
    for (const root of roots) {
      if (!enFlat[`${root}_one`]) missing.push(`${root}_one`);
      if (!enFlat[`${root}_other`]) missing.push(`${root}_other`);
    }
    expect(missing, `Missing plural variants: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('Romanian: count=1 uses singular noun forms', () => {
    expect(roFlat['polls.votesCount_one']).toBe('{{count}} vot');
    expect(roFlat['discussions.messageCount_one']).toBe('{{count}} mesaj');
    expect(roFlat['surveys.responses_one']).toBe('{{count}} răspuns');
    expect(roFlat['events.rsvpCount_one']).toBe('{{count}} participant');
    expect(roFlat['notifications.daysAgo_one']).toBe('acum {{count}} zi');
    expect(roFlat['notifications.hoursAgo_one']).toBe('acum {{count}} oră');
  });

  it('Romanian: count=5 uses _few (no "de" prefix)', () => {
    expect(roFlat['polls.votesCount_few']).toBe('{{count}} voturi');
    expect(roFlat['discussions.messageCount_few']).toBe('{{count}} mesaje');
    expect(roFlat['surveys.responses_few']).toBe('{{count}} răspunsuri');
    expect(roFlat['apartments.generateInvitesEligible_few']).toBe('{{count}} apartamente eligibile');
    expect(roFlat['apartments.generateInvitesSent_few']).toBe('Trimise {{count}} invitații');
    expect(roFlat['apartments.generateInvitesFailed_few']).toBe('{{count}} invitații nu s-au putut trimite');
  });

  it('Romanian: count=20+ uses _other (with "de" where noun follows)', () => {
    expect(roFlat['polls.votesCount_other']).toBe('{{count}} de voturi');
    expect(roFlat['discussions.messageCount_other']).toBe('{{count}} de mesaje');
    expect(roFlat['surveys.responses_other']).toBe('{{count}} de răspunsuri');
    expect(roFlat['audit.count_other']).toBe('{{count}} de înregistrări');
  });

  it('English: count=1 uses singular', () => {
    expect(enFlat['polls.votesCount_one']).toBe('{{count}} vote');
    expect(enFlat['surveys.responses_one']).toBe('{{count}} response');
    expect(enFlat['notifications.daysAgo_one']).toBe('{{count}} day ago');
    expect(enFlat['alerts.sent_one']).toBe('Alert sent to {{count}} person.');
  });

  it('English: count>1 uses plural', () => {
    expect(enFlat['polls.votesCount_other']).toBe('{{count}} votes');
    expect(enFlat['surveys.responses_other']).toBe('{{count}} responses');
    expect(enFlat['notifications.daysAgo_other']).toBe('{{count}} days ago');
    expect(enFlat['alerts.sent_other']).toBe('Alert sent to {{count}} people.');
  });
});
