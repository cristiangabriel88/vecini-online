/**
 * Client-side photo downscale before upload.
 *
 * Keeps full-resolution files out of Supabase Storage and reduces bandwidth on
 * every device. Non-resizable types (GIF, SVG, PDF, ...) and images that already
 * fit within MAX_EDGE pass through unchanged. Canvas failures also fall back to
 * the original so no upload is ever silently lost.
 */

/** Longest edge (px) allowed before a photo is re-encoded. */
export const PHOTO_MAX_EDGE = 2048;
/** JPEG quality used when re-encoding a downscaled photo. */
export const PHOTO_JPEG_QUALITY = 0.82;

const RESIZABLE = /^image\/(png|jpe?g|webp)$/i;

/** Whether a MIME type is a raster image that benefits from canvas re-encoding. */
export function isResizableImage(mime: string): boolean {
  return RESIZABLE.test(mime);
}

/**
 * Given source dimensions and a maxEdge cap, return the target dimensions that
 * fit within maxEdge x maxEdge while preserving aspect ratio.
 * Returns null when the source already fits (no resize needed).
 */
export function calcResizeDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } | null {
  if (width <= maxEdge && height <= maxEdge) return null;
  const scale = maxEdge / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Downscale a photo File to fit within maxEdge x maxEdge and re-encode as JPEG.
 * Returns the original File unchanged for non-resizable types, already-small
 * images, and any canvas/decode failure (never rejects).
 */
export function downscalePhoto(
  file: File,
  maxEdge = PHOTO_MAX_EDGE,
  quality = PHOTO_JPEG_QUALITY,
): Promise<File> {
  if (!isResizableImage(file.type)) return Promise.resolve(file);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        const dims = calcResizeDimensions(img.naturalWidth, img.naturalHeight, maxEdge);
        if (!dims) {
          resolve(file);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = dims.width;
        canvas.height = dims.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, dims.width, dims.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const stem = file.name.replace(/\.[^.]+$/, '');
            resolve(new File([blob], `${stem}.jpg`, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality,
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
