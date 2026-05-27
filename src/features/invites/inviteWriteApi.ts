import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { useInviteStore } from '@/shared/store/inviteStore';
import type { InviteCode } from './inviteLogic';

/**
 * Live-mode invite persistence (T55): write an invite_codes row to Supabase
 * after the invite has been minted locally by inviteStore.issue().
 *
 * The offline/local store remains the primary source of truth; this write is
 * best-effort persistence so the live backend matches what was minted locally.
 * Non-fatal: callers proceed even when this fails (the local invite is still
 * valid for link-based redemption which does not require the DB row to exist
 * before AccountSetupPage loads -- it resolves via resolve_onboarding_token).
 *
 * No-op when Supabase is not configured (demo / CI / local dev without backend).
 *
 * Note on IDs: local invite ids use the 'inv-{uuid}' prefix format for visual
 * distinction in the offline store. The DB primary key is a plain UUID (the
 * prefix is stripped on insert). The invite-email Netlify function receives
 * the local id and must strip the prefix when looking up the row -- documented
 * as a gap in the T55 done note; tracked for T149 when email delivery switches
 * to token-based lookup instead of id.
 *
 * Privacy: no PII is logged; the error field carries a non-PII DB error code.
 */

export interface WriteInviteResult {
  ok: boolean;
  /** A short, non-PII reason when ok is false. */
  error?: string;
}

export async function writeInviteToLive(invite: InviteCode): Promise<WriteInviteResult> {
  if (!isSupabaseConfigured) return { ok: true };

  // Strip the 'inv-' prefix so the row id is a valid UUID.
  const dbId = invite.id.startsWith('inv-') ? invite.id.slice(4) : invite.id;

  // Strip the 'ap-' prefix from local apartment ids so the FK references the
  // correct UUID in the 'apartments' table (mirrors the toDbId helper in
  // apartmentsApi.ts, kept local here to avoid a cross-feature import cycle).
  const rawAptId = invite.apartmentId;
  const dbAptId = rawAptId
    ? (rawAptId.startsWith('ap-') ? rawAptId.slice(3) : rawAptId)
    : null;

  const { error } = await supabase.from('invite_codes').insert({
    id: dbId,
    asociatie_id: invite.asociatieId,
    apartment_id: dbAptId,
    code: invite.code,
    token: invite.token,
    role: invite.role,
    single_use: invite.singleUse,
    expires_at: invite.expiresAt ? new Date(invite.expiresAt).toISOString() : null,
    invitee_name: invite.inviteeName ?? null,
    invitee_email: invite.inviteeEmail ?? null,
    kind: 'resident_invite',
    created_at: new Date(invite.createdAt).toISOString(),
    created_by: invite.createdBy ?? null,
  });

  if (error) return { ok: false, error: error.code ?? 'write-failed' };
  return { ok: true };
}

/**
 * Pull delivery timestamps from invite_codes for the given asociatie and apply
 * them to the local store. Called on mount by InvitesAdminPage so the delivered
 * badge reflects live DB state (T149). No-op when Supabase is not configured.
 */
export async function hydrateInviteDelivery(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { data } = await supabase
    .from('invite_codes')
    .select('id, invite_email_delivered_at')
    .eq('asociatie_id', asociatieId)
    .not('invite_email_delivered_at', 'is', null);

  if (!data) return;

  const store = useInviteStore.getState();
  for (const row of data) {
    if (!row.id || !row.invite_email_delivered_at) continue;
    const storeId = `inv-${row.id}`;
    const at = new Date(row.invite_email_delivered_at as string).getTime();
    if (Number.isFinite(at)) store.markEmailDelivered(storeId, at);
  }
}
