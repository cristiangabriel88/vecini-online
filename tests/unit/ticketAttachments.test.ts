import { describe, it, expect } from 'vitest';
import {
  validateTicketFile,
  TICKET_ATTACHMENT_MAX_BYTES,
  TICKET_ATTACHMENT_MAX_FILES,
  TICKET_ATTACHMENT_ACCEPT,
  TICKET_ATTACHMENT_TYPES,
} from '@/features/tickets/ticketLogic';

describe('validateTicketFile', () => {
  it('returns null for a valid JPEG under 5 MB', () => {
    expect(validateTicketFile({ size: 1024 * 1024, type: 'image/jpeg' })).toBeNull();
  });

  it('returns null for PNG, WebP, and PDF', () => {
    expect(validateTicketFile({ size: 100, type: 'image/png' })).toBeNull();
    expect(validateTicketFile({ size: 100, type: 'image/webp' })).toBeNull();
    expect(validateTicketFile({ size: 100, type: 'application/pdf' })).toBeNull();
  });

  it('returns too_large for a file exceeding 5 MB', () => {
    expect(validateTicketFile({ size: TICKET_ATTACHMENT_MAX_BYTES + 1, type: 'image/jpeg' })).toBe('too_large');
  });

  it('returns bad_type for unsupported MIME types', () => {
    expect(validateTicketFile({ size: 100, type: 'text/plain' })).toBe('bad_type');
    expect(validateTicketFile({ size: 100, type: 'video/mp4' })).toBe('bad_type');
    expect(validateTicketFile({ size: 100, type: 'image/gif' })).toBe('bad_type');
  });

  it('accepts a file at exactly the size limit', () => {
    expect(validateTicketFile({ size: TICKET_ATTACHMENT_MAX_BYTES, type: 'image/jpeg' })).toBeNull();
  });
});

describe('ticket attachment constants', () => {
  it('TICKET_ATTACHMENT_MAX_BYTES is 5 MB', () => {
    expect(TICKET_ATTACHMENT_MAX_BYTES).toBe(5 * 1024 * 1024);
  });

  it('TICKET_ATTACHMENT_MAX_FILES is 5', () => {
    expect(TICKET_ATTACHMENT_MAX_FILES).toBe(5);
  });

  it('TICKET_ATTACHMENT_ACCEPT includes common image and PDF extensions', () => {
    expect(TICKET_ATTACHMENT_ACCEPT).toContain('.jpg');
    expect(TICKET_ATTACHMENT_ACCEPT).toContain('.png');
    expect(TICKET_ATTACHMENT_ACCEPT).toContain('.pdf');
  });

  it('TICKET_ATTACHMENT_TYPES includes jpeg, png, webp, pdf', () => {
    expect(TICKET_ATTACHMENT_TYPES).toContain('image/jpeg');
    expect(TICKET_ATTACHMENT_TYPES).toContain('image/png');
    expect(TICKET_ATTACHMENT_TYPES).toContain('image/webp');
    expect(TICKET_ATTACHMENT_TYPES).toContain('application/pdf');
  });
});
