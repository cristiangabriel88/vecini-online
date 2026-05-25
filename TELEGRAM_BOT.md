# Telegram Bot — vecini.online

The Telegram bot is the primary touchpoint for residents who don't want to install a separate app or use a web browser. Everything in this doc is implementation detail. The user-facing setup guide is in `/BOT_SETUP.md`.

## High-level model

- **One bot per vecini.online deployment**, multi-tenant aware
- The bot identifies the user's asociație by looking up `telegram_user_id` in `telegram_users` joined to `apartments` joined to `asociatii`
- Webhook receives all updates at `/.netlify/functions/telegram-webhook`
- The bot is mostly callback-driven (inline keyboards) rather than text-command driven, because that's easier for non-tech-savvy residents

## Required setup (in BotFather, by the deploying user)

The user creates the bot via `@BotFather` and:
1. Sets bot name and username
2. Disables privacy mode in groups (so it can read group messages if needed)
3. Sets command list (see below)
4. Configures a Mini App URL (the deployment URL)
5. Sets a webhook URL with a secret token

The deployment script provides all the commands they need to paste into BotFather. See `BOT_SETUP.md`.

## Command list

```
/start - Pornește botul sau leagă un apartament
/menu - Meniul principal
/anunturi - Anunțuri recente
/voturi - Voturi active
/sesizare - Trimite o sesizare cu foto
/sesizarile_mele - Sesizările mele
/rezervari - Rezervări spații comune
/evenimente - Calendar evenimente
/documente - Documente arhivate
/vecini - Vecini (cei care au permis afișarea)
/marketplace - Anunțuri vecini (locator)
/urgenta - Numere de urgență
/setari - Preferințe notificări
/help - Ajutor
/contact_admin - Trimite mesaj privat administratorului
/feedback - Trimite feedback echipei vecini.online
```

Disabled features remove their corresponding commands from the active set.

## Onboarding flow (`/start`)

### First-time user (no link yet)

```
[Bot] Bună! Sunt asistentul digital al asociației tale de proprietari.

Pentru a te lega de apartamentul tău, am nevoie de codul de invitație
primit de la administrator (un cod de 8 caractere, format de ex. AB12CD34).

Trimite-mi codul, sau apasă butonul de mai jos dacă nu ai un cod.

[ Nu am cod de invitație ]
```

### With code: `/start ABC12DE3`

The bot validates the code:
- If valid and unconsumed → confirmation step → consume code → link user → welcome message with feature menu
- If consumed → "Acest cod a fost deja folosit. Dacă tu l-ai folosit anterior pe un alt telefon, contactează administratorul."
- If expired → "Codul a expirat. Cere unul nou administratorului."
- If invalid → "Codul nu este recunoscut. Verifică că este scris corect."

### Already linked

If `telegram_users.user_id` already linked:
```
[Bot] Salut, [nume]! Ce vrei să faci?

[ 📢 Anunțuri ]  [ 🗳 Voturi ]
[ ⚠ Sesizare ]   [ 📅 Rezervări ]
[ ⋯ Mai mult ]
```

## Notification rendering

Notifications sent via the `notify()` abstraction render in Telegram with consistent formatting:

```
🔵 ANUNȚ NOU - Important

Lucrări la apă caldă - 25 noiembrie

Se va întrerupe apa caldă mâine între 09:00 - 14:00
pentru lucrări la centrala termică.

Vă mulțumim pentru înțelegere!

— Comitetul, Bloc 12 Scara A
```

With inline keyboard:
```
[ ✅ Am citit ]  [ 📖 Detalii complete ]
```

Priority maps to emoji:
- `urgent` → 🚨 with `disable_notification: false`
- `normal` → 🔵
- `low` → ⚪

## Feature-specific flows

### F09 — Vot pe propunere

The bot pushes a poll notification with inline keyboard:
```
🗳 Vot nou: Schimbare interfon

Comitetul propune înlocuirea interfonului audio cu unul video.
Cost estimat: 12.500 lei (din fond de reparații).

Termen de vot: 28 noiembrie, 23:59

[ ✅ Pentru ]   [ ❌ Contra ]   [ ⚪ Abținere ]
[ 📄 Vezi detalii ]
```

When the user taps an option:
- Confirmation step ("Confirmi vot 'Pentru'?")
- On confirm: vote registered, optimistic UI update, send back: "Vot înregistrat. Mulțumim! Rezultatele finale se anunță după închiderea voturilor."

### F17 — Sesizare cu foto

Multi-step conversation handled via FSM (state stored in `telegram_users.session_state` JSON):

1. User taps "⚠ Sesizare" or sends `/sesizare`
2. Bot: "Descrie pe scurt problema (max 200 caractere)."
3. User sends text → stored in session
4. Bot: "În ce categorie se încadrează?" + inline keyboard with categories
5. User taps → stored
6. Bot: "Trimite o fotografie (sau scrie 'fără' dacă nu poți)."
7. User sends photo(s) → uploaded to Supabase Storage, file_id stored
8. Bot: "Unde anume? (Scara, etaj)" + keyboard with options
9. User taps → stored
10. Bot: Summary + "[ ✅ Trimite ]  [ ❌ Anulează ]"
11. On confirm: ticket created, status notifications enabled

### F25-F27 — Rezervare

1. User taps "📅 Rezervări"
2. Bot shows available resources: "Pe ce vrei să rezervi?"
3. User picks (e.g., Spălătorie)
4. Bot shows next available slots for next 7 days
5. User picks a slot → confirm → booking created → reminder scheduled

### F03 — Urgență

Special priority bypass. Sent with `disable_notification: false` and Telegram's silent flag off. Includes acknowledgement button.

## Mini App integration

For features that need richer UI than inline keyboards can offer (project tracker, document archive, marketplace, calendar):

1. Bot sends a message with `web_app` button:
   ```
   📂 Documente arhivate
   
   Apasă mai jos pentru a deschide arhiva completă cu căutare.
   
   [ 🔓 Deschide arhiva ]  ← web_app button
   ```
2. Telegram opens the Mini App URL with `initData` query
3. Mini App route receives `initData`, sends to `/.netlify/functions/auth-telegram-miniapp` for validation
4. Function returns a short-lived Supabase JWT
5. Mini App loads with the JWT, identifying the user automatically (no separate login)
6. User interacts in the Mini App
7. On submit, optionally close the Mini App via `Telegram.WebApp.close()`

## Webhook implementation

Located at `/netlify/functions/telegram-webhook.ts`. Pseudocode:

```typescript
export default async (req) => {
  // 1. Verify the X-Telegram-Bot-Api-Secret-Token header
  if (req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const update = await req.json();
  
  // 2. Route by update type
  if (update.message) await handleMessage(update.message);
  else if (update.callback_query) await handleCallback(update.callback_query);
  else if (update.my_chat_member) await handleChatMember(update.my_chat_member);
  
  // 3. Always return 200 quickly (Telegram retries on non-200)
  return new Response('OK', { status: 200 });
};
```

For long-running operations (e.g., uploading multiple photos), respond to Telegram immediately with `200 OK` and complete the work asynchronously via a background task or queue.

## Outbound messaging

Sending is done via `sendMessage`, `sendPhoto`, `sendMediaGroup`, `editMessageText`, etc. We wrap them in a `telegram.ts` client:

```typescript
const tg = {
  sendMessage: (chatId, text, opts) => fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, { ... }),
  sendPhoto: ...,
  editMessageReplyMarkup: ...,
  answerCallbackQuery: ...,
};
```

Rate limits: 30 messages/sec globally, 20 messages/minute per chat. Use a token bucket. For bulk notifications (e.g., anunț to 200 residents), space sends to ~25/sec and resume on `Retry-After` from 429.

## Session state

Conversational flows (like sesizare creation) require state across messages. Stored in `telegram_users.session_state jsonb`:

```json
{
  "flow": "ticket_create",
  "step": 3,
  "data": {
    "title": "Bec ars pe scara A",
    "category": "iluminat",
    "photo_paths": ["tickets/abc.jpg"]
  },
  "expires_at": "2026-05-21T15:30:00Z"
}
```

State auto-expires after 30 minutes. `/cancel` clears it.

## Error handling

If a callback handler fails:
1. Always call `answerCallbackQuery` first (to clear the loading state)
2. Send a message: "A apărut o eroare. Încearcă din nou sau scrie /help."
3. Log the error to Sentry with full context

## Group bot support (optional)

Some asociații might want the bot in a group chat. The bot can be added as admin. In groups:
- Only `/comenzi` responds normally
- It posts announcements to the group if F01.config.broadcast_to_group is true
- Polls can be posted as native Telegram polls (limited to yes/no)
- Sensitive things (votes, complaints) are always DM-only

## Privacy

- No phone numbers stored from Telegram (they're not provided by default)
- Username and first/last name are stored but optional
- Users can `/uita` to unlink and forget all their Telegram data (their apartment binding is removed but apartament data remains)
- All conversations between bot and user are private (DM); the bot does not relay private messages between users

## Internationalization

The bot uses i18next with the same Romanian translations as the web app. The user's `language_code` from Telegram is stored, and if it's a supported language (currently `ro`, `en`), bot replies use it. Default to `ro`.

## Testing

Unit-test individual handlers with mocked Telegram updates. For E2E, use the official Telegram Bot API test environment (test mode). See `TESTING.md § Bot tests`.
