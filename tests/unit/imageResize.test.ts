/**
 * T265b - client-side image downscale before upload.
 *
 * Tests cover:
 *  - isResizableImage: which MIME types are eligible for canvas re-encoding
 *  - calcResizeDimensions: the pure aspect-ratio-preserving geometry
 *  - downscalePhoto: contract tests (non-image and GIF pass-through; jsdom
 *    cannot decode real images so the canvas path is tested via the fallback
 *    behaviour -- decode failure returns the original unchanged)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  PHOTO_MAX_EDGE,
  PHOTO_JPEG_QUALITY,
  isResizableImage,
  calcResizeDimensions,
  downscalePhoto,
} from '@/shared/lib/imageResize';

/**
 * jsdom does not decode images, so Image.onload/onerror never fire when img.src
 * is set to a data URL. This helper replaces global.Image with a stub that
 * immediately fires onerror so the fallback path in downscalePhoto can be
 * exercised without a real browser. Callers must call the returned restore fn.
 */
function stubImageDecodeError() {
  const orig = global.Image;
  class ErrorImage {
    onload: (() => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    naturalWidth = 0;
    naturalHeight = 0;
    set src(_: string) {
      queueMicrotask(() => this.onerror?.(new Event('error')));
    }
  }
  vi.stubGlobal('Image', ErrorImage);
  return () => vi.stubGlobal('Image', orig);
}

describe('constants', () => {
  it('PHOTO_MAX_EDGE is a reasonable cap for property-app photos', () => {
    expect(PHOTO_MAX_EDGE).toBeGreaterThanOrEqual(1024);
    expect(PHOTO_MAX_EDGE).toBeLessThanOrEqual(4096);
  });

  it('PHOTO_JPEG_QUALITY is in the 0-1 range', () => {
    expect(PHOTO_JPEG_QUALITY).toBeGreaterThan(0);
    expect(PHOTO_JPEG_QUALITY).toBeLessThanOrEqual(1);
  });
});

describe('isResizableImage', () => {
  it('accepts JPEG', () => {
    expect(isResizableImage('image/jpeg')).toBe(true);
    expect(isResizableImage('image/jpg')).toBe(true);
  });

  it('accepts PNG', () => {
    expect(isResizableImage('image/png')).toBe(true);
  });

  it('accepts WebP', () => {
    expect(isResizableImage('image/webp')).toBe(true);
  });

  it('rejects GIF (animation would be lost on canvas)', () => {
    expect(isResizableImage('image/gif')).toBe(false);
  });

  it('rejects SVG', () => {
    expect(isResizableImage('image/svg+xml')).toBe(false);
  });

  it('rejects PDF and office documents', () => {
    expect(isResizableImage('application/pdf')).toBe(false);
    expect(isResizableImage('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(false);
  });

  it('rejects text and video types', () => {
    expect(isResizableImage('text/plain')).toBe(false);
    expect(isResizableImage('video/mp4')).toBe(false);
  });
});

describe('calcResizeDimensions', () => {
  it('returns null when both dimensions fit within maxEdge', () => {
    expect(calcResizeDimensions(1024, 768, 2048)).toBeNull();
    expect(calcResizeDimensions(2048, 2048, 2048)).toBeNull();
    expect(calcResizeDimensions(1, 1, 2048)).toBeNull();
  });

  it('returns null at the exact boundary', () => {
    expect(calcResizeDimensions(2048, 1000, 2048)).toBeNull();
    expect(calcResizeDimensions(500, 2048, 2048)).toBeNull();
  });

  it('scales a landscape image by its width', () => {
    const dims = calcResizeDimensions(4096, 2048, 2048);
    expect(dims).not.toBeNull();
    expect(dims!.width).toBe(2048);
    expect(dims!.height).toBe(1024);
  });

  it('scales a portrait image by its height', () => {
    const dims = calcResizeDimensions(1920, 3840, 2048);
    expect(dims).not.toBeNull();
    expect(dims!.height).toBe(2048);
    expect(dims!.width).toBe(1024);
  });

  it('scales a square image uniformly', () => {
    const dims = calcResizeDimensions(4000, 4000, 2048);
    expect(dims).not.toBeNull();
    expect(dims!.width).toBe(2048);
    expect(dims!.height).toBe(2048);
  });

  it('preserves a non-power-of-two aspect ratio', () => {
    const dims = calcResizeDimensions(3000, 2000, 2048);
    expect(dims).not.toBeNull();
    expect(dims!.width).toBe(2048);
    expect(dims!.height).toBe(Math.round(2000 * (2048 / 3000)));
  });

  it('always returns width and height >= 1', () => {
    const dims = calcResizeDimensions(10000, 1, 2048);
    expect(dims!.width).toBeGreaterThanOrEqual(1);
    expect(dims!.height).toBeGreaterThanOrEqual(1);
  });

  it('respects a custom maxEdge', () => {
    const dims = calcResizeDimensions(1000, 500, 800);
    expect(dims!.width).toBe(800);
    expect(dims!.height).toBe(400);
  });
});

describe('downscalePhoto', () => {
  it('passes through a non-image file unchanged (same reference)', async () => {
    const pdf = new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' });
    const result = await downscalePhoto(pdf);
    expect(result).toBe(pdf);
  });

  it('passes through a GIF unchanged', async () => {
    const gif = new File(['GIF89a'], 'anim.gif', { type: 'image/gif' });
    const result = await downscalePhoto(gif);
    expect(result).toBe(gif);
  });

  it('passes through an SVG unchanged', async () => {
    const svg = new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' });
    const result = await downscalePhoto(svg);
    expect(result).toBe(svg);
  });

  it('returns a File (not a Blob) for non-resizable types', async () => {
    const pdf = new File(['%PDF'], 'x.pdf', { type: 'application/pdf' });
    const result = await downscalePhoto(pdf);
    expect(result).toBeInstanceOf(File);
  });

  it('falls back to original when image cannot be decoded (Image onerror path)', async () => {
    const restore = stubImageDecodeError();
    try {
      const fakeJpeg = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const result = await downscalePhoto(fakeJpeg);
      expect(result).toBe(fakeJpeg);
    } finally {
      restore();
    }
  });

  it('never rejects -- always resolves to a File (Image onerror path)', async () => {
    const restore = stubImageDecodeError();
    try {
      const fakeWebp = new File([new Uint8Array([0x52, 0x49, 0x46, 0x46])], 'img.webp', {
        type: 'image/webp',
      });
      await expect(downscalePhoto(fakeWebp)).resolves.toBeInstanceOf(File);
    } finally {
      restore();
    }
  });
});
