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

import { processTelegramWebhook, PRIMARY_COMMANDS } from '@/shared/server/telegramWebhook';

const SECRET = 'unit-test-secret';

function post(body: unknown) {
  return processTelegramWebhook({
    method: 'POST',
    secretToken: SECRET,
    readJson: async () => body,
  });
}

function msg(text: string, chatId = 42) {
  return { message: { message_id: 1, chat: { id: chatId }, text } };
}

function cb(data: string, chatId = 99) {
  return {
    callback_query: { id: 'cb1', from: { id: 7 }, data, message: { message_id: 2, chat: { id: chatId } } },
  };
}

beforeEach(() => {
  process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
  sendMessage.mockClear();
  answerCallbackQuery.mockClear();
});

afterEach(() => {
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
});

describe('processTelegramWebhook — HTTP layer', () => {
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

  it('does not surface handler errors to Telegram (still 200)', async () => {
    sendMessage.mockRejectedValueOnce(new Error('telegram down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(msg('/menu'));
    expect(res.status).toBe(200);
    errSpy.mockRestore();
  });
});

describe('/menu and /help', () => {
  it('/menu sends an inline keyboard and returns 200', async () => {
    const res = await post(msg('/menu'));
    expect(res).toEqual({ status: 200, body: 'OK' });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][0]).toBe(42);
    const opts = sendMessage.mock.calls[0][2] as { reply_markup: { inline_keyboard: unknown[][] } };
    expect(opts.reply_markup.inline_keyboard.length).toBeGreaterThan(0);
  });

  it('/help sends the same inline keyboard', async () => {
    await post(msg('/help'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const opts = sendMessage.mock.calls[0][2] as { reply_markup: { inline_keyboard: unknown[][] } };
    expect(opts.reply_markup.inline_keyboard.length).toBeGreaterThan(0);
  });

  it('/menu@botname strips the suffix and still routes correctly', async () => {
    const res = await post(msg('/menu@vecini_test_bot'));
    expect(res.status).toBe(200);
    const opts = sendMessage.mock.calls[0][2] as { reply_markup: { inline_keyboard: unknown[][] } };
    expect(opts.reply_markup.inline_keyboard.length).toBeGreaterThan(0);
  });
});

describe('primary command handlers', () => {
  const primaryCmds: string[] = [
    '/anunturi',
    '/voturi',
    '/sesizare',
    '/sesizarile_mele',
    '/rezervari',
    '/evenimente',
    '/urgenta',
    '/setari',
  ];

  it.each(primaryCmds)('%s sends a non-empty informational reply', async (cmd) => {
    const res = await post(msg(cmd));
    expect(res).toEqual({ status: 200, body: 'OK' });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text] = sendMessage.mock.calls[0] as [number, string];
    expect(chatId).toBe(42);
    expect(text.length).toBeGreaterThan(20);
  });

  it('PRIMARY_COMMANDS exports one entry for each primary command', () => {
    for (const cmd of primaryCmds) {
      expect(PRIMARY_COMMANDS[cmd]).toBeTruthy();
      expect(typeof PRIMARY_COMMANDS[cmd]).toBe('string');
    }
  });

  it('replies match the exported PRIMARY_COMMANDS dictionary', async () => {
    await post(msg('/anunturi'));
    const [, text] = sendMessage.mock.calls[0] as [number, string];
    expect(text).toBe(PRIMARY_COMMANDS['/anunturi']);
  });
});

describe('menu callback routing', () => {
  const menuCallbacks = ['menu:anunturi', 'menu:voturi', 'menu:sesizare', 'menu:rezervari'];

  it.each(menuCallbacks)('%s routes to a meaningful informational reply', async (data) => {
    const res = await post(cb(data));
    expect(res.status).toBe(200);
    expect(answerCallbackQuery).toHaveBeenCalledWith('cb1');
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text] = sendMessage.mock.calls[0] as [number, string];
    expect(chatId).toBe(99);
    expect(text.length).toBeGreaterThan(20);
    expect(text).not.toContain('Ai ales:');
  });

  it('unknown callback data gets a fallback message', async () => {
    const res = await post(cb('unknown:xyz'));
    expect(res.status).toBe(200);
    expect(answerCallbackQuery).toHaveBeenCalledWith('cb1');
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [, text] = sendMessage.mock.calls[0] as [number, string];
    expect(text.length).toBeGreaterThan(20);
  });

  it('callback with no message property does not call sendMessage', async () => {
    const res = await processTelegramWebhook({
      method: 'POST',
      secretToken: SECRET,
      readJson: async () => ({
        callback_query: { id: 'cb2', from: { id: 7 }, data: 'menu:voturi' },
      }),
    });
    expect(res.status).toBe(200);
    expect(answerCallbackQuery).toHaveBeenCalledWith('cb2');
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe('/start command', () => {
  it('/start with no payload asks for an invite code', async () => {
    await post(msg('/start'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [, text] = sendMessage.mock.calls[0] as [number, string];
    expect(text.length).toBeGreaterThan(20);
  });

  it('/start with a well-formed code acknowledges it', async () => {
    await post(msg('/start AB23CD45'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [, text] = sendMessage.mock.calls[0] as [number, string];
    expect(text).toContain('AB23CD45');
  });

  it('/start with invalid code format replies with unknown message', async () => {
    await post(msg('/start NOT_A_CODE'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [, text] = sendMessage.mock.calls[0] as [number, string];
    expect(text).toContain('recunoscut');
  });
});

describe('feature commands and fallback', () => {
  it('/documente sends a feature guide reply', async () => {
    await post(msg('/documente'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [, text] = sendMessage.mock.calls[0] as [number, string];
    expect(text.length).toBeGreaterThan(20);
  });

  it('unrecognised text sends the fallback message', async () => {
    await post(msg('salut!'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [, text] = sendMessage.mock.calls[0] as [number, string];
    expect(text).toContain('/menu');
  });

  it('update with no message and no callback_query is a no-op (200)', async () => {
    const res = await post({ edited_message: { message_id: 9, chat: { id: 1 }, text: 'hi' } });
    expect(res.status).toBe(200);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
