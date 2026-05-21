export { verifyWebhookSecret, validateInitData } from '../../../src/shared/lib/telegramAuth';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const API = `https://api.telegram.org/bot${TOKEN}`;

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
}

export interface SendMessageOptions {
  reply_markup?: { inline_keyboard: InlineKeyboardButton[][] };
  parse_mode?: 'HTML' | 'MarkdownV2';
  disable_notification?: boolean;
}

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export const telegram = {
  sendMessage: (chatId: number | string, text: string, opts: SendMessageOptions = {}) =>
    call('sendMessage', { chat_id: chatId, text, ...opts }),
  editMessageText: (
    chatId: number | string,
    messageId: number,
    text: string,
    opts: SendMessageOptions = {},
  ) => call('editMessageText', { chat_id: chatId, message_id: messageId, text, ...opts }),
  answerCallbackQuery: (id: string, text?: string) =>
    call('answerCallbackQuery', { callback_query_id: id, text }),
};
