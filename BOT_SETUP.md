# BOT_SETUP.md — Telegram Bot Setup

This guide walks you through creating the Telegram bot for your vecini.online deployment. It takes about 10 minutes.

## What you'll need

- A Telegram account (any phone with Telegram)
- Your Netlify deployment URL (e.g., `https://vecini.online`)
- A text file to save your credentials

## Step 1 — Create the bot with BotFather

1. Open Telegram and search for `@BotFather` (it has a blue verified checkmark).
2. Open the chat and tap **Start**.
3. Send `/newbot`.
4. BotFather asks for a **name**. This is what users see. Recommend something like:
   > `Asociația Mea — Asistent Digital`
5. BotFather asks for a **username**. It must end in `bot`. Recommend something descriptive:
   > `vecini_asociatiamea_bot`
6. BotFather replies with your bot's API token. It looks like:
   > `7123456789:AAGxxxxxxxxxxxxxxxxxxxxxxxxxx`
   
   **Save this token now.** Treat it like a password.

## Step 2 — Configure bot description

Still in BotFather:

7. Send `/setdescription`, pick your bot, paste:
   > `Sunt asistentul digital al asociației tale de proprietari. Te ajut cu anunțuri, voturi, sesizări, rezervări și multe altele. Pentru a începe, trimite /start urmat de codul de invitație primit de la administrator.`

8. Send `/setabouttext`, pick your bot, paste:
   > `vecini.online — gestionează viața blocului tău mai ușor.`

9. (Optional) Send `/setuserpic` and upload a building emoji icon or your asociație logo.

## Step 3 — Set the command menu

10. Send `/setcommands`, pick your bot, then paste the following block exactly:

```
start - Pornește botul sau leagă apartamentul
menu - Meniul principal
anunturi - Anunțuri recente
voturi - Voturi active
sesizare - Trimite o sesizare cu foto
sesizarile_mele - Sesizările mele
rezervari - Rezervări spații comune
evenimente - Calendar evenimente
documente - Documente arhivate
vecini - Vecini (cei care au permis afișarea)
marketplace - Anunțuri vecini
urgenta - Numere de urgență
setari - Preferințe notificări
contact_admin - Mesaj privat administratorului
feedback - Trimite feedback vecini.online
help - Ajutor
```

## Step 4 — Configure the Mini App domain

Some vecini.online features open as Mini Apps inside Telegram (richer interfaces for documents, project tracker, etc.). You need to allow your domain:

11. Send `/setdomain`, pick your bot, then paste your Netlify URL **without** trailing slash:
    > `https://vecini.online`

   (Replace with your actual URL.)

## Step 5 — Generate a webhook secret

12. Generate a random 32+ character secret. On macOS/Linux:
    ```bash
    openssl rand -hex 32
    ```
    On Windows PowerShell:
    ```powershell
    [Convert]::ToHexString((1..32 | ForEach-Object {Get-Random -Maximum 256}))
    ```
    
    **Save this secret.** You'll add it to Netlify's environment variables.

## Step 6 — Add credentials to Netlify

13. Open your Netlify site dashboard → Site settings → Environment variables.
14. Add or update these variables:

    | Variable | Value |
    |---|---|
    | `TELEGRAM_BOT_TOKEN` | The token from Step 1.6 |
    | `TELEGRAM_BOT_USERNAME` | The username from Step 1.5 (without @) |
    | `TELEGRAM_WEBHOOK_SECRET` | The secret from Step 5 |

15. Trigger a redeploy: Deploys → Trigger deploy → Deploy site.

## Step 7 — Register the webhook with Telegram

After the redeploy completes:

16. Run this command, replacing the placeholders with your actual values:

    ```bash
    curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
      -H "Content-Type: application/json" \
      -d '{
        "url": "https://<your-netlify-domain>/.netlify/functions/telegram-webhook",
        "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
        "drop_pending_updates": true,
        "allowed_updates": ["message", "callback_query", "my_chat_member"]
      }'
    ```

    You should get back: `{"ok":true,"result":true,"description":"Webhook was set"}`.

17. Verify it's working:

    ```bash
    curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
    ```

    The response should show your URL and `"last_error_date":0` (or no error field at all).

## Step 8 — Test it

18. Open your bot in Telegram (use the username from Step 1.5, e.g., `t.me/vecini_asociatiamea_bot`).
19. Tap **Start**.
20. You should see the bot's welcome message asking for an invite code.

If you see this, the bot is connected. 🎉

If nothing happens:
- Check `getWebhookInfo` (Step 17) for error messages
- Check Netlify Function logs (Site → Functions → telegram-webhook → Recent invocations)
- Confirm all 3 environment variables are set correctly and the site was redeployed after

## Step 9 — Create your first invite code

21. In the vecini.online web app, log in as admin.
22. Go to **Apartamente** → pick an apartament → click **Generează cod de invitație**.
23. Copy the 8-character code.
24. In Telegram, send your bot: `/start <THE-CODE>`
25. The bot should confirm: "Apartament legat cu succes! ✅"

You're done. Your bot is live and your first apartment is linked.

---

## Troubleshooting

### "Webhook was deleted" or status shows errors

Re-run the `setWebhook` curl from Step 16. Sometimes Telegram retires webhooks if they consistently return errors.

### Bot replies "Eroare la procesare"

The function ran but something inside failed. Check Netlify Function logs for the stack trace.

### Bot doesn't reply at all

1. Verify `getWebhookInfo` shows your correct Netlify URL
2. Check `pending_update_count` — if > 0, the bot is queuing but failing to process
3. Test the function URL directly: `curl https://<your-netlify-url>/.netlify/functions/telegram-webhook` — should return 401 (unauthorized without the secret)

### "This bot is not allowed to access this resource" when opening Mini App

You forgot Step 4 (`/setdomain`) or used the wrong URL. Re-do it with the exact deployed URL.

### Bot works for the admin but not for other users

Each user needs their own invite code. The first user (you) used the bootstrap code as admin; everyone else needs a code generated from their apartament's page.

## How to reset the bot

If something is badly broken:

1. In BotFather, `/deletebot` (irreversible — only do this if you want to start over)
2. Or, just delete the webhook and re-register:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
   ```
   Then re-run Step 16.

## Optional — Multiple deployments

If you run a staging + production deployment, **use different bots** for each. Don't share the bot between environments — webhook conflicts will cause messages to be lost.
