import { describe, expect, it, beforeEach } from 'vitest';
import { useTelegramLinkStore } from '@/shared/store/telegramLinkStore';
import { buildTelegramDeepLink } from '@/features/telegram/telegramDeepLink';

function resetStore() {
  useTelegramLinkStore.setState({ linkCodes: [], links: [] });
}

beforeEach(resetStore);

describe('buildTelegramDeepLink', () => {
  it('builds the expected t.me URL', () => {
    expect(buildTelegramDeepLink('vecini_bot', 'AB12CD34')).toBe(
      'https://t.me/vecini_bot?start=AB12CD34',
    );
  });

  it('handles a code with mixed case', () => {
    const url = buildTelegramDeepLink('testBot', 'XY98ZA12');
    expect(url).toContain('?start=XY98ZA12');
  });
});

describe('TelegramLinkPanel store interactions', () => {
  it('issueLinkCode returns an 8-character code', () => {
    const code = useTelegramLinkStore
      .getState()
      .issueLinkCode({ userId: 'u-1', asociatieId: 'asoc-1', role: 'proprietar' });
    expect(code.code).toHaveLength(8);
    expect(code.consumedAt).toBeNull();
  });

  it('issueLinkCode scopes the code to the user + asociatie', () => {
    const code = useTelegramLinkStore
      .getState()
      .issueLinkCode({ userId: 'u-42', asociatieId: 'asoc-7', role: 'comitet' });
    expect(code.userId).toBe('u-42');
    expect(code.asociatieId).toBe('asoc-7');
    expect(code.role).toBe('comitet');
  });

  it('deep link built from issued code is a valid URL', () => {
    const code = useTelegramLinkStore
      .getState()
      .issueLinkCode({ userId: 'u-1', asociatieId: 'asoc-1', role: 'proprietar' });
    const url = buildTelegramDeepLink('vecini_bot', code.code);
    expect(url).toMatch(/^https:\/\/t\.me\/vecini_bot\?start=[A-Z0-9]{8}$/i);
  });

  it('unlink removes the established link from the store', () => {
    useTelegramLinkStore.setState({
      links: [
        {
          telegramUserId: 999,
          userId: 'u-1',
          asociatieId: 'asoc-1',
          role: 'proprietar',
          apartmentId: null,
          username: 'ion',
          firstName: 'Ion',
          linkedAt: Date.now(),
          source: 'link-code',
        },
      ],
    });
    useTelegramLinkStore.getState().unlink(999);
    expect(useTelegramLinkStore.getState().links).toHaveLength(0);
  });

  it('consecutive issueLinkCode calls produce unique codes', () => {
    const a = useTelegramLinkStore
      .getState()
      .issueLinkCode({ userId: 'u-1', asociatieId: 'asoc-1', role: 'proprietar' });
    const b = useTelegramLinkStore
      .getState()
      .issueLinkCode({ userId: 'u-1', asociatieId: 'asoc-1', role: 'proprietar' });
    expect(a.code).not.toBe(b.code);
  });
});
