import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import type { Locale } from '@/shared/types/domain';
import { emptyProfile, type CustomField, type ProfileData } from './profileLogic';
import { useProfileStore } from './profileStore';

/* Dual-mode profile repository (F66, T103). The zustand store is the
   synchronous source of truth the page reads; these functions load the
   signed-in user's profile from `users` + `profile_custom_fields` on
   session init and mirror edits back under owner RLS.
   Avatar files are stored in the `avatars` Storage bucket at
   `<userId>/avatar.jpg` (see supabase/migrations/20260121000003_storage.sql).
   Offline-first: every function guards on `isSupabaseConfigured` and falls
   back silently so the demo experience is unchanged. */

const AVATAR_BUCKET = 'avatars';
const AVATAR_SIGNED_URL_EXPIRY = 3600;

function avatarPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

interface UsersRow {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  scara: string | null;
  etaj: string | null;
  car_plate: string | null;
  address: string | null;
  emergency_contact: { name?: string; phone?: string; relationship?: string } | null;
  date_of_birth: string | null;
  locale: string | null;
}

interface CustomFieldRow {
  id: string;
  label: string;
  field_type: string;
  value: string;
  options: string[];
  visibility: string;
  sort_order: number;
}

const VALID_FIELD_TYPES = new Set([
  'text', 'longtext', 'number', 'phone', 'email', 'date', 'bool', 'select', 'link', 'address',
]);

function rowToCustomField(row: CustomFieldRow): CustomField {
  return {
    id: row.id,
    label: row.label,
    type: VALID_FIELD_TYPES.has(row.field_type) ? (row.field_type as CustomField['type']) : 'text',
    value: row.value,
    options: Array.isArray(row.options) ? row.options : [],
    visibility: row.visibility === 'neighbours' ? 'neighbours' : 'private',
    sortOrder: row.sort_order,
  };
}

/**
 * Return a short-lived signed URL for an avatar Storage path, or null on error.
 */
export async function getAvatarSignedUrl(path: string): Promise<string | null> {
  if (!isSupabaseConfigured || !path) return null;
  try {
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, AVATAR_SIGNED_URL_EXPIRY);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Load the signed-in user's profile from `users` + `profile_custom_fields`.
 * On success the live data is merged into the profileStore so the page reflects
 * the real identity. No-op when Supabase is not configured or userId is empty.
 */
export async function hydrateProfile(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;
  const store = useProfileStore.getState();
  try {
    const { data: userRows, error: userErr } = await supabase
      .from('users')
      .select(
        'id, email, full_name, display_name, phone, avatar_url, scara, etaj, car_plate, address, emergency_contact, date_of_birth, locale',
      )
      .eq('id', userId)
      .limit(1);
    if (userErr || !userRows || userRows.length === 0) {
      reportError(userErr ?? new Error('profile row missing'), { source: 'profileApi.hydrate.user' });
      return;
    }
    const row = userRows[0] as UsersRow;

    const { data: fieldRows, error: fieldErr } = await supabase
      .from('profile_custom_fields')
      .select('id, label, field_type, value, options, visibility, sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });
    if (fieldErr) {
      reportError(fieldErr, { source: 'profileApi.hydrate.customFields' });
    }

    const customFields = ((fieldRows ?? []) as CustomFieldRow[]).map(rowToCustomField);

    let avatarDataUrl: string | null = null;
    if (row.avatar_url) {
      avatarDataUrl = await getAvatarSignedUrl(row.avatar_url);
    }

    const ec = row.emergency_contact ?? {};
    const merged: ProfileData = {
      ...emptyProfile(userId, row.email),
      fullName: row.full_name ?? '',
      displayName: row.display_name ?? '',
      phone: row.phone ?? '',
      avatarDataUrl,
      scara: row.scara ?? '',
      etaj: row.etaj ?? '',
      carPlate: row.car_plate ?? '',
      address: row.address ?? '',
      emergencyContact: {
        name: ec.name ?? '',
        phone: ec.phone ?? '',
        relationship: ec.relationship ?? '',
      },
      dateOfBirth: row.date_of_birth ?? '',
      locale: ((row.locale === 'en' ? 'en' : 'ro') as Locale),
      customFields,
    };

    store.save(merged);
  } catch (err) {
    reportError(err, { source: 'profileApi.hydrate' });
  }
}

/**
 * Persist standard profile fields to the `users` row and sync custom fields to
 * `profile_custom_fields` (upsert existing + delete removed rows). Does NOT
 * touch `users.avatar_url` -- that is managed by `uploadProfileAvatar` /
 * `clearProfileAvatar`. No-op when Supabase is not configured.
 */
export async function persistProfile(userId: string, profile: ProfileData): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;
  try {
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        full_name: profile.fullName || null,
        display_name: profile.displayName || null,
        phone: profile.phone || null,
        scara: profile.scara || null,
        etaj: profile.etaj || null,
        car_plate: profile.carPlate || null,
        address: profile.address || null,
        emergency_contact: profile.emergencyContact,
        date_of_birth: profile.dateOfBirth || null,
        locale: profile.locale,
      })
      .eq('id', userId);
    if (updateErr) {
      reportError(updateErr, { source: 'profileApi.persist.user' });
    }

    if (profile.customFields.length > 0) {
      const { error: upsertErr } = await supabase.from('profile_custom_fields').upsert(
        profile.customFields.map((f) => ({
          id: f.id,
          user_id: userId,
          label: f.label,
          field_type: f.type,
          value: f.value,
          options: f.options,
          visibility: f.visibility,
          sort_order: f.sortOrder,
        })),
        { onConflict: 'id' },
      );
      if (upsertErr) {
        reportError(upsertErr, { source: 'profileApi.persist.customFields.upsert' });
      }
    }

    // Remove DB rows whose id is no longer present in the current profile.
    const currentIds = profile.customFields.map((f) => f.id);
    const { data: dbRows } = await supabase
      .from('profile_custom_fields')
      .select('id')
      .eq('user_id', userId);
    if (dbRows) {
      const stale = (dbRows as { id: string }[])
        .map((r) => r.id)
        .filter((id) => !currentIds.includes(id));
      if (stale.length > 0) {
        await supabase.from('profile_custom_fields').delete().in('id', stale);
      }
    }
  } catch (err) {
    reportError(err, { source: 'profileApi.persist' });
  }
}

/**
 * Upload the user's avatar (as a JPEG data URL) to the `avatars` Storage bucket,
 * update `users.avatar_url` with the storage path, and return a short-lived
 * signed URL for immediate display. Returns null on any failure.
 */
export async function uploadProfileAvatar(userId: string, dataUrl: string): Promise<string | null> {
  if (!isSupabaseConfigured || !userId || !dataUrl) return null;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const path = avatarPath(userId);
    const { error: uploadErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (uploadErr) {
      reportError(uploadErr, { source: 'profileApi.uploadAvatar.storage' });
      return null;
    }
    const { error: dbErr } = await supabase
      .from('users')
      .update({ avatar_url: path })
      .eq('id', userId);
    if (dbErr) {
      reportError(dbErr, { source: 'profileApi.uploadAvatar.db' });
    }
    return await getAvatarSignedUrl(path);
  } catch (err) {
    reportError(err, { source: 'profileApi.uploadAvatar' });
    return null;
  }
}

/**
 * Remove the user's avatar from Storage and clear `users.avatar_url`.
 * No-op when Supabase is not configured.
 */
export async function clearProfileAvatar(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;
  try {
    await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath(userId)]);
    await supabase.from('users').update({ avatar_url: null }).eq('id', userId);
  } catch (err) {
    reportError(err, { source: 'profileApi.clearAvatar' });
  }
}
