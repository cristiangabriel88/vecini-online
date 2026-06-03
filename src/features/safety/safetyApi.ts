import type { SafetyProfile, TrustedContact } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useSafetyStore } from './safetyStore';

// ── AES-GCM client-side encryption ───────────────────────────────────────────
// Key is derived from the user's UID via PBKDF2 so the plaintext never reaches
// the server. The ciphertext in safety_codes.encrypted_payload is therefore
// unreadable without knowing both the UID and the app-level salt.

const ENC = new TextEncoder();
const DEC = new TextDecoder();
const SALT = ENC.encode('vecini-safety-v1');

async function deriveKey(userId: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey('raw', ENC.encode(userId), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: 100_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptPayload(data: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, ENC.encode(data));
  const buf = new Uint8Array(12 + cipher.byteLength);
  buf.set(iv);
  buf.set(new Uint8Array(cipher), 12);
  return btoa(String.fromCharCode(...buf));
}

async function decryptPayload(payload: string, userId: string): Promise<string | null> {
  try {
    const buf = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
    const iv = buf.slice(0, 12);
    const cipher = buf.slice(12);
    const key = await deriveKey(userId);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return DEC.decode(plain);
  } catch {
    return null;
  }
}

// ── Row mapper ────────────────────────────────────────────────────────────────

interface SafetyRow {
  id: string;
  asociatie_id: string;
  owner_user_id: string;
  encrypted_payload: string | null;
  created_at: string;
}

interface ProfilePayload {
  passphrase: string;
  note: string;
  contacts: TrustedContact[];
  updated_at: string;
}

async function rowToProfile(row: SafetyRow, userId: string): Promise<SafetyProfile | null> {
  if (!row.encrypted_payload) return null;
  const json = await decryptPayload(row.encrypted_payload, userId);
  if (!json) return null;
  try {
    const payload = JSON.parse(json) as ProfilePayload;
    return {
      id: row.id,
      asociatie_id: row.asociatie_id,
      user_id: row.owner_user_id,
      passphrase: payload.passphrase ?? '',
      note: payload.note ?? '',
      contacts: payload.contacts ?? [],
      updated_at: payload.updated_at ?? row.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Hydrate the current user's safety profile from the backend. Decrypts the
 * payload client-side. No-op offline or when userId is empty.
 */
export async function hydrateSafetyProfile(userId: string, asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId || !asociatieId) return;
  const store = useSafetyStore.getState();
  try {
    const { data, error } = await supabase
      .from('safety_codes')
      .select('id, asociatie_id, owner_user_id, encrypted_payload, created_at')
      .eq('owner_user_id', userId)
      .eq('asociatie_id', asociatieId)
      .maybeSingle();
    if (error) {
      reportError(error, { source: 'safetyApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    if (!data) {
      store.setFetchError(null);
      return;
    }
    const profile = await rowToProfile(data as SafetyRow, userId);
    if (profile) {
      store.setFetchError(null);
      store.replaceForUser(userId, profile);
    } else {
      store.setFetchError(null);
    }
  } catch (err) {
    reportError(err, { source: 'safetyApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Persist the safety profile: update the local store synchronously, then
 * encrypt and upsert to safety_codes behind isSupabaseConfigured.
 */
export function persistSafetyProfile(userId: string, asociatieId: string, profile: SafetyProfile): void {
  useSafetyStore.getState().setProfile(userId, profile);
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      const payload: ProfilePayload = {
        passphrase: profile.passphrase,
        note: profile.note,
        contacts: profile.contacts,
        updated_at: profile.updated_at,
      };
      const encrypted = await encryptPayload(JSON.stringify(payload), userId);
      await supabase.from('safety_codes').upsert(
        {
          asociatie_id: asociatieId,
          owner_user_id: userId,
          encrypted_payload: encrypted,
        },
        { onConflict: 'owner_user_id,asociatie_id' },
      );
    } catch (err) {
      reportError(err, { source: 'safetyApi.persist' });
    }
  })();
}
