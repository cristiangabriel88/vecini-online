// Standalone Node Telegram webhook service for the self-hosted (Raspberry Pi)
// deployment.
//
// The Netlify deployment serves the webhook as a function; under Vite preview on
// the Pi there is no function runtime, so this tiny `node:http` server hosts the
// same framework-independent logic (src/shared/server/telegramWebhook.ts) as a
// separate systemd service. No web framework is pulled in: the standard library
// is enough for one webhook route plus a health check, which keeps the Pi
// footprint and dependency surface minimal.
//
// Routes:
//   POST <TELEGRAM_WEBHOOK_PATH>  (default /telegram/webhook) - Telegram updates
//   GET  /health                                              - liveness probe
//
// Build: bundled to dist-server/telegram-server.mjs by scripts/build-server.mjs
// (npm run pi:build); run with `node dist-server/telegram-server.mjs`
// (npm run pi:start).
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { processTelegramWebhook } from '../src/shared/server/telegramWebhook';

const PORT = Number(process.env.TELEGRAM_WEBHOOK_PORT ?? process.env.PORT ?? 8787);
const HOST = process.env.TELEGRAM_WEBHOOK_HOST ?? '127.0.0.1';
const WEBHOOK_PATH = process.env.TELEGRAM_WEBHOOK_PATH ?? '/telegram/webhook';

/** Read the full request body as a UTF-8 string, capped to guard against abuse. */
function readBody(req: IncomingMessage, limitBytes = 1_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: string, contentType = 'text/plain'): void {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  void (async () => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? HOST}`);

    // Liveness probe for systemd / reverse proxy / uptime monitoring.
    if (url.pathname === '/health') {
      if (req.method !== 'GET') {
        send(res, 405, 'Method Not Allowed');
        return;
      }
      send(
        res,
        200,
        JSON.stringify({ status: 'ok', service: 'telegram-webhook', time: new Date().toISOString() }),
        'application/json',
      );
      return;
    }

    if (url.pathname === WEBHOOK_PATH) {
      const result = await processTelegramWebhook({
        method: req.method ?? 'GET',
        secretToken: req.headers['x-telegram-bot-api-secret-token'] as string | undefined,
        readJson: async () => JSON.parse(await readBody(req)),
      });
      send(res, result.status, result.body);
      return;
    }

    send(res, 404, 'Not Found');
  })().catch((err) => {
    console.error('telegram-server error', err);
    if (!res.headersSent) send(res, 500, 'Internal Server Error');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`telegram-webhook service listening on http://${HOST}:${PORT}${WEBHOOK_PATH} (health: /health)`);
});
