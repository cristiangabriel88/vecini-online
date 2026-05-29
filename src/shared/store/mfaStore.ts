import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  buildOtpAuthUri,
  challengeNeeded,
  consumeRecoveryCode,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCodes,
  isValidTotpFormat,
  mfaErrorKey,
  verifyTotp,
  type Aal,
} from '@/features/auth/mfaLogic';
import {
  type MfaChannel,
  generateNumericOtp,
  generateOtpSalt,
  hashOtp,
  verifyOtpHash,
  generateConfirmToken,
  hashConfirmToken,
  otpExpiresAt,
  otpChallengeExpired,
  resendCooldownRemainingMs,
  isDeliveredChannel,
  OTP_TTL_MS,
} from '@/features/auth/otpChannelLogic';
import { verifyRecoveryCodeLive } from '@/features/auth/recoveryVerifyApi';
import {
  type ThrottleState,
  emptyThrottle,
  registerFailure as throttleFail,
  registerSuccess as throttleOk,
  remainingLockMs,
} from '@/features/auth/loginThrottle';

import { useSecurityStore } from './securityStore';

const ISSUER = 'vecini.online';

// Display hint returned to the UI when the server has locked the recovery-code
// path (T81). The server has no time-based unlock, but showing a countdown
// communicates "try again later" without misrepresenting the exact window.
const RECOVERY_SERVER_LOCK_DISPLAY_MS = 15 * 60_000;

interface OpResult {
  error: string | null;
}

/** Result of a login-time MFA challenge, carrying any remaining lockout. */
interface ChallengeResult extends OpResult {
  /** Remaining challenge lockout in ms (>0 once the attempt budget is spent). */
  lockedMs: number;
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

/**
 * A persisted OTP channel registration. The `targetHint` is the privacy-safe
 * masked display (e.g. `an***@gmail.com`, `@a***`) shown to the user when they
 * are prompted to choose a second-factor channel.
 */
export interface OtpChannelInfo {
  targetHint: string;
}

/**
 * An active demo OTP challenge for a delivered-code channel. Stored without the
 * plaintext code or token -- only their salted hashes -- so recovering the
 * plaintext from persisted state is not possible. The challenge is NOT persisted;
 * it resets on reload, forcing the user to request a fresh code each session.
 */
export interface DemoOtpChallenge {
  codeHash: string;
  salt: string;
  expiresAtMs: number;
  confirmTokenHash: string;
  consumed: boolean;
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

  /**
   * Failed-attempt throttle for the login-time challenge step (T31). Persisted
   * so a temporary lockout survives a reload (a localStorage wipe still resets
   * it client-side; the server-backed counterpart is T33). A single per-device
   * channel is enough: only one challenge is ever in flight at a time.
   */
  challengeThrottle: ThrottleState;

  // --- OTP channel state (T140) ---

  /**
   * Demo: enabled delivered-code channels and their privacy-safe target hints.
   * Persisted so enrolled channels survive page reloads. Live path reads from
   * the `mfa_channels` table (T143).
   */
  demoEnabledChannels: Partial<Record<string, OtpChannelInfo>>;

  /**
   * Active OTP challenges, keyed by channel. NOT persisted: a challenge expires
   * with the tab; the user must request a fresh code after a reload.
   */
  demoOtpChallenges: Partial<Record<string, DemoOtpChallenge>>;

  /**
   * Epoch-ms of the last code request per channel (persisted so the 60 s
   * resend cooldown survives a reload).
   */
  demoResendAt: Partial<Record<string, number>>;

  /**
   * Per-channel brute-force throttle state (persisted so a lockout survives a
   * reload, mirroring `challengeThrottle`). Separate from `challengeThrottle`
   * so a TOTP lockout does not spill into the email/Telegram OTP budget and
   * vice versa.
   */
  otpThrottles: Partial<Record<string, ThrottleState>>;

  /**
   * Transient: the demo role a pending login was entered with. Set when the
   * user enters the demo and a second-factor challenge is triggered so that
   * `Confirm2faPage` (the confirm-link landing) can call `enterDemo(role)` if
   * the token is verified there instead of on the login page. Never persisted.
   */
  pendingDemoRole: Role | null;

  // Actions -- TOTP / recovery (unchanged from T02/T31)
  load: () => Promise<void>;
  beginEnroll: (account: string) => Promise<OpResult>;
  confirmEnroll: (code: string) => Promise<OpResult>;
  cancelEnroll: () => Promise<void>;
  disable: () => Promise<OpResult>;
  regenerateRecoveryCodes: () => Promise<OpResult>;
  clearRecoveryCodes: () => void;
  /** Whether the freshly signed-in session must still pass any second-factor challenge. */
  challengeRequired: () => Promise<boolean>;
  /** Verify a login-time challenge with either a TOTP code or a recovery code. */
  verifyChallenge: (code: string) => Promise<ChallengeResult>;
  /** Remaining challenge lockout in ms (0 when a code may be submitted). */
  challengeLockMs: () => number;

  // Actions -- OTP channels (T140)
  /** Load the current channel registration status (demo reads local state; live reads DB). */
  loadChannels: () => Promise<void>;
  /**
   * Enable a delivered-code channel. The `targetHint` is the masked display
   * (e.g. `maskEmail(email)` or `maskTelegram(handle)`) — never the raw address.
   */
  enableChannel: (channel: MfaChannel, targetHint: string) => void;
  /** Disable a delivered-code channel and clear any pending challenge for it. */
  disableChannel: (channel: MfaChannel) => void;
  /**
   * Request a one-time code for the given channel. In demo mode, mints the code
   * and hash in-memory and returns the plaintext `demoCode` + `demoConfirmToken`
   * for the UI to display as a demo affordance (never stored in state).
   *
   * Returns `cooldownMs > 0` when the channel is still in cooldown (no new
   * challenge is minted; the caller should show the countdown). Returns an
   * `error` string when the channel is not enabled or the input is invalid.
   */
  requestOtp: (
    channel: MfaChannel,
    now?: number,
  ) => Promise<{
    error: string | null;
    demoCode?: string;
    demoConfirmToken?: string;
    cooldownMs: number;
  }>;
  /**
   * Verify a one-time code for a delivered channel. Returns the same shape as
   * `verifyChallenge` (error + lockedMs) so callers handle both uniformly.
   */
  verifyOtp: (channel: MfaChannel, code: string, now?: number) => Promise<ChallengeResult>;
  /**
   * Verify a confirm-link token for a delivered channel (the `/confirma-2fa`
   * landing). Returns the same shape as `verifyChallenge`.
   */
  verifyConfirmToken: (
    channel: MfaChannel,
    token: string,
    now?: number,
  ) => Promise<ChallengeResult>;
  /** Remaining resend cooldown in ms for a delivered channel (0 when a request may be sent). */
  otpResendCooldownMs: (channel: MfaChannel, now?: number) => number;
  /**
   * All channels that currently have a second factor active: TOTP when enrolled
   * + any enabled delivered channels. Drives the channel picker at sign-in.
   */
  enabledChannels: () => MfaChannel[];
  /** Set the transient pending demo role for the confirm-link flow. */
  setPendingDemoRole: (role: Role | null) => void;
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

/** Read the per-channel throttle, defaulting to an empty one. */
function getOtpThrottle(
  throttles: Partial<Record<string, ThrottleState>>,
  channel: string,
): ThrottleState {
  return throttles[channel] ?? emptyThrottle();
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
      challengeThrottle: emptyThrottle(),

      // OTP channel initial state
      demoEnabledChannels: {},
      demoOtpChallenges: {},
      demoResendAt: {},
      otpThrottles: {},
      pendingDemoRole: null,

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
          useSecurityStore.getState().log('mfaEnabled');
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
        useSecurityStore.getState().log('mfaEnabled');
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
          useSecurityStore.getState().log('mfaDisabled');
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
        useSecurityStore.getState().log('mfaDisabled');
        return { error: null };
      },

      regenerateRecoveryCodes: async () => {
        if (!get().enrolled) return { error: 'not-enrolled' };
        const codes = generateRecoveryCodes();
        const hashes = await hashRecoveryCodes(codes);
        if (!isSupabaseConfigured) {
          set({ demoRecoveryHashes: hashes, recoveryCodes: codes });
          useSecurityStore.getState().log('recoveryCodesRegenerated');
          return { error: null };
        }
        try {
          await storeLiveRecoveryHashes(hashes);
        } catch {
          /* best-effort */
        }
        set({ recoveryCodes: codes });
        useSecurityStore.getState().log('recoveryCodesRegenerated');
        return { error: null };
      },

      clearRecoveryCodes: () => set({ recoveryCodes: null }),

      challengeRequired: async () => {
        if (!isSupabaseConfigured) {
          // A challenge is required when TOTP is enrolled OR any delivered channel is enabled.
          const hasTotp = get().demoSecret != null;
          const hasChannel = Object.keys(get().demoEnabledChannels).length > 0;
          return hasTotp || hasChannel;
        }
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        return challengeNeeded(
          (data?.currentLevel as Aal) ?? null,
          (data?.nextLevel as Aal) ?? null,
        );
      },

      verifyChallenge: async (code) => {
        const now = Date.now();
        const sec = useSecurityStore.getState();

        // Refuse before evaluating the code while a challenge lockout is in
        // force, so a stolen password plus brute force over the 6-digit space is
        // rate-limited (mirrors the pre-lock guard in authStore.signIn).
        const preLock = remainingLockMs(get().challengeThrottle, now);
        if (preLock > 0) {
          sec.log('mfaChallengeLocked');
          return { error: 'locked', lockedMs: preLock };
        }

        // The actual verification (demo TOTP/recovery, or live TOTP via Supabase).
        const { error } = await (async (): Promise<OpResult> => {
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

          // Live: TOTP steps the native session up to aal2; recovery codes go
          // through the privileged mfa-recovery-verify Netlify function (T29)
          // which consumes the code and upserts a session_elevations row so the
          // Custom Access Token Hook (T141) injects the app_2fa_at claim.
          if (!isValidTotpFormat(input)) {
            const result = await verifyRecoveryCodeLive(input);
            if (!result.ok) return { error: result.error ?? 'invalid-code' };
            // Refresh the session so the new app_2fa_at claim is picked up.
            await supabase.auth.refreshSession();
            return { error: null };
          }
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
        })();

        if (!error) {
          set({ challengeThrottle: throttleOk() });
          return { error: null, lockedMs: 0 };
        }

        // Only a wrong-credential guess counts toward the brute-force budget;
        // config/availability errors (not-enrolled, challenge-failed) do not.
        if (mfaErrorKey(error) === 'invalidCode') {
          const next = throttleFail(get().challengeThrottle, now);
          set({ challengeThrottle: next });
          const lockedMs = remainingLockMs(next, now);
          sec.log(lockedMs > 0 ? 'mfaChallengeLocked' : 'mfaChallengeFailed');
          return { error, lockedMs };
        }
        // Server-locked recovery path (T81): the DB counter is exhausted.
        // Return a non-zero lockedMs so the UI shows the locked state. The
        // challengeThrottle is not updated -- only wrong-credential guesses
        // count locally; other factor types (TOTP) must not be blocked here.
        if (error === 'attempt-limit-exceeded') {
          sec.log('mfaChallengeLocked');
          return { error, lockedMs: RECOVERY_SERVER_LOCK_DISPLAY_MS };
        }
        return { error, lockedMs: 0 };
      },

      challengeLockMs: () => remainingLockMs(get().challengeThrottle, Date.now()),

      // --- OTP channel actions (T140) ---

      loadChannels: async () => {
        // Demo: already in state (persisted). Live (T143): read from mfa_channels.
        // Nothing to do in demo beyond confirming channels are available in state.
        if (isSupabaseConfigured) {
          // Live path wired in T143; no-op here so calling loadChannels() is safe.
        }
      },

      enableChannel: (channel, targetHint) => {
        if (!isDeliveredChannel(channel)) return;
        set((s) => ({
          demoEnabledChannels: {
            ...s.demoEnabledChannels,
            [channel]: { targetHint },
          },
        }));
      },

      disableChannel: (channel) => {
        set((s) => {
          const channels = { ...s.demoEnabledChannels };
          delete channels[channel];
          const challenges = { ...s.demoOtpChallenges };
          delete challenges[channel];
          return { demoEnabledChannels: channels, demoOtpChallenges: challenges };
        });
      },

      requestOtp: async (channel, now = Date.now()) => {
        if (!isDeliveredChannel(channel)) {
          return { error: 'no-channel', cooldownMs: 0 };
        }
        const channelInfo = get().demoEnabledChannels[channel];
        if (!channelInfo) {
          return { error: 'no-channel', cooldownMs: 0 };
        }

        // Enforce the resend cooldown.
        const lastSent = get().demoResendAt[channel] ?? 0;
        const cooldownMs = resendCooldownRemainingMs(lastSent, now);
        if (cooldownMs > 0) {
          return { error: null, cooldownMs };
        }

        // Mint the code and its salted hash — store only the hash.
        const code = generateNumericOtp();
        const salt = generateOtpSalt();
        const codeHash = await hashOtp(code, salt);
        const confirmToken = generateConfirmToken();
        const confirmTokenHash = await hashConfirmToken(confirmToken);
        const expiresAtMs = otpExpiresAt(now, OTP_TTL_MS);

        set((s) => ({
          demoOtpChallenges: {
            ...s.demoOtpChallenges,
            [channel]: { codeHash, salt, expiresAtMs, confirmTokenHash, consumed: false },
          },
          demoResendAt: { ...s.demoResendAt, [channel]: now },
        }));

        // The plaintext code and token are returned for the UI demo affordance
        // and the confirm-link URL. They are never stored in state.
        return { error: null, demoCode: code, demoConfirmToken: confirmToken, cooldownMs: 0 };
      },

      verifyOtp: async (channel, code, now = Date.now()) => {
        const sec = useSecurityStore.getState();
        const throttle = getOtpThrottle(get().otpThrottles, channel);

        const preLock = remainingLockMs(throttle, now);
        if (preLock > 0) {
          sec.log('mfaChallengeLocked');
          return { error: 'channel-locked', lockedMs: preLock };
        }

        const challenge = get().demoOtpChallenges[channel];
        if (!challenge) {
          return { error: 'no-channel', lockedMs: 0 };
        }
        if (challenge.consumed) {
          return { error: 'no-channel', lockedMs: 0 };
        }
        if (otpChallengeExpired(challenge.expiresAtMs, now)) {
          return { error: 'expired-code', lockedMs: 0 };
        }

        const matched = await verifyOtpHash(challenge.codeHash, challenge.salt, code);
        if (matched) {
          // Consume the challenge and clear the throttle.
          set((s) => ({
            demoOtpChallenges: {
              ...s.demoOtpChallenges,
              [channel]: { ...challenge, consumed: true },
            },
            otpThrottles: { ...s.otpThrottles, [channel]: throttleOk() },
          }));
          return { error: null, lockedMs: 0 };
        }

        // Wrong code: increment per-channel throttle.
        const next = throttleFail(throttle, now);
        set((s) => ({ otpThrottles: { ...s.otpThrottles, [channel]: next } }));
        const lockedMs = remainingLockMs(next, now);
        sec.log(lockedMs > 0 ? 'mfaChallengeLocked' : 'mfaChallengeFailed');
        return { error: 'invalid-code', lockedMs };
      },

      verifyConfirmToken: async (channel, token, now = Date.now()) => {
        const challenge = get().demoOtpChallenges[channel];
        if (!challenge) {
          return { error: 'no-channel', lockedMs: 0 };
        }
        if (challenge.consumed) {
          return { error: 'no-channel', lockedMs: 0 };
        }
        if (otpChallengeExpired(challenge.expiresAtMs, now)) {
          return { error: 'expired-code', lockedMs: 0 };
        }

        const tokenHash = await hashConfirmToken(token);
        const matched = tokenHash === challenge.confirmTokenHash;
        if (matched) {
          set((s) => ({
            demoOtpChallenges: {
              ...s.demoOtpChallenges,
              [channel]: { ...challenge, consumed: true },
            },
          }));
          return { error: null, lockedMs: 0 };
        }
        // A wrong confirm token is not the same threat model as a brute-forced
        // code (the token space is 256-bit), so we don't throttle here.
        return { error: 'invalid-code', lockedMs: 0 };
      },

      otpResendCooldownMs: (channel, now = Date.now()) => {
        const lastSent = get().demoResendAt[channel] ?? 0;
        return resendCooldownRemainingMs(lastSent, now);
      },

      enabledChannels: () => {
        const channels: MfaChannel[] = [];
        if (get().demoSecret != null) channels.push('totp');
        const enabled = get().demoEnabledChannels;
        if (enabled['email']) channels.push('email');
        if (enabled['telegram']) channels.push('telegram');
        return channels;
      },

      setPendingDemoRole: (role) => set({ pendingDemoRole: role }),
    }),
    {
      name: 'vecini.mfa',
      // Only the demo enrolment + the challenge lockout + OTP channel registrations
      // survive reloads. Live state is read from Supabase on load(); plaintext
      // recovery codes and drafts are never stored. Persisting the throttle keeps a
      // temporary challenge lockout from being reset by a simple page reload.
      // OTP challenges are NOT persisted -- they expire with the tab so the user
      // must request a fresh code each session (prevents replaying old challenges).
      partialize: (s) => ({
        demoSecret: s.demoSecret,
        demoRecoveryHashes: s.demoRecoveryHashes,
        challengeThrottle: s.challengeThrottle,
        demoEnabledChannels: s.demoEnabledChannels,
        demoResendAt: s.demoResendAt,
        otpThrottles: s.otpThrottles,
      }),
    },
  ),
);
