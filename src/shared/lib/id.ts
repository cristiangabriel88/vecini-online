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
  // Fallback: timestamp fills groups 1-2, two random values fill groups 3-5.
  const t = Date.now().toString(16).padStart(12, '0');
  const r = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0');
  const r2 = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0');
  const v = (8 | (Math.random() * 4 | 0)).toString(16); // variant: 8, 9, a, or b
  return `${t.slice(0, 8)}-${t.slice(8)}-4${r.slice(0, 3)}-${v}${r.slice(3, 6)}-${r2}`;
}
