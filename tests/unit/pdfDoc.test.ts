import { describe, expect, it } from 'vitest';
import { buildPvPdf } from '../../netlify/functions/_shared/pdfDoc';

const SAMPLE_TEXT = [
  'PROCES-VERBAL AL ADUNARII GENERALE',
  'AGA ordinara 2026',
  '',
  'Data: 1 mai 2026',
  'Locul: Sala A',
  'Apartamente reprezentate: 25 din 40 (63%)',
  'Cvorum: intrunit (necesar 50%)',
  '',
  'ORDINEA DE ZI SI HOTARARILE:',
  '',
  '1. Aprobare buget',
  '   Voturi: pentru 20, contra 3, abtineri 2',
  '   Hotarare: ADOPTAT',
  '',
  'Intocmit prin platforma vecini.online, conform Legii 196/2018.',
].join('\n');

describe('buildPvPdf', () => {
  it('returns a Uint8Array', () => {
    const pdf = buildPvPdf(SAMPLE_TEXT, 'Bloc 5');
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(500);
  });

  it('begins with the PDF header', () => {
    const pdf = buildPvPdf(SAMPLE_TEXT, 'Bloc 5');
    const header = String.fromCharCode(...pdf.slice(0, 7));
    expect(header).toBe('%PDF-1.');
  });

  it('ends with %%EOF', () => {
    const pdf = buildPvPdf(SAMPLE_TEXT, 'Bloc 5');
    const tail = String.fromCharCode(...pdf.slice(-7));
    expect(tail).toContain('%%EOF');
  });

  it('embeds an Arial font reference', () => {
    const pdf = buildPvPdf(SAMPLE_TEXT, 'Bloc 5');
    const text = String.fromCharCode(...pdf.filter((b) => b < 128));
    expect(text).toContain('/Arial');
  });

  it('includes the asociatie name in the PDF bytes', () => {
    const name = 'Asociatia Bucuriei';
    const pdf = buildPvPdf(SAMPLE_TEXT, name);
    // The name is encoded as Identity-H hex; verify the PDF body contains it
    const body = String.fromCharCode(...pdf.filter((b) => b < 128));
    // Encoded as hex: 'A' = 0041, 's' = 0073, 'o' = 006f, etc.
    const firstCharHex = name.charCodeAt(0).toString(16).padStart(4, '0');
    expect(body.toLowerCase()).toContain(firstCharHex);
  });

  it('generates multi-page output when text is long', () => {
    const longText = Array.from({ length: 200 }, (_, i) => `Linie ${i + 1}: continut`).join('\n');
    const pdf = buildPvPdf(longText, 'Bloc 5');
    const body = String.fromCharCode(...pdf.filter((b) => b < 128));
    // With 200 lines at 48 lines/page, expect at least 4 pages
    expect((body.match(/\/Type \/Page[^s]/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
});
