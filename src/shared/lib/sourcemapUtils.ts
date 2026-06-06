/**
 * Pure helpers for parsing minified JS stack frames (T258b).
 * No runtime dependencies -- safe to import anywhere, including unit tests.
 */

export interface ParsedFrame {
  funcName?: string;
  /** Raw file URL or path as it appears in the stack. */
  file: string;
  line: number;
  col: number;
}

export interface ResolvedFrame {
  /** Original source file path (e.g. "src/features/polls/realtimeLogic.ts"). */
  source: string | null;
  line: number | null;
  col: number | null;
  /** Original function/symbol name, when the source map carries it. */
  name: string | null;
  /** The raw input line (preserved for display alongside the resolved form). */
  raw: string;
}

/**
 * Parse one line of a JS stack trace into its components.
 * Supports Chrome (`at [FuncName] (file:line:col)`) and
 * Firefox/Safari (`[funcName]@file:line:col`) formats.
 * Returns null for non-frame lines (error message, "<anonymous>", etc.).
 */
export function parseMinifiedFrame(line: string): ParsedFrame | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Chrome: "at FuncName (https://…/chunk.js:1:12345)" or "at https://…/chunk.js:1:12345"
  // The file portion may contain colons (https:) so we match the LAST :digits:digits pair
  // as line:col.
  const chromeMatch = /^at\s+(?:(.+?)\s+\((.+):(\d+):(\d+)\)|(.+):(\d+):(\d+))$/.exec(trimmed);
  if (chromeMatch) {
    if (chromeMatch[2]) {
      const funcName = chromeMatch[1]?.trim();
      return {
        funcName: funcName && funcName !== '<anonymous>' ? funcName : undefined,
        file: chromeMatch[2],
        line: parseInt(chromeMatch[3], 10),
        col: parseInt(chromeMatch[4], 10),
      };
    }
    if (chromeMatch[5]) {
      return {
        file: chromeMatch[5],
        line: parseInt(chromeMatch[6], 10),
        col: parseInt(chromeMatch[7], 10),
      };
    }
  }

  // Firefox/Safari: "funcName@https://…/chunk.js:1:12345"
  const firefoxMatch = /^(.*)@(.+):(\d+):(\d+)$/.exec(trimmed);
  if (firefoxMatch && firefoxMatch[2]) {
    const funcName = firefoxMatch[1]?.trim();
    return {
      funcName: funcName || undefined,
      file: firefoxMatch[2],
      line: parseInt(firefoxMatch[3], 10),
      col: parseInt(firefoxMatch[4], 10),
    };
  }

  return null;
}

/**
 * Extract just the filename from a URL or path.
 * "/assets/main-abc123.js" -> "main-abc123.js"
 * "https://app.example.com/assets/vendor-5e6f7a.js" -> "vendor-5e6f7a.js"
 */
export function extractFilename(fileUrl: string): string {
  return fileUrl.split('/').pop() ?? fileUrl;
}

/**
 * Format a resolved original position for display.
 * Returns "funcName (src/foo.ts:42:7)" or "src/foo.ts:42" when name is absent.
 */
export function formatResolvedFrame(f: ResolvedFrame): string {
  if (!f.source) return f.raw;
  const loc = f.line != null ? (f.col != null ? `${f.line}:${f.col}` : String(f.line)) : '';
  const fileLoc = loc ? `${f.source}:${loc}` : f.source;
  return f.name ? `${f.name} (${fileLoc})` : fileLoc;
}

/**
 * Split a stack string into individual lines, dropping the leading error
 * message line(s) and blank lines, keeping only frame lines.
 */
export function extractFrameLines(stack: string): string[] {
  return stack
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('at ') || l.includes('@') && l.match(/:\d+:\d+$/));
}
