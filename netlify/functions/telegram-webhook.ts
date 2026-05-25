// Netlify Functions adapter for the Telegram webhook.
//
// All update handling lives in the framework-independent service at
// src/shared/server/telegramWebhook.ts; this adapter only translates the
// Netlify `Request`/`Response` to and from that service, so the same logic runs
// unchanged under the standalone Node service on the Raspberry Pi
// (server/telegram-server.ts).
import { processTelegramWebhook } from '../../src/shared/server/telegramWebhook';

export default async (req: Request): Promise<Response> => {
  const result = await processTelegramWebhook({
    method: req.method,
    secretToken: req.headers.get('x-telegram-bot-api-secret-token'),
    readJson: () => req.json(),
  });
  return new Response(result.body, { status: result.status });
};
