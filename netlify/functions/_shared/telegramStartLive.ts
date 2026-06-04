// DB-backed resolver for the Telegram /start CODE linking flow (T58).
//
// Called by the Netlify webhook adapter when Supabase is configured. Uses the
// service-role client (bypasses RLS) to look up per-user link codes and invite
// codes, then persists the result into telegram_users. The pure offline logic
// lives in src/features/telegram/telegramLinkLogic.ts.
//
// Precedence:
//   1. Already linked (telegram_user_id exists with user_id IS NOT NULL) -> 'already-linked'
//   2. Per-user link code match   -> consume + upsert telegram_users      -> 'linked'
//   3. Invite code match          -> store pending link                    -> 'linked'
//   4. No match                                                            -> 'unknown'

import { supabaseAdmin } from './supabaseAdmin';
import type { TelegramStartStatus } from '../../../src/shared/lib/telegramStart';

export interface BotUser {
  id: number;
  first_name?: string;
  username?: string;
}

export async function resolveAndPersistStartCode(
  normalizedCode: string,
  user: BotUser,
): Promise<TelegramStartStatus> {
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from('telegram_users')
    .select('id')
    .eq('telegram_user_id', user.id)
    .not('user_id', 'is', null)
    .maybeSingle();
  if (existing) return 'already-linked';

  const { data: lc } = await db
    .from('telegram_link_codes')
    .select('id, user_id, expires_at, consumed_at')
    .eq('code', normalizedCode)
    .maybeSingle();

  if (lc) {
    if (lc.consumed_at !== null) return 'used';
    if (lc.expires_at !== null && new Date(lc.expires_at) <= new Date()) return 'expired';

    // Atomic consume: guard on consumed_at IS NULL to prevent double-spend.
    const { count } = await db
      .from('telegram_link_codes')
      .update(
        { consumed_at: new Date().toISOString(), consumed_by_telegram_id: user.id },
        { count: 'exact' },
      )
      .eq('id', lc.id)
      .is('consumed_at', null);

    if (!count) return 'used';

    await db.from('telegram_users').upsert(
      {
        telegram_user_id: user.id,
        user_id: lc.user_id,
        telegram_username: user.username ?? null,
        telegram_first_name: user.first_name ?? null,
        linked_at: new Date().toISOString(),
      },
      { onConflict: 'telegram_user_id' },
    );
    return 'linked';
  }

  const { data: inv } = await db
    .from('invite_codes')
    .select('id, asociatie_id, apartment_id, role, expires_at, consumed_at, revoked_at, single_use')
    .eq('code', normalizedCode)
    .maybeSingle();

  if (inv) {
    if (inv.revoked_at !== null) return 'revoked';
    if (inv.consumed_at !== null && inv.single_use) return 'used';
    if (inv.expires_at !== null && new Date(inv.expires_at) <= new Date()) return 'expired';

    // Store a pending Telegram link. user_id is set later when the resident
    // opens the app and completes onboarding via the existing invite-code RPC.
    await db.from('telegram_users').upsert(
      {
        telegram_user_id: user.id,
        user_id: null,
        telegram_username: user.username ?? null,
        telegram_first_name: user.first_name ?? null,
        linked_at: new Date().toISOString(),
        session_state: {
          pending_invite_id: inv.id,
          asociatie_id: inv.asociatie_id,
          role: inv.role,
          apartment_id: inv.apartment_id ?? null,
        },
      },
      { onConflict: 'telegram_user_id' },
    );
    return 'linked';
  }

  return 'unknown';
}
