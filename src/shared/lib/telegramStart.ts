import { isValidInviteCodeFormat, normalizeInviteCode } from './inviteCode';

/**
 * Telegram `/start [payload]` parsing and the bot's Romanian onboarding replies.
 *
 * This module is intentionally dependency-free (it imports only the pure
 * `inviteCode` helper, no app/Zustand/React code) so the Netlify webhook
 * function can import it directly under the esbuild bundler. The actual code
 * resolution against the invite-code lifecycle and the per-user link codes lives
 * in `@/features/telegram/telegramLinkLogic` (app + tests); the live wire-up of
 * that resolution into the deployed webhook is T58.
 */

/** Outcome of a `/start CODE` linking attempt, used to pick the bot reply. */
export type TelegramStartStatus =
  | 'no-code'
  | 'unknown'
  | 'expired'
  | 'used'
  | 'revoked'
  | 'already-linked'
  | 'linked';

export interface StartCommand {
  /** The raw deep-link payload after `/start`, or null when none was sent. */
  payload: string | null;
}

/**
 * Parse a Telegram `/start [payload]` command, tolerating a `@botusername`
 * suffix and surrounding whitespace. Returns null when `text` is not a `/start`
 * command so the caller can fall through to other command handling.
 */
export function parseStartCommand(text: string): StartCommand | null {
  const trimmed = (text ?? '').trim();
  if (trimmed.length === 0) return null;
  const [head, ...rest] = trimmed.split(/\s+/);
  const command = head.toLowerCase().split('@')[0];
  if (command !== '/start') return null;
  const payload = rest.join(' ').trim();
  return { payload: payload.length > 0 ? payload : null };
}

/**
 * Normalise a deep-link payload to the canonical invite/link code form and
 * report whether it is even shaped like a code, so the webhook can reject
 * obvious junk before (live) hitting the database. The two code spaces (invite
 * codes and per-user link codes) share the same 8-character alphabet.
 */
export function normalizeStartPayload(payload: string): string {
  return normalizeInviteCode(payload);
}

/** True when the payload has the shape of a valid 8-character code. */
export function payloadLooksLikeCode(payload: string): boolean {
  return isValidInviteCodeFormat(payload);
}

const WELCOME_NO_CODE =
  'Bună! Sunt asistentul digital al asociației tale de proprietari.\n\n' +
  'Pentru a te lega de apartamentul tău, am nevoie de codul de invitație ' +
  'primit de la administrator (8 caractere, ex: AB23CD45).\n\n' +
  'Trimite-mi codul.';

/**
 * The Romanian reply for a given linking outcome. The bot speaks Romanian only
 * (it is a backend surface, not a localized UI), matching the rest of the
 * webhook copy.
 */
export function replyForStart(
  status: TelegramStartStatus,
  opts: { name?: string | null } = {},
): string {
  const greet = opts.name ? `, ${opts.name}` : '';
  switch (status) {
    case 'no-code':
      return WELCOME_NO_CODE;
    case 'unknown':
      return 'Codul nu este recunoscut. Verifică că este scris corect.';
    case 'expired':
      return 'Codul a expirat. Cere unul nou administratorului.';
    case 'used':
      return 'Acest cod a fost deja folosit. Dacă tu l-ai folosit anterior pe un alt telefon, contactează administratorul.';
    case 'revoked':
      return 'Acest cod a fost dezactivat de administrator. Cere unul nou.';
    case 'already-linked':
      return `Salut${greet}! Contul tău este deja legat. Scrie /menu pentru opțiuni.`;
    case 'linked':
      return `Gata${greet}! Contul tău este acum legat. Vei primi aici anunțurile și notificările blocului. Scrie /menu pentru opțiuni.`;
  }
}

/**
 * The acknowledgement shown while a syntactically-valid code is being checked.
 * Used by the webhook until live resolution against the database lands (T58).
 */
export function replyChecking(code: string): string {
  return `Verific codul „${code}”…\n\nDacă este valid, te voi lega de apartamentul tău.`;
}
