import { describe, expect, it } from 'vitest';
import { verifyWebhookSecret, validateInitData, signInitData } from '@/shared/lib/telegramAuth';

const BOT_TOKEN = '123456:TEST-token-abcdef';

describe('verifyWebhookSecret', () => {
  it('matches the configured secret', () => {
    expect(verifyWebhookSecret('s3cr3t', 's3cr3t')).toBe(true);
  });
  it('rejects a wrong or missing secret', () => {
    expect(verifyWebhookSecret('nope', 's3cr3t')).toBe(false);
    expect(verifyWebhookSecret(null, 's3cr3t')).toBe(false);
    expect(verifyWebhookSecret('s3cr3t', '')).toBe(false);
  });
});

describe('validateInitData', () => {
  it('accepts correctly signed initData', () => {
    const initData = signInitData(
      {
        auth_date: String(Math.floor(Date.now() / 1000)),
        query_id: 'AAH',
        user: JSON.stringify({ id: 42, first_name: 'Ana' }),
      },
      BOT_TOKEN,
    );
    const result = validateInitData(initData, BOT_TOKEN);
    expect(result).not.toBeNull();
    expect(result?.get('query_id')).toBe('AAH');
  });

  it('rejects tampered initData', () => {
    const initData = signInitData(
      { auth_date: String(Math.floor(Date.now() / 1000)), query_id: 'AAH' },
      BOT_TOKEN,
    );
    const params = new URLSearchParams(initData);
    params.set('query_id', 'TAMPERED');
    expect(validateInitData(params.toString(), BOT_TOKEN)).toBeNull();
  });

  it('rejects a wrong bot token', () => {
    const initData = signInitData(
      { auth_date: String(Math.floor(Date.now() / 1000)) },
      BOT_TOKEN,
    );
    expect(validateInitData(initData, 'other:token')).toBeNull();
  });

  it('rejects stale initData past max age', () => {
    const initData = signInitData({ auth_date: '1000000000' }, BOT_TOKEN);
    expect(validateInitData(initData, BOT_TOKEN, 60)).toBeNull();
  });
});
