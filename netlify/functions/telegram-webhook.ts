import { telegram, verifyWebhookSecret } from './_shared/telegram';

interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}
interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number };
  text?: string;
}
interface CallbackQuery {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
}
interface Update {
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

const WELCOME_NO_CODE =
  'Bună! Sunt asistentul digital al asociației tale de proprietari.\n\n' +
  'Pentru a te lega de apartamentul tău, am nevoie de codul de invitație ' +
  'primit de la administrator (8 caractere, ex: AB23CD45).\n\n' +
  'Trimite-mi codul.';

async function handleMessage(msg: TelegramMessage) {
  const text = (msg.text ?? '').trim();
  if (text.startsWith('/start')) {
    const code = text.split(/\s+/)[1];
    if (code) {
      await telegram.sendMessage(
        msg.chat.id,
        `Verific codul „${code.toUpperCase()}”…\n\nDacă este valid, te voi lega de apartamentul tău.`,
      );
    } else {
      await telegram.sendMessage(msg.chat.id, WELCOME_NO_CODE);
    }
    return;
  }
  if (text === '/menu' || text === '/help') {
    await telegram.sendMessage(msg.chat.id, 'Meniul principal:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📢 Anunțuri', callback_data: 'menu:anunturi' },
            { text: '🗳 Voturi', callback_data: 'menu:voturi' },
          ],
          [
            { text: '⚠ Sesizare', callback_data: 'menu:sesizare' },
            { text: '📅 Rezervări', callback_data: 'menu:rezervari' },
          ],
        ],
      },
    });
    return;
  }
  await telegram.sendMessage(msg.chat.id, 'Nu am înțeles. Scrie /menu pentru opțiuni.');
}

async function handleCallback(cq: CallbackQuery) {
  await telegram.answerCallbackQuery(cq.id);
  if (cq.message) {
    await telegram.sendMessage(cq.message.chat.id, `Ai ales: ${cq.data}`);
  }
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  if (!verifyWebhookSecret(req.headers.get('x-telegram-bot-api-secret-token'))) {
    return new Response('Unauthorized', { status: 401 });
  }

  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  try {
    if (update.message) await handleMessage(update.message);
    else if (update.callback_query) await handleCallback(update.callback_query);
  } catch (err) {
    console.error('telegram-webhook error', err);
  }

  return new Response('OK', { status: 200 });
};
