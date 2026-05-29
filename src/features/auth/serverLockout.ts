/**
 * Pure helpers for the server-backed login lockout (T33).
 *
 * The server never sees the plaintext email -- only its SHA-256 hash, derived
 * here in the client before any RPC call. The reconcile helper combines the
 * client-side lock (loginThrottle.ts) with the server-side lock so that
 * clearing either alone cannot bypass the lockout.
 */

function webcrypto(): Crypto {
  return globalThis.crypto;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 hex of the normalised email, used as the server lock key. */
export async function hashEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const data = toArrayBuffer(new TextEncoder().encode(normalized));
  const digest = await webcrypto().subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

/**
 * Returns the effective remaining lock in ms: the larger of the client-side
 * and server-side remaining durations, floored at 0.
 */
export function reconcileLockMs(clientMs: number, serverMs: number): number {
  return Math.max(0, clientMs, serverMs);
}
