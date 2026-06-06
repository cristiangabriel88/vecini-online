import { describe, it, expect } from 'vitest';
import {
  parseMinifiedFrame,
  extractFilename,
  formatResolvedFrame,
  extractFrameLines,
  type ResolvedFrame,
} from '@/shared/lib/sourcemapUtils';

describe('parseMinifiedFrame', () => {
  it('parses Chrome "at FuncName (url:line:col)"', () => {
    const result = parseMinifiedFrame(
      '    at ts (https://vecini.online/assets/main-abc123.js:1:82345)',
    );
    expect(result).toEqual({
      funcName: 'ts',
      file: 'https://vecini.online/assets/main-abc123.js',
      line: 1,
      col: 82345,
    });
  });

  it('parses Chrome anonymous "at url:line:col"', () => {
    const result = parseMinifiedFrame(
      '    at https://vecini.online/assets/main-abc123.js:1:80123',
    );
    expect(result).toEqual({
      funcName: undefined,
      file: 'https://vecini.online/assets/main-abc123.js',
      line: 1,
      col: 80123,
    });
  });

  it('strips <anonymous> from funcName', () => {
    const result = parseMinifiedFrame(
      'at <anonymous> (https://vecini.online/assets/main-abc123.js:1:100)',
    );
    expect(result?.funcName).toBeUndefined();
  });

  it('parses Firefox "funcName@url:line:col"', () => {
    const result = parseMinifiedFrame(
      'applyVoteInsert@https://vecini.online/assets/main-abc123.js:1:79056',
    );
    expect(result).toEqual({
      funcName: 'applyVoteInsert',
      file: 'https://vecini.online/assets/main-abc123.js',
      line: 1,
      col: 79056,
    });
  });

  it('parses Firefox anonymous "@url:line:col"', () => {
    const result = parseMinifiedFrame(
      '@https://vecini.online/assets/react-vendor-5e6f7a.js:1:45678',
    );
    expect(result).toEqual({
      funcName: undefined,
      file: 'https://vecini.online/assets/react-vendor-5e6f7a.js',
      line: 1,
      col: 45678,
    });
  });

  it('handles https:// URLs without mangling the host portion', () => {
    const result = parseMinifiedFrame(
      'at ko (https://app.vecini.online/assets/react-vendor-5e6f7a.js:1:15234)',
    );
    expect(result?.file).toBe('https://app.vecini.online/assets/react-vendor-5e6f7a.js');
    expect(result?.line).toBe(1);
    expect(result?.col).toBe(15234);
  });

  it('returns null for error message lines', () => {
    expect(
      parseMinifiedFrame('TypeError: Cannot read properties of undefined'),
    ).toBeNull();
  });

  it('returns null for blank lines', () => {
    expect(parseMinifiedFrame('')).toBeNull();
    expect(parseMinifiedFrame('   ')).toBeNull();
  });

  it('returns null for unrecognized text', () => {
    expect(parseMinifiedFrame('some random text')).toBeNull();
  });
});

describe('extractFilename', () => {
  it('extracts the last path segment', () => {
    expect(extractFilename('/assets/main-abc123.js')).toBe('main-abc123.js');
    expect(
      extractFilename('https://vecini.online/assets/react-vendor-5e6f7a.js'),
    ).toBe('react-vendor-5e6f7a.js');
  });

  it('returns the input unchanged when there is no slash', () => {
    expect(extractFilename('main.js')).toBe('main.js');
  });
});

describe('formatResolvedFrame', () => {
  it('formats source + line + col + name', () => {
    const f: ResolvedFrame = {
      source: 'src/features/polls/realtimeLogic.ts',
      line: 142,
      col: 7,
      name: 'applyVoteInsert',
      raw: '    at ts (https://vecini.online/assets/main-abc123.js:1:82345)',
    };
    expect(formatResolvedFrame(f)).toBe(
      'applyVoteInsert (src/features/polls/realtimeLogic.ts:142:7)',
    );
  });

  it('formats without name', () => {
    const f: ResolvedFrame = {
      source: 'src/features/polls/realtimeLogic.ts',
      line: 142,
      col: 7,
      name: null,
      raw: '',
    };
    expect(formatResolvedFrame(f)).toBe('src/features/polls/realtimeLogic.ts:142:7');
  });

  it('falls back to raw when source is null', () => {
    const f: ResolvedFrame = {
      source: null,
      line: null,
      col: null,
      name: null,
      raw: '    at ts (https://vecini.online/assets/main.js:1:100)',
    };
    expect(formatResolvedFrame(f)).toBe(
      '    at ts (https://vecini.online/assets/main.js:1:100)',
    );
  });
});

describe('extractFrameLines', () => {
  it('drops the error message and blank lines, keeps frame lines', () => {
    const stack = [
      'TypeError: Cannot read properties of undefined',
      '    at ts (https://vecini.online/assets/main-abc123.js:1:82345)',
      '    at rs (https://vecini.online/assets/main-abc123.js:1:80123)',
      '',
    ].join('\n');
    const lines = extractFrameLines(stack);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('at ts (https://vecini.online/assets/main-abc123.js:1:82345)');
  });
});
