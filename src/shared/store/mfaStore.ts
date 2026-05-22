import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  buildOtpAuthUri,
  challengeNeeded,
  consumeRecoveryCode,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCodes,
  isValidTotpFormat,
  verifyTotp,
  type Aal,
} from '@/features/auth/mfaLogic';

const ISSUER = 'vecini.online';

interface OpResult {
  error: string | null;
}

/** The data shown while a user is part-way through enrolling a new TOTP factor. */
export interface EnrollmentDraft {
  /** Supabase factor id (live), or null in demo mode. */
  factorId: string | null;
  /** Base32 secret for manual ("enter a setup key") entry. */
  secret: string;
  /** The `otpauth://` URI an authenticator app reads. */
  uri: string;
  /** An SVG QR returned by Supabase (live), or null in demo (manual entry). */
  qrSvg: string | null;
}

interface MfaState {
  /** True once the live/demo enrolment status has been resolved at least once. */
  loaded: boolean;
  /** Whether a verified second factor is active for this account. */
  enrolled: boolean;
  /** In-progress enrolment, or null when not enrolling. */
  draft: EnrollmentDraft | null;
  /**
   * Freshly minted recovery codes, in plaintext, held only long enough for the
   * user to copy them. Never persisted. Cleared once acknowledged.
   */
  recoveryCodes: string[] | null;

  // Demo-only persisted state (no backend to hold it). Never used in the live
  // path, where Supabase is the source of truth.
  demoSecret: string | null;
  demoRecoveryHashes: string[];

  load: () => Promise<void>;
  beginEnroll: (account: string) => Promise<OpResult>;
  confirmEnroll: (code: string) => Promise<OpResult>;
  cancelEnroll: () => Promise<void>;
  disable: () => Promise<OpResult>;
  regenerateRecoveryCodes: () => Promise<OpResult>;
  clearRecoveryCodes: () => void;
  /** Whether the freshly signed-in session must still pass a TOTP challenge. */
  challengeRequired: () => Promise<boolean>;
  /** Verify a login-time challenge with either a TOTP code or a recovery code. */
  verifyChallenge: (code: string) => Promise<OpResult>;
}

/** Resolve the verified TOTP factor id for the signed-in user (live only). */
async function verifiedTotpFactorId(): Promise<string | null> {
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp?.find((f) => f.status === 'verified');
  return factor?.id ?? null;
}

/** Store the user's recovery-code hashes server-side (live, best-effort). */
async function storeLiveRecoveryHashes(hashes: string[]): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  await supabase.from('mfa_recovery_codes').delete().eq('user_id', userId);
  await supabase
    .from('mfa_recovery_codes')
    .insert(hashes.map((code_hash) => ({ user_id: userId, code_hash })));
}

export const useMfaStore = create<MfaState>()(
  persist(
    (set, get) => ({
      loaded: false,
      enrolled: false,
      draft: null,
      recoveryCodes: null,
      demoSecret: null,
      demoRecoveryHashes: [],

      load: async () => {
        if (!isSupabaseConfigured) {
          set({ loaded: true, enrolled: get().demoSecret != null });
          return;
        }
        const { data } = await supabase.auth.mfa.listFactors();
        const enrolled = Boolean(data?.totp?.some((f) => f.status === 'verified'));
        set({ loaded: true, enrolled });
      },

      beginEnroll: async (account) => {
        if (!isSupabaseConfigured) {
          const secret = generateTotpSecret();
          set({
            draft: {
              factorId: null,
              secret,
              uri: buildOtpAuthUri({ secret, account, issuer: ISSUER }),
              qrSvg: null,
            },
          });
          return { error: null };
        }
        // Clear any stale unverified factor so re-enrolling never collides.
        const { data: existing } = await supabase.auth.mfa.listFactors();
        for (const f of existing?.totp ?? []) {
          if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: `vecini-${Date.now()}`,
        });
        if (error || !data) return { error: error?.message ?? 'enroll-failed' };
        set({
          draft: {
            factorId: data.id,
            secret: data.totp.secret,
            uri: data.totp.uri,
            qrSvg: data.totp.qr_code,
          },
        });
        return { error: null };
      },

      confirmEnroll: async (code) => {
        const draft = get().draft;
        if (!draft) return { error: 'no-draft' };
        if (!isValidTotpFormat(code)) return { error: 'invalid-code' };

        if (!isSupabaseConfigured) {
          const ok = await verifyTotp(draft.secret, code);
          if (!ok) return { error: 'invalid-code' };
          const codes = generateRecoveryCodes();
          const hashes = await hashRecoveryCodes(codes);
          set({
            demoSecret: draft.secret,
            demoRecoveryHashes: hashes,
            enrolled: true,
            draft: null,
            recoveryCodes: codes,
          });
          return { error: null };
        }

        if (!draft.factorId) return { error: 'no-draft' };
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
          factorId: draft.factorId,
        });
        if (chErr || !ch) return { error: chErr?.message ?? 'challenge-failed' };
        const { error: vErr } = await supabase.auth.mfa.verify({
          factorId: draft.factorId,
          challengeId: ch.id,
          code: code.trim(),
        });
        if (vErr) return { error: vErr.message };
        const codes = generateRecoveryCodes();
        const hashes = await hashRecoveryCodes(codes);
        try {
          await storeLiveRecoveryHashes(hashes);
        } catch {
          /* recovery storage is best-effort; enrolment itself succeeded */
        }
        set({ enrolled: true, draft: null, recoveryCodes: codes });
        return { error: null };
      },

      cancelEnroll: async () => {
        const draft = get().draft;
        if (isSupabaseConfigured && draft?.factorId) {
          await supabase.auth.mfa.unenroll({ factorId: draft.factorId });
        }
        set({ draft: null });
      },

      disable: async () => {
        if (!isSupabaseConfigured) {
          set({ demoSecret: null, demoRecoveryHashes: [], enrolled: false, recoveryCodes: null });
          return { error: null };
        }
        const factorId = await verifiedTotpFactorId();
        if (factorId) {
          const { error } = await supabase.auth.mfa.unenroll({ factorId });
          if (error) return { error: error.message };
        }
        try {
          const { data } = await supabase.auth.getUser();
          if (data.user?.id) {
            await supabase.from('mfa_recovery_codes').delete().eq('user_id', data.user.id);
          }
        } catch {
          /* non-fatal */
        }
        set({ enrolled: false, recoveryCodes: null });
        return { error: null };
      },

      regenerateRecoveryCodes: async () => {
        if (!get().enrolled) return { error: 'not-enrolled' };
        const codes = generateRecoveryCodes();
        const hashes = await hashRecoveryCodes(codes);
        if (!isSupabaseConfigured) {
          set({ demoRecoveryHashes: hashes, recoveryCodes: codes });
          return { error: null };
        }
        try {
          await storeLiveRecoveryHashes(hashes);
        } catch {
          /* best-effort */
        }
        set({ recoveryCodes: codes });
        return { error: null };
      },

      clearRecoveryCodes: () => set({ recoveryCodes: null }),

      challengeRequired: async () => {
        if (!isSupabaseConfigured) return get().demoSecret != null;
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        return challengeNeeded(
          (data?.currentLevel as Aal) ?? null,
          (data?.nextLevel as Aal) ?? null,
        );
      },

      verifyChallenge: async (code) => {
        const input = code.trim();
        if (!isSupabaseConfigured) {
          const secret = get().demoSecret;
          if (!secret) return { error: 'not-enrolled' };
          if (isValidTotpFormat(input)) {
            const ok = await verifyTotp(secret, input);
            return ok ? { error: null } : { error: 'invalid-code' };
          }
          const { matched, remaining } = await consumeRecoveryCode(
            get().demoRecoveryHashes,
            input,
          );
          if (!matched) return { error: 'invalid-code' };
          set({ demoRecoveryHashes: remaining });
          return { error: null };
        }

        // Live: only an authenticator code can step the session up to aal2.
        // Recovery-code login requires a privileged server routine and is wired
        // separately (see T29); offline/demo recovery is fully functional.
        if (!isValidTotpFormat(input)) return { error: 'recovery-live-unavailable' };
        const factorId = await verifiedTotpFactorId();
        if (!factorId) return { error: 'not-enrolled' };
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
        if (chErr || !ch) return { error: chErr?.message ?? 'challenge-failed' };
        const { error: vErr } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: ch.id,
          code: input,
        });
        return { error: vErr ? vErr.message : null };
      },
    }),
    {
      name: 'intrevecini.mfa',
      // Only the demo enrolment survives reloads. Live state is read from
      // Supabase on load(); plaintext recovery codes and drafts are never stored.
      partialize: (s) => ({
        demoSecret: s.demoSecret,
        demoRecoveryHashes: s.demoRecoveryHashes,
      }),
    },
  ),
);
