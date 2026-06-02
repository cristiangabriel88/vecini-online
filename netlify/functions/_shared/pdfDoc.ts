// Minimal PDF 1.7 generator for proces-verbal documents (T37).
//
// Uses Type0/Identity-H composite fonts (regular + bold, both unembedded) with
// a full-range identity ToUnicode CMap. Modern PDF viewers (Chrome, Adobe,
// Edge, Preview) substitute the named font from the system and render all
// Unicode characters -- including Romanian diacritics -- correctly.
//
// Layout: A4 portrait (595x842 pts). Each page has:
//   - Header band: asociatie name (bold, centered), separator line.
//   - Body: the process-verbal text lines at 10pt.
//   - Footer band: page N/M label (right-aligned).
//
// No external dependencies -- the Uint8Array is assembled from ASCII-safe
// strings plus Latin-1 bytes for the binary marker comment.

// Page geometry (all in PostScript points; 1 pt = 1/72 inch)
const PW = 595; // A4 width
const PH = 842; // A4 height
const MX = 56; // horizontal margin
const MY = 50; // vertical margin

// Vertical bands (y measured from bottom of page)
const HEADER_TEXT_Y = PH - MY - 14; // baseline of header text
const SEP_LINE_Y = PH - MY - 32; // separator under header
const BODY_TOP_Y = SEP_LINE_Y - 10; // first body line baseline
const FOOTER_SEP_Y = MY + 28; // separator above footer
const FOOTER_TEXT_Y = MY + 12; // footer text baseline

const BODY_FONT_PT = 10;
const HEADER_FONT_PT = 11;
const FOOTER_FONT_PT = 8;
const LINE_H = 13; // body line height
const WRAP_COLS = 90; // soft wrap threshold (chars)

const LINES_PER_PAGE = Math.floor((BODY_TOP_Y - FOOTER_SEP_Y) / LINE_H);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Encode a string as a PDF hex string for Identity-H text.
 *  Each Unicode code point becomes 4 hex digits (2 bytes big-endian). */
function ihex(text: string): string {
  let h = '';
  for (let i = 0; i < text.length; i++) {
    h += text.charCodeAt(i).toString(16).padStart(4, '0');
  }
  return `<${h}>`;
}

/** Approximate x-coordinate to center text at a given font size.
 *  Uses avg char width = 0.53 * pt (reasonable for Arial). */
function centerX(text: string, pt: number): number {
  const w = text.length * 0.53 * pt;
  return Math.max(MX, Math.round((PW - w) / 2));
}

/** Wrap a single line at word boundaries not exceeding `cols` characters.
 *  Lines that already fit are returned as-is in a one-element array. */
function wrapLine(line: string, cols: number): string[] {
  if (line.length <= cols) return [line];
  const words = line.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') {
      cur = w;
    } else if (cur.length + 1 + w.length <= cols) {
      cur += ' ' + w;
    } else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out.length > 0 ? out : [''];
}

/** Paginate pre-wrapped lines into groups, one group per page. */
function paginate(lines: string[]): string[][] {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + LINES_PER_PAGE));
  }
  return pages.length > 0 ? pages : [[]];
}

/** Build the content stream for one page. */
function buildPageStream(
  lines: string[],
  asociatieName: string,
  pageNum: number,
  totalPages: number,
): string {
  const parts: string[] = [];

  // Separator line under header
  parts.push('q');
  parts.push('0.5 w');
  parts.push('0.5 0.5 0.5 RG');
  parts.push(`${MX} ${SEP_LINE_Y} m`);
  parts.push(`${PW - MX} ${SEP_LINE_Y} l`);
  parts.push('S');
  parts.push('Q');

  // Separator line above footer
  parts.push('q');
  parts.push('0.5 w');
  parts.push('0.5 0.5 0.5 RG');
  parts.push(`${MX} ${FOOTER_SEP_Y} m`);
  parts.push(`${PW - MX} ${FOOTER_SEP_Y} l`);
  parts.push('S');
  parts.push('Q');

  // Header: asociatie name centered, bold
  const hx = centerX(asociatieName, HEADER_FONT_PT);
  parts.push('BT');
  parts.push(`/F2 ${HEADER_FONT_PT} Tf`);
  parts.push(`${hx} ${HEADER_TEXT_Y} Td`);
  parts.push(`${ihex(asociatieName)} Tj`);
  parts.push('ET');

  // Body text
  parts.push('BT');
  parts.push(`/F1 ${BODY_FONT_PT} Tf`);
  if (lines.length > 0) {
    parts.push(`${MX} ${BODY_TOP_Y} Td`);
    parts.push(`${ihex(lines[0])} Tj`);
    for (let i = 1; i < lines.length; i++) {
      parts.push(`0 -${LINE_H} Td`);
      parts.push(`${ihex(lines[i])} Tj`);
    }
  }
  parts.push('ET');

  // Footer: page number right-aligned
  const footerText = `Pagina ${pageNum} din ${totalPages}`;
  const fx = PW - MX - Math.round(footerText.length * 0.5 * FOOTER_FONT_PT);
  parts.push('BT');
  parts.push(`/F1 ${FOOTER_FONT_PT} Tf`);
  parts.push(`${Math.max(MX, fx)} ${FOOTER_TEXT_Y} Td`);
  parts.push(`${ihex(footerText)} Tj`);
  parts.push('ET');

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// PDF Object Builder
// ---------------------------------------------------------------------------

/** Simple PDF object registry: assign ids upfront, fill content later. */
class PdfWriter {
  private contents = new Map<number, string>();
  private counter = 1;

  alloc(): number {
    return this.counter++;
  }

  define(id: number, content: string): void {
    this.contents.set(id, content);
  }

  defineStream(id: number, data: string): void {
    // Strip trailing newlines so declared length is exact
    const body = data.replace(/\n+$/, '');
    this.define(id, `<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
  }

  /** Serialize all objects and write the cross-reference table + trailer. */
  build(rootId: number): Uint8Array {
    const maxId = this.counter - 1;
    let doc = '%PDF-1.7\n';
    // 4 bytes >= 128 signals a binary file to PDF readers
    doc += '%\x80\x81\x82\x83\n';

    const offsets = new Map<number, number>();
    for (let id = 1; id <= maxId; id++) {
      const body = this.contents.get(id);
      if (body === undefined) continue;
      offsets.set(id, doc.length);
      doc += `${id} 0 obj\n${body}\nendobj\n`;
    }

    const xrefStart = doc.length;
    doc += 'xref\n';
    doc += `0 ${maxId + 1}\n`;
    doc += '0000000000 65535 f \n';
    for (let id = 1; id <= maxId; id++) {
      const off = offsets.get(id);
      if (off !== undefined) {
        doc += `${off.toString().padStart(10, '0')} 00000 n \n`;
      } else {
        doc += '0000000000 65535 f \n';
      }
    }

    doc += 'trailer\n';
    doc += `<< /Size ${maxId + 1} /Root ${rootId} 0 R >>\n`;
    doc += 'startxref\n';
    doc += `${xrefStart}\n`;
    doc += '%%EOF\n';

    // Encode as Latin-1 bytes (all chars in range 0x00..0xFF)
    return Uint8Array.from([...doc].map((c) => c.charCodeAt(0)));
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate an A4 PDF containing the proces-verbal text with an asociatie name
 *  header and Legea 196/2018 page footer.
 *
 *  @param pvText   Output of `generateProcesVerbal` (multi-line string).
 *  @param asociatieName  Displayed in the header band on every page.
 *  @returns  PDF as a Uint8Array suitable for a `Content-Type: application/pdf`
 *            HTTP response.
 */
export function buildPvPdf(pvText: string, asociatieName: string): Uint8Array {
  // Wrap raw lines at the column limit
  const allLines: string[] = [];
  for (const raw of pvText.split('\n')) {
    allLines.push(...wrapLine(raw, WRAP_COLS));
  }

  const pages = paginate(allLines);
  const totalPages = pages.length;

  const w = new PdfWriter();

  // Pre-allocate object IDs so we can forward-reference
  const catalogId = w.alloc();
  const pagesId = w.alloc();
  const toUnicodeId = w.alloc();
  const descRegId = w.alloc();
  const fontRegId = w.alloc();
  const descBoldId = w.alloc();
  const fontBoldId = w.alloc();

  // ToUnicode CMap: identity mapping (code == Unicode code point for Identity-H)
  const toUnicode =
    '/CIDInit /ProcSet findresource begin\n' +
    '12 dict begin\n' +
    'begincmap\n' +
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n' +
    '/CMapName /Adobe-Identity-UCS def\n' +
    '/CMapType 2 def\n' +
    '1 begincodespacerange\n' +
    '<0000> <FFFF>\n' +
    'endcodespacerange\n' +
    '1 beginbfrange\n' +
    '<0000> <FFFF> <0000>\n' +
    'endbfrange\n' +
    'endcmap\n' +
    'CMapName currentdict /CMap defineresource pop\n' +
    'end\n' +
    'end';
  w.defineStream(toUnicodeId, toUnicode);

  // Unembedded Arial (regular)
  w.define(
    descRegId,
    '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Arial' +
      ' /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >>' +
      ' /DW 556 >>',
  );
  w.define(
    fontRegId,
    `<< /Type /Font /Subtype /Type0 /BaseFont /Arial /Encoding /Identity-H` +
      ` /DescendantFonts [${descRegId} 0 R] /ToUnicode ${toUnicodeId} 0 R >>`,
  );

  // Unembedded Arial-Bold
  w.define(
    descBoldId,
    '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Arial-Bold' +
      ' /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >>' +
      ' /DW 556 >>',
  );
  w.define(
    fontBoldId,
    `<< /Type /Font /Subtype /Type0 /BaseFont /Arial-Bold /Encoding /Identity-H` +
      ` /DescendantFonts [${descBoldId} 0 R] /ToUnicode ${toUnicodeId} 0 R >>`,
  );

  // Page objects
  const pageIds: number[] = [];
  for (let p = 0; p < totalPages; p++) {
    const pageId = w.alloc();
    const contentId = w.alloc();

    const streamData = buildPageStream(pages[p], asociatieName, p + 1, totalPages);
    w.defineStream(contentId, streamData);

    w.define(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R` +
        ` /MediaBox [0 0 ${PW} ${PH}]` +
        ` /Contents ${contentId} 0 R` +
        ` /Resources << /Font << /F1 ${fontRegId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`,
    );
    pageIds.push(pageId);
  }

  // Pages tree
  w.define(
    pagesId,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>`,
  );

  // Document catalog
  w.define(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  return w.build(catalogId);
}
