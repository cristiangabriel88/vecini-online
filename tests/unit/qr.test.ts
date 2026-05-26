import { describe, it, expect } from 'vitest';
import { qrDownloadFilename } from '@/shared/lib/qr';

// NOTE: generateQrDataUrl wraps QRCode.toDataURL() which depends on the Canvas
// API in the browser. jsdom's canvas stub does not support toDataURL(), so we
// test only the pure filename helper here. The generation itself is exercised
// by the running application and by the T153 server-side QR in invite-email.ts.

describe('qrDownloadFilename', () => {
  it('lowercases and replaces non-alphanumeric runs with single hyphens', () => {
    expect(qrDownloadFilename('Invite ABC')).toBe('qr-invite-abc.png');
  });

  it('handles a plain alphanumeric label unchanged (besides prefix/suffix)', () => {
    expect(qrDownloadFilename('abc123')).toBe('qr-abc123.png');
  });

  it('strips leading and trailing hyphens produced by special chars', () => {
    expect(qrDownloadFilename('!abc!')).toBe('qr-abc.png');
  });

  it('collapses consecutive non-alphanumeric runs to a single hyphen', () => {
    expect(qrDownloadFilename('a  --  b')).toBe('qr-a-b.png');
  });

  it('falls back to "qr-code.png" for an empty or whitespace-only label', () => {
    expect(qrDownloadFilename('')).toBe('qr-code.png');
    expect(qrDownloadFilename('   ')).toBe('qr-code.png');
    expect(qrDownloadFilename('---')).toBe('qr-code.png');
  });

  it('handles a token-style hex string (typical invite code)', () => {
    const filename = qrDownloadFilename('abc12345def');
    expect(filename).toBe('qr-abc12345def.png');
    expect(filename).not.toContain(' ');
  });
});
