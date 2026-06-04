// Netlify Functions adapter for the Telegram webhook.
//
// All update handling lives in the framework-independent service at
// src/shared/server/telegramWebhook.ts; this adapter only translates the
// Netlify `Request`/`Response` to and from that service, so the same logic runs
// unchanged under the standalone Node service on the Raspberry Pi
// (server/telegram-server.ts).
//
// When Supabase is configured (T58) the live /start CODE resolver is injected
// so the webhook resolves per-user link codes and invite codes against the
// database and persists the result into telegram_users.
import { processTelegramWebhook } from '../../src/shared/server/telegramWebhook';
import { isSupabaseAdminConfigured } from './_shared/supabaseAdmin';
import { resolveAndPersistStartCode } from './_shared/telegramStartLive';

export default async (req: Request): Promise<Response> => {
  const result = await processTelegramWebhook({
    method: req.method,
    secretToken: req.headers.get('x-telegram-bot-api-secret-token'),
    readJson: () => req.json(),
    resolveStartCode: isSupabaseAdminConfigured()
      ? resolveAndPersistStartCode
      : undefined,
  });
  return new Response(result.body, { status: result.status });
};
