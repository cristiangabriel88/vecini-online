import { isSupabaseConfigured } from './env';

/**
 * Object (binary file) storage capability detection.
 *
 * Most surfaces store only text/metadata and work everywhere, but file-backed
 * features (document attachments, photo galleries) need an object store. That
 * store is not always present:
 *   - Supabase cloud / Netlify: Supabase Storage is available.
 *   - Raspberry Pi self-hosting: Supabase Storage/Studio are excluded because
 *     they fail health checks on the Pi, so object storage is either served by a
 *     local filesystem adapter or disabled entirely.
 *   - Demo / offline mode: no backend at all.
 *
 * Rather than letting an upload fail at runtime, the UI asks this module whether
 * object storage is usable and, when it is not, shows a clear message instead of
 * a broken control. The mode is chosen by the `VITE_STORAGE_MODE` env var.
 */
export type StorageMode = 'supabase' | 'local' | 'none';

export type StorageReason =
  | 'supabase' // Supabase Storage is configured and reachable.
  | 'local' // A local filesystem adapter serves objects (Pi self-hosting).
  | 'disabled' // Operator explicitly turned object storage off.
  | 'unconfigured'; // Default Supabase mode but no credentials (demo/offline).

export interface StorageCapability {
  mode: StorageMode;
  /** True when binary objects can actually be uploaded and read. */
  available: boolean;
  reason: StorageReason;
}

/** Normalise an arbitrary env string to a known storage mode (default supabase). */
export function parseStorageMode(raw: string | undefined | null): StorageMode {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'local':
      return 'local';
    case 'none':
    case 'off':
    case 'disabled':
      return 'none';
    case 'supabase':
    case '':
      return 'supabase';
    default:
      return 'supabase';
  }
}

/**
 * Resolve the effective storage capability from the configured mode and whether
 * Supabase is configured. Pure so it can be unit-tested without env/DOM.
 */
export function resolveStorageCapability(
  mode: StorageMode,
  supabaseConfigured: boolean,
): StorageCapability {
  switch (mode) {
    case 'none':
      return { mode, available: false, reason: 'disabled' };
    case 'local':
      return { mode, available: true, reason: 'local' };
    case 'supabase':
      return supabaseConfigured
        ? { mode, available: true, reason: 'supabase' }
        : { mode, available: false, reason: 'unconfigured' };
  }
}

const storageMode = parseStorageMode(import.meta.env.VITE_STORAGE_MODE);

/** The effective object-storage capability for this deployment. */
export const storageCapability: StorageCapability = resolveStorageCapability(
  storageMode,
  isSupabaseConfigured,
);

/** Convenience flag: can the app upload/read binary files right now? */
export const isStorageAvailable = storageCapability.available;
