import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enqueueOutbox,
  flushOutbox,
  getOutbox,
  removeFromOutbox,
} from '@/shared/lib/errorOutbox';
import { buildReport } from '@/shared/lib/errorReporting';

// ---------------------------------------------------------------------------
// localStorage stub (jsdom provides one, but we want a clean slate each test)
// ---------------------------------------------------------------------------

const OUTBOX_KEY = 'iv_error_outbox';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function makeReport(ref: string, at = 1000) {
  return buildReport(new Error('test'), { source: 'test' }, ref, at);
}

// ---------------------------------------------------------------------------
// enqueueOutbox / getOutbox
// ---------------------------------------------------------------------------

describe('enqueueOutbox', () => {
  it('adds a report to the outbox', () => {
    enqueueOutbox(makeReport('IV-AA00-BB11'));
    expect(getOutbox()).toHaveLength(1);
    expect(getOutbox()[0].ref).toBe('IV-AA00-BB11');
  });

  it('does not add duplicate refs', () => {
    const r = makeReport('IV-AA00-BB11');
    enqueueOutbox(r);
    enqueueOutbox(r);
    expect(getOutbox()).toHaveLength(1);
  });

  it('caps the outbox at 20 items (oldest are dropped)', () => {
    for (let i = 0; i < 25; i++) {
      enqueueOutbox(makeReport(`IV-${String(i).padStart(4, '0')}-0000`));
    }
    expect(getOutbox()).toHaveLength(20);
  });
});

// ---------------------------------------------------------------------------
// removeFromOutbox
// ---------------------------------------------------------------------------

describe('removeFromOutbox', () => {
  it('removes only the matching ref', () => {
    enqueueOutbox(makeReport('IV-AA00-BB11'));
    enqueueOutbox(makeReport('IV-CC22-DD33'));
    removeFromOutbox('IV-AA00-BB11');
    const remaining = getOutbox();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].ref).toBe('IV-CC22-DD33');
  });

  it('is a no-op for an unknown ref', () => {
    enqueueOutbox(makeReport('IV-AA00-BB11'));
    removeFromOutbox('IV-UNKNOWN');
    expect(getOutbox()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// flushOutbox
// ---------------------------------------------------------------------------

describe('flushOutbox', () => {
  it('sends each queued item and removes it on 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    enqueueOutbox(makeReport('IV-AA00-BB11'));
    enqueueOutbox(makeReport('IV-CC22-DD33'));

    await flushOutbox('/.netlify/functions/error-report');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getOutbox()).toHaveLength(0);
  });

  it('leaves items in the outbox on network failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    enqueueOutbox(makeReport('IV-AA00-BB11'));
    await flushOutbox('/.netlify/functions/error-report');

    expect(getOutbox()).toHaveLength(1);
  });

  it('leaves items when the server returns a non-2xx error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);

    enqueueOutbox(makeReport('IV-AA00-BB11'));
    await flushOutbox('/.netlify/functions/error-report');

    expect(getOutbox()).toHaveLength(1);
  });

  it('is a no-op when the outbox is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await flushOutbox('/.netlify/functions/error-report');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// buildReport release/stage tagging
// ---------------------------------------------------------------------------

describe('buildReport release/stage tagging', () => {
  it('includes release and stage when provided', () => {
    const r = buildReport(new Error('boom'), { source: 'test' }, 'IV-TEST', 1000, 'abc1234', 'prod');
    expect(r.release).toBe('abc1234');
    expect(r.stage).toBe('prod');
  });

  it('omits release and stage when not provided', () => {
    const r = buildReport(new Error('boom'), { source: 'test' }, 'IV-TEST', 1000);
    expect(r.release).toBeUndefined();
    expect(r.stage).toBeUndefined();
  });

  it('omits release/stage when empty string is passed', () => {
    const r = buildReport(new Error('boom'), {}, 'IV-TEST', 1000, '', '');
    expect(r.release).toBeUndefined();
    expect(r.stage).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// outbox survives corrupted localStorage
// ---------------------------------------------------------------------------

describe('outbox with corrupted storage', () => {
  it('getOutbox returns empty array when localStorage contains invalid JSON', () => {
    localStorage.setItem(OUTBOX_KEY, '{invalid json}');
    expect(getOutbox()).toEqual([]);
  });

  it('enqueueOutbox recovers from corrupted storage', () => {
    localStorage.setItem(OUTBOX_KEY, 'not-an-array');
    enqueueOutbox(makeReport('IV-AA00-BB11'));
    expect(getOutbox()).toHaveLength(1);
  });
});
