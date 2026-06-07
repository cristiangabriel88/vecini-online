// Transactional email client over the Resend HTTP API.
//
// The repo's first shared email infra (T147), reused by the easier-2FA OTP
// functions (T142). It is intentionally dependency-free (a single `fetch`) so
// it bundles cleanly under esbuild alongside the Telegram client.
//
// Privacy: this module never logs the recipient address, subject, or body. A
// failed send returns a non-`ok` result with the provider status only; the
// caller decides what (non-PII) message to surface.

export interface SendEmailParams {
  to: string;
  subject: string;
  /** Plain-text body (multipart fallback). */
  text: string;
  /** HTML body. */
  html: string;
}

export interface SendEmailResult {
  ok: boolean;
  /** Provider/transport HTTP status, or 0 when the request never completed. */
  status: number;
  /** A short, non-PII reason when `ok` is false. */
  reason?: string;
  /** Resend message id returned on a successful send. Stored server-side to
   *  enable precise webhook-to-invite matching on the delivery path (T149). */
  messageId?: string;
  /** Number of send attempts made. 0 when Resend is not configured (no attempt
   *  was made). 1 means the first try succeeded or failed permanently; 2-3
   *  means the request was retried after a transient failure. */
  attempts: number;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export type MailMode = 'resend' | 'log' | 'disabled';

/** Maximum number of send attempts before giving up on transient failures. */
export const MAX_EMAIL_ATTEMPTS = 3;
/** Base delay in ms between retries; doubles on each subsequent attempt. */
export const EMAIL_RETRY_BASE_DELAY_MS = 1000;

/**
 * Reads the MAIL_MODE env var.
 * - `resend`   (default) -- live send via Resend API
 * - `log`      -- write to email_outbox table + console.info; no external call
 * - `disabled` -- silently accept the call; nothing is sent or stored
 */
export function getMailMode(): MailMode {
  const val = process.env.MAIL_MODE;
  if (val === 'log' || val === 'disabled') return val;
  return 'resend';
}

/** True when the Resend env is present so the live send can be attempted. */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function isTransientStatus(status: number): boolean {
  return status === 0 || status >= 500;
}

function retryDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send one transactional email with bounded retry on transient failures.
 * Returns a result rather than throwing so the caller stays in control of
 * the HTTP response and never leaks provider errors.
 *
 * Transient failures (5xx, network errors) are retried up to MAX_EMAIL_ATTEMPTS
 * times with exponential backoff. Permanent failures (4xx) return immediately
 * without retrying. The `attempts` field records how many tries were made so
 * callers can record failures with full context.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, status: 0, reason: 'not-configured', attempts: 0 };
  }

  let lastResult: SendEmailResult = { ok: false, status: 0, reason: 'network-error', attempts: 0 };

  for (let attempt = 1; attempt <= MAX_EMAIL_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: params.to,
          subject: params.subject,
          text: params.text,
          html: params.html,
        }),
      });

      if (!res.ok) {
        lastResult = { ok: false, status: res.status, reason: 'send-failed', attempts: attempt };
        if (!isTransientStatus(res.status)) return lastResult;
        if (attempt < MAX_EMAIL_ATTEMPTS) {
          await retryDelay(EMAIL_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
        }
        continue;
      }

      let messageId: string | undefined;
      try {
        const body = (await res.json()) as { id?: string };
        if (typeof body.id === 'string') messageId = body.id;
      } catch {
        // Non-fatal: delivery webhook falls back gracefully when no id is stored.
      }
      return { ok: true, status: res.status, messageId, attempts: attempt };
    } catch {
      lastResult = { ok: false, status: 0, reason: 'network-error', attempts: attempt };
      if (attempt < MAX_EMAIL_ATTEMPTS) {
        await retryDelay(EMAIL_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  return lastResult;
}
