import type { ConsentRecord } from '@/features/legal/consentLogic';
import { isAllowed } from '@/features/legal/consentLogic';

/**
 * The kinds of message the notification fan-out can send.
 * - `essential`: security, account, urgent building alerts (F03), legally
 *   required notices. Rests on contract / legal obligation / vital or
 *   legitimate interest, NOT on consent, so it always sends.
 * - `community`: routine community updates (new announcements, events, polls).
 *   Optional — gated by the `preferences` consent category.
 * - `marketing`: platform news, tips, promotional content. Gated by the
 *   `marketing` consent category.
 */
export type NotificationKind = 'essential' | 'community' | 'marketing';

/**
 * Whether a notification of the given kind may be delivered to a resident with
 * the given consent record. The fan-out service (email/Telegram/push) MUST call
 * this before queueing any non-essential channel message so granular consent is
 * honored end to end. A missing record means "not decided" — only essential
 * messages go out until the resident chooses.
 */
export function mayNotify(record: ConsentRecord | null, kind: NotificationKind): boolean {
  switch (kind) {
    case 'essential':
      return true;
    case 'community':
      return isAllowed(record, 'preferences');
    case 'marketing':
      return isAllowed(record, 'marketing');
    default:
      return false;
  }
}
