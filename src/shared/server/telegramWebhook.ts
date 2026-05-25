// Framework-independent Telegram webhook logic.
//
// All of the bot's update handling lives here, decoupled from any HTTP runtime,
// so it can be driven by:
//   - the Netlify function adapter (netlify/functions/telegram-webhook.ts), and
//   - the standalone Node service used on the Raspberry Pi
//     (server/telegram-server.ts).
//
// Adapters are thin: they translate their runtime's request into
// `processTelegramWebhook` and translate the returned status/body back. Imports
// are relative (no `@/` alias) so this module type-checks under both the app and
// the node tsconfig.
import { telegram } from './telegramApi';
import { verifyWebhookSecret } from '../lib/telegramAuth';
import {
  parseStartCommand,
  payloadLooksLikeCode,
  normalizeStartPayload,
  replyChecking,
  replyForStart,
} from '../lib/telegramStart';

export interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}
export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number };
  text?: string;
}
export interface CallbackQuery {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
}
export interface Update {
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

/** Slash commands that map to a feature page. The reply guides the resident to
 *  the in-app Mini App; richer flows are handled there. */
export const FEATURE_COMMANDS: Record<string, string> = {
  '/locator': '📌 Anunțuri vecini — vezi sau publică anunțuri neoficiale (vând, caut, ofer). Deschide secțiunea „Anunțuri vecini” din aplicație.',
  '/locator_new': '📌 Pentru a publica un anunț nou, deschide „Anunțuri vecini” în aplicație și apasă „Anunț nou”.',
  '/faq': '❓ Întrebări frecvente — caută răspunsuri rapide în secțiunea „FAQ” din aplicație.',
  '/idei': '💡 Cutia de idei — propune sau votează idei pentru bloc în secțiunea „Cutie de idei”.',
  '/idei_propune': '💡 Pentru a propune o idee, deschide „Cutie de idei” în aplicație și apasă „Propune o idee”.',
  '/istoric_reparatii': '🔧 Istoric reparații — caută reparațiile efectuate în bloc în secțiunea „Istoric reparații”.',
  '/contor': '🚰 Citire contoare — trimite indexul lunar din secțiunea „Citire contoare” a aplicației.',
  '/sesizari_recurente': '🔁 Sesizări recurente — vezi problemele care se repetă în același loc (lift, iluminat) și sugestia de rezolvare în secțiunea „Sesizări recurente” (comitet).',
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
  '/feedback': '💬 Feedback — trimite-ne o părere despre aplicația vecini.online din secțiunea „Feedback”.',
  '/documente': '📄 Documente — caută statutul, regulamentul și contractele asociației în secțiunea „Documente”.',
  '/furnizori': '🏢 Furnizori — vezi furnizorii și termenele contractelor în secțiunea „Furnizori” (comitet).',
  '/boxe': '📦 Boxe — vezi cine deține fiecare boxă sau dependință în secțiunea „Boxe”.',
  '/carpool': '🚗 Carpooling — găsește vecini cu trasee similare în secțiunea „Carpooling”.',
  '/aniversari': '🎂 Aniversări — vezi zilele de naștere ale vecinilor care au optat în secțiunea „Aniversări”.',
  '/energie': '⚡ Energie — urmărește consumul energetic al spațiilor comune în secțiunea „Energie”.',
  '/plan_multianual': '🗓 Plan multianual — vezi planul de lucrări pe mai mulți ani în secțiunea „Plan multianual”.',
  '/curier': '🔑 Acces curierat — generează un cod temporar de interfon (valabil 30 min) în secțiunea „Acces curierat”.',
  '/babysit': '🍼 Babysitting / pet-sitting — găsește vecini disponibili în secțiunea „Babysitting / pet-sitting”.',
  '/petsit': '🐾 Pet-sitting — găsește vecini disponibili în secțiunea „Babysitting / pet-sitting”.',
  '/barter': '🔁 Barter — oferă și caută servicii între vecini în secțiunea „Schimb de servicii”.',
  '/bulk': '🛒 Cumpărături comune — vezi sau pornește o comandă în grup în secțiunea „Cumpărături comune”.',
  '/mentenanta': '🗓 Service-uri programate — vezi reviziile și verificările programate (ISCIR, centrală, deratizare) în secțiunea „Service-uri programate”.',
  '/parcare': '🅿 Parcare — caută un loc sau un număr de înmatriculare în registrul de parcare din secțiunea „Parcare”.',
  '/petitii': '📜 Petiții — pornește sau semnează o petiție către comitet în secțiunea „Petiții interne”.',
  '/crowdfund': '🪙 Crowdfunding — contribuie la proiectele mici ale blocului în secțiunea „Crowdfunding”.',
  '/fond_reparatii': '🧮 Fond de reparații — calculează o rată lunară recomandată în secțiunea „Fond de reparații”.',
  '/psi': '🔥 Verificări PSI — urmărește termenele verificărilor de stingătoare, hidranți și instalație electrică în secțiunea „Verificări PSI” (comitet).',
  '/asigurare': '☂ Asigurare bloc — vezi polița și data de reînnoire în secțiunea „Asigurare bloc” (comitet).',
  '/chei': '🔑 Registru de chei — vezi cine deține cheile spațiilor comune în secțiunea „Registru de chei” (comitet).',
  '/anonim': '🕶 Mesaj anonim — trimite o sesizare către comitet fără să-ți dezvălui identitatea, în secțiunea „Mesaj anonim”.',
  '/contact_admin': '✉️ Mesagerie privată — scrie-i direct administratorului despre o problemă personală sau sensibilă, în secțiunea „Mesagerie privată cu administratorul”.',
  '/procese_verbale': '📑 Procese verbale — caută în arhiva proceselor verbale semnate (AGA, comitet, recepții) în secțiunea „Procese verbale”.',
  '/oferte': '📋 Solicitare oferte — vezi cererile de ofertă active și ofertele primite în secțiunea „Solicitare oferte” (comitet).',
  '/garda': '🛡 Vecin de gardă — vezi cine e de gardă în acest weekend sau înscrie-te în secțiunea „Vecin de gardă”.',
  '/plante': '🌱 Spații verzi — vezi sarcinile de îngrijire a spațiilor verzi și înscrie-te ca voluntar în secțiunea „Plante / spații verzi”.',
  '/wiki': '📚 Wiki bloc — caută instrucțiuni utile despre bloc (apă, lift, curent) în secțiunea „Wiki bloc”.',
  '/contractori': '👷 Contractori — caută în biblioteca de contractori verificați, cu rating, în secțiunea „Contractori” (comitet).',
  '/alarma': '🔔 Sistem alarmă — vezi statusul sistemelor de alarmă și detecție și istoricul testelor în secțiunea „Sistem alarmă”.',
  '/discutii': '💬 Canal de discuții — participă la discuțiile moderate ale blocului (parcare, curățenie, vecini) în secțiunea „Canal de discuții”.',
  '/aga': '⚖️ AGA digitală — vezi convocatorul, ordinea de zi și cvorumul, confirmă prezența (sau procura) și votează pe fiecare punct în secțiunea „AGA digitală”.',
  '/buget_voteaza': '🐷 Buget participativ — votează propunerile pentru fondul discreționar în secțiunea „Buget participativ”.',
  '/buget_propune': '🐷 Buget participativ — propune o idee pentru fondul discreționar în secțiunea „Buget participativ”.',
  '/prioritati': '🔢 Prioritizare proiecte — ordonează proiectele mari (acoperiș, fațadă, lift) după prioritate în secțiunea „Prioritizare proiecte mari”.',
  '/spalatorie': '🧺 Spălătorie — vezi disponibilitatea și rezervă un slot la spălătoria comună în secțiunea „Rezervare spălătorie”.',
  '/lift': '🛗 Lift mutare — rezervă liftul pentru o mutare în ferestre de 3 ore în secțiunea „Rezervare lift pentru mutare”.',
  '/sala': '🎉 Sală comună / terasă — rezervă sala comună sau terasa pentru un eveniment în secțiunea „Rezervare sală comună / terasă”.',
  '/bun_venit': '🎁 Kit de bun-venit — parcurge pașii esențiali pentru locatarii noi (regulament, contoare, vecini, AGA) în secțiunea „Kit de bun-venit”.',
  '/copii_evenimente': '🧒 Activități copii — vezi câți copii sunt în bloc (pe grupe de vârstă, fără nume) și coordonează întâlniri la locul de joacă în secțiunea „Activități copii și adolescenți”.',
  '/proiecte': '🏗️ Urmărire proiecte — vezi stadiul lucrărilor majore (anvelopare, lift, acoperiș): faze, progres și buget alocat vs. cheltuit în secțiunea „Urmărire proiecte”.',
  '/jurnal_foto': '📸 Jurnal foto lucrări — urmărește lucrările în desfășurare printr-un jurnal foto cronologic, pe proiecte și faze, în secțiunea „Jurnal foto lucrări”.',
  '/cod_siguranta': '🔒 Cod de siguranță — stabilește o parolă împotriva escrocheriilor telefonice și o listă privată de persoane de încredere, vizibilă doar ție, în secțiunea „Cod de siguranță”.',
  '/evacuare': '🗺 Plan de evacuare — vezi traseul de evacuare, unde sunt stingătoarele, hidranții și ieșirile, și marchează prezența animalelor pentru pompieri, în secțiunea „Plan de evacuare”.',
  '/apartament_meu': '🚪 Informații apartament — vezi datele apartamentului tău, istoricul indexurilor la contoare, sesizările trimise și voturile exprimate în secțiunea „Informații apartament”.',
  '/securitate': '🔐 Securitate cont — activează autentificarea în doi pași (2FA) cu o aplicație de autentificare, generează coduri de recuperare și gestionează-ți factorul al doilea în secțiunea „Securitate”. Obligatorie pentru rolurile de administrare.',
  '/profil': '👤 Profil complet — completează-ți profilul (fotografie, telefon, apartament, număr de înmatriculare, contact de urgență) și adaugă câmpuri proprii, marcate ca private sau vizibile vecinilor, în secțiunea „Profil”.',
  '/invitatii': '🎟 Coduri de invitație — generează, listează și revocă codurile prin care vecinii se alătură asociației (rol, apartament și expirare opționale) în secțiunea „Coduri de invitație” (administrare).',
  '/alatura': '🤝 Alătură-te unei asociații — ai primit un cod de invitație de la administrator? Deschide aplicația, alege „Alătură-te unei asociații existente” și introdu codul ca să intri în asociația ta.',
  '/datele_mele': '🛡 Datele mele personale — descarcă o copie completă (JSON sau CSV) a datelor tale personale (drepturile de acces și portabilitate, GDPR art. 15 și 20) sau cere ștergerea contului (dreptul de a fi uitat, art. 17) din secțiunea „Datele mele personale”.',
  '/prelucrare': '📋 Prelucrarea datelor — administratorul găsește acordul de prelucrare a datelor (DPA, art. 28) și registrul activităților de prelucrare (art. 30), generat din funcțiile active și exportabil în JSON/CSV, în secțiunea „Prelucrarea datelor”.',
  '/incidente': '🚨 Incidente de securitate a datelor — administratorul înregistrează o încălcare a securității datelor, evaluează riscul și generează notificarea de 72 de ore către ANSPDCP (art. 33) și, la risc ridicat, informarea către locatari (art. 34), în secțiunea „Incidente de securitate”.',
  '/jurnal': '📜 Jurnal de audit — administratorul vede istoricul modificărilor din asociație (cine, ce și când a schimbat), filtrabil și exportabil, cu un lanț inviolabil verificat la fiecare vizită, în secțiunea „Jurnal de audit”.',
};

export async function handleMessage(msg: TelegramMessage): Promise<void> {
  const text = (msg.text ?? '').trim();
  const start = parseStartCommand(text);
  if (start) {
    if (!start.payload) {
      await telegram.sendMessage(msg.chat.id, replyForStart('no-code'));
      return;
    }
    // Reject obvious junk by format here; full resolution against the
    // invite-code lifecycle / per-user link codes (telegramLinkLogic) is wired
    // into the live webhook in T58, where the database is reachable.
    if (!payloadLooksLikeCode(start.payload)) {
      await telegram.sendMessage(msg.chat.id, replyForStart('unknown'));
      return;
    }
    await telegram.sendMessage(msg.chat.id, replyChecking(normalizeStartPayload(start.payload)));
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

export async function handleCallback(cq: CallbackQuery): Promise<void> {
  await telegram.answerCallbackQuery(cq.id);
  if (cq.message) {
    await telegram.sendMessage(cq.message.chat.id, `Ai ales: ${cq.data}`);
  }
}

/** Dispatch a single Telegram update to the right handler. */
export async function handleTelegramUpdate(update: Update): Promise<void> {
  if (update.message) await handleMessage(update.message);
  else if (update.callback_query) await handleCallback(update.callback_query);
}

/** A runtime-neutral webhook request: method, the secret header, and a lazy
 *  JSON-body reader that throws on malformed input. */
export interface TelegramWebhookRequest {
  method: string;
  secretToken: string | null | undefined;
  readJson: () => Promise<unknown>;
}

/** A runtime-neutral response the adapter maps onto its own reply type. */
export interface TelegramWebhookResult {
  status: number;
  body: string;
}

/**
 * Validate and process a Telegram webhook request, independent of HTTP runtime.
 * Mirrors the original Netlify function's contract: 405 for non-POST, 401 for a
 * bad secret, 400 for malformed JSON, and 200 ("OK") once the update is
 * dispatched (handler errors are logged, not surfaced to Telegram, so it does
 * not retry indefinitely).
 */
export async function processTelegramWebhook(
  req: TelegramWebhookRequest,
): Promise<TelegramWebhookResult> {
  if (req.method !== 'POST') return { status: 405, body: 'Method Not Allowed' };

  if (!verifyWebhookSecret(req.secretToken)) {
    return { status: 401, body: 'Unauthorized' };
  }

  let update: Update;
  try {
    update = (await req.readJson()) as Update;
  } catch {
    return { status: 400, body: 'Bad Request' };
  }

  try {
    await handleTelegramUpdate(update);
  } catch (err) {
    console.error('telegram-webhook error', err);
  }

  return { status: 200, body: 'OK' };
}
