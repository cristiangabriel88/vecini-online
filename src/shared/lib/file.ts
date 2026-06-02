/**
 * Browser file helpers shared across upload features (documents F33, announcements
 * F01). Kept dependency-free so logic modules can import them without pulling in
 * UI. Offline mode stores files as base64 data URLs; the live path uploads the
 * raw File to Supabase Storage.
 */

/** Read a File as a base64 data URL (browser only). */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

/** Human-readable file size (B / KB / MB). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type FileValidationError = 'too_large' | 'bad_type';

/** Validate a candidate upload against a size cap and an allow-list of MIME
 *  types; returns null when the file is acceptable. */
export function validateFile(
  file: { size: number; type: string },
  maxBytes: number,
  allowedTypes: readonly string[],
): FileValidationError | null {
  if (file.size > maxBytes) return 'too_large';
  if (!allowedTypes.includes(file.type)) return 'bad_type';
  return null;
}
