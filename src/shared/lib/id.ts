/**
 * Browser-safe opaque ID generator.
 *
 * crypto.randomUUID() is only available in secure contexts (HTTPS / localhost).
 * On the Pi dev server over plain HTTP (http://100.92.246.15:4173) it is
 * undefined, causing crashes whenever code calls it at interaction time.
 *
 * This helper uses crypto.randomUUID() when available and falls back to a
 * Date.now() + Math.random() string that is collision-safe enough for local
 * offline IDs (pe-/ap-/etc.) that are replaced by real UUIDs on the server
 * before any write.
 */
export function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: 8 hex chars of timestamp + 12 hex chars of random = 20 chars.
  const t = Date.now().toString(16).padStart(12, '0');
  const r = Math.floor(Math.random() * 0xffffffffffff)
    .toString(16)
    .padStart(12, '0');
  return `${t.slice(0, 8)}-${t.slice(8)}-4${r.slice(0, 3)}-${r.slice(3, 7)}-${r.slice(7)}`;
}
