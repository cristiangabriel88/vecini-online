import QRCode from 'qrcode';

/**
 * Generate a PNG data URL for `value` using the `qrcode` library (T90).
 * Returns a `data:image/png;base64,...` string suitable for `<img src>`.
 *
 * Runs in the browser via the Canvas API (same library used server-side for
 * email QR codes in T153). Fully offline in demo mode.
 *
 * @param value - The URL or text to encode.
 * @param size  - Side length in pixels (default 200).
 */
export async function generateQrDataUrl(value: string, size = 200): Promise<string> {
  return QRCode.toDataURL(value, {
    width: size,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  });
}

/**
 * Derive a safe filename for a QR PNG download.
 * Lowercases the label, replaces non-alphanumeric characters with hyphens,
 * and collapses consecutive hyphens so the filename is always filesystem-safe.
 *
 * Examples:
 *   'Invite ABC' -> 'qr-invite-abc.png'
 *   'abc123'     -> 'qr-abc123.png'
 *   ''           -> 'qr-code.png'
 */
export function qrDownloadFilename(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `qr-${slug || 'code'}.png`;
}
