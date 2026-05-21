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

/** Slash commands that map to a feature page. The reply guides the resident to
 *  the in-app Mini App; richer flows are handled there. */
const FEATURE_COMMANDS: Record<string, string> = {
  '/locator': '📌 Anunțuri vecini — vezi sau publică anunțuri neoficiale (vând, caut, ofer). Deschide secțiunea „Anunțuri vecini” din aplicație.',
  '/locator_new': '📌 Pentru a publica un anunț nou, deschide „Anunțuri vecini” în aplicație și apasă „Anunț nou”.',
  '/faq': '❓ Întrebări frecvente — caută răspunsuri rapide în secțiunea „FAQ” din aplicație.',
  '/idei': '💡 Cutia de idei — propune sau votează idei pentru bloc în secțiunea „Cutie de idei”.',
  '/idei_propune': '💡 Pentru a propune o idee, deschide „Cutie de idei” în aplicație și apasă „Propune o idee”.',
  '/istoric_reparatii': '🔧 Istoric reparații — caută reparațiile efectuate în bloc în secțiunea „Istoric reparații”.',
  '/contor': '🚰 Citire contoare — trimite indexul lunar din secțiunea „Citire contoare” a aplicației.',
  '/vecini': '📇 Agenda vecinilor — vezi vecinii care au optat să fie listați în secțiunea „Vecini”.',
  '/multumeste': '💛 Carte de aur — lasă o mulțumire publică unui vecin în secțiunea „Mulțumiri”.',
  '/glosar': '📖 Glosar — caută definiții pentru termenii din facturi și AGA în secțiunea „Glosar”.',
  '/sondaje': '📊 Sondaje de opinie — răspunde la sondajele neobligatorii în secțiunea „Sondaje de opinie”.',
  '/imprumut': '🤝 Obiecte împrumutabile — caută unelte și obiecte pe care vecinii le împrumută în secțiunea „Împrumuturi”.',
  '/imprumut_adauga': '🤝 Pentru a adăuga un obiect, deschide „Împrumuturi” în aplicație și apasă „Adaugă obiect”.',
  '/biciclete': '🚲 Bicicletăria — vezi sau înregistrează bicicletele din camera comună în secțiunea „Bicicletărie”.',
  '/animale': '🐾 Animale de companie — vezi animalele înregistrate sau anunță o pierdere în secțiunea „Animale”.',
  '/garantii': '🛡 Garanții — urmărește garanțiile echipamentelor instalate în secțiunea „Garanții” (comitet).',
  '/strain': '👀 Vizitatori observați — raportează rapid o persoană suspectă în secțiunea „Vizitatori”.',
  '/marketplace': '🛍 Marketplace intern — vinde sau donează obiecte vecinilor în secțiunea „Marketplace”.',
  '/marketplace_vand': '🛍 Pentru a publica un anunț de vânzare, deschide „Marketplace” și apasă „Anunț nou”.',
  '/feedback': '💬 Feedback — trimite-ne o părere despre aplicația IntreVecini din secțiunea „Feedback”.',
};

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
  const command = text.split(/\s+/)[0].toLowerCase();
  if (FEATURE_COMMANDS[command]) {
    await telegram.sendMessage(msg.chat.id, FEATURE_COMMANDS[command]);
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
