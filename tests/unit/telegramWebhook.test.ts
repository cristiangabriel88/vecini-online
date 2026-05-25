import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Capture outbound bot calls so the framework-independent webhook logic can be
// exercised without touching the network.
const sendMessage = vi.fn().mockResolvedValue({});
const answerCallbackQuery = vi.fn().mockResolvedValue({});

vi.mock('@/shared/server/telegramApi', () => ({
  telegram: {
    sendMessage: (...args: unknown[]) => sendMessage(...args),
    answerCallbackQuery: (...args: unknown[]) => answerCallbackQuery(...args),
    editMessageText: vi.fn(),
  },
}));

import { processTelegramWebhook } from '@/shared/server/telegramWebhook';

const SECRET = 'unit-test-secret';

beforeEach(() => {
  process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
  sendMessage.mockClear();
  answerCallbackQuery.mockClear();
});

afterEach(() => {
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
});

describe('processTelegramWebhook', () => {
  it('rejects non-POST methods with 405', async () => {
    const res = await processTelegramWebhook({
      method: 'GET',
      secretToken: SECRET,
      readJson: async () => ({}),
    });
    expect(res).toEqual({ status: 405, body: 'Method Not Allowed' });
  });

  it('rejects a missing or wrong secret with 401', async () => {
    const res = await processTelegramWebhook({
      method: 'POST',
      secretToken: 'wrong',
      readJson: async () => ({}),
    });
    expect(res.status).toBe(401);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('returns 400 when the body is not valid JSON', async () => {
    const res = await processTelegramWebhook({
      method: 'POST',
      secretToken: SECRET,
      readJson: async () => {
        throw new SyntaxError('bad json');
      },
    });
    expect(res.status).toBe(400);
  });

  it('dispatches a /menu message and replies 200 OK', async () => {
    const res = await processTelegramWebhook({
      method: 'POST',
      secretToken: SECRET,
      readJson: async () => ({ message: { message_id: 1, chat: { id: 42 }, text: '/menu' } }),
    });
    expect(res).toEqual({ status: 200, body: 'OK' });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][0]).toBe(42);
  });

  it('answers a callback query and replies 200 OK', async () => {
    const res = await processTelegramWebhook({
      method: 'POST',
      secretToken: SECRET,
      readJson: async () => ({
        callback_query: { id: 'cb1', from: { id: 7 }, data: 'menu:voturi', message: { message_id: 2, chat: { id: 99 } } },
      }),
    });
    expect(res.status).toBe(200);
    expect(answerCallbackQuery).toHaveBeenCalledWith('cb1');
    expect(sendMessage).toHaveBeenCalledWith(99, 'Ai ales: menu:voturi');
  });

  it('does not surface handler errors to Telegram (still 200)', async () => {
    sendMessage.mockRejectedValueOnce(new Error('telegram down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await processTelegramWebhook({
      method: 'POST',
      secretToken: SECRET,
      readJson: async () => ({ message: { message_id: 1, chat: { id: 42 }, text: '/menu' } }),
    });
    expect(res.status).toBe(200);
    errSpy.mockRestore();
  });
});
