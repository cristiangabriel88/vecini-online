import { create } from 'zustand';
import { type ErrorReport } from '@/shared/lib/errorReporting';

export type PlatformErrorReport = ErrorReport;

export interface ErrorGroup {
  key: string;
  name: string;
  source: string | undefined;
  message: string;
  count: number;
  firstAt: number;
  lastAt: number;
  refs: string[];
  releases: string[];
  stages: string[];
  /** Scrubbed stack from the most recent occurrence in the group. */
  stack?: string;
  /** Release tag of the most recent occurrence (used for source-map lookup). */
  latestRelease?: string;
}

/** Group a flat list of reports by name+source, sorted most-recent first. */
export function groupReports(reports: PlatformErrorReport[]): ErrorGroup[] {
  const map = new Map<string, ErrorGroup>();
  for (const r of reports) {
    const key = `${r.name}:${r.source ?? ''}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      existing.refs.push(r.ref);
      if (r.at < existing.firstAt) existing.firstAt = r.at;
      if (r.at > existing.lastAt) {
        existing.lastAt = r.at;
        existing.message = r.message;
        existing.stack = r.stack;
        existing.latestRelease = r.release;
      }
      if (r.release && !existing.releases.includes(r.release)) existing.releases.push(r.release);
      if (r.stage && !existing.stages.includes(r.stage)) existing.stages.push(r.stage);
    } else {
      map.set(key, {
        key,
        name: r.name,
        source: r.source,
        message: r.message,
        count: 1,
        firstAt: r.at,
        lastAt: r.at,
        refs: [r.ref],
        releases: r.release ? [r.release] : [],
        stages: r.stage ? [r.stage] : [],
        stack: r.stack,
        latestRelease: r.release,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.lastAt - a.lastAt);
}

// Demo epoch timestamps (2026-06-04 as reference, each offset in ms)
const T0 = 1748995200000; // 2026-06-04T00:00:00Z
const D5 = T0 - 5 * 86400000; // 2026-05-30
const D2 = T0 - 2 * 86400000; // 2026-06-02
const D1 = T0 - 86400000;     // 2026-06-03
const H6 = T0 + 6 * 3600000;  // 2026-06-04 06:00

const DEMO_REPORTS: PlatformErrorReport[] = [
  // Group 1: NetworkError from announcementsApi -- 3 occurrences across two releases
  {
    ref: 'IV-M4P7-Q9RZ',
    name: 'NetworkError',
    message: 'Failed to fetch: NetworkError when attempting to fetch resource.',
    source: 'announcementsApi.loadAnnouncements',
    extra: { status: 0, feature: 'announcements' },
    at: D5 + 3600000,
    release: 'a1b2c3d',
    stage: 'prod',
  },
  {
    ref: 'IV-N5Q8-R0SA',
    name: 'NetworkError',
    message: 'Failed to fetch: NetworkError when attempting to fetch resource.',
    source: 'announcementsApi.loadAnnouncements',
    extra: { status: 0, feature: 'announcements' },
    at: D2 + 7200000,
    release: 'a1b2c3d',
    stage: 'prod',
  },
  {
    ref: 'IV-P6R9-S1TB',
    name: 'NetworkError',
    message: 'Failed to fetch: NetworkError when attempting to fetch resource.',
    source: 'announcementsApi.loadAnnouncements',
    extra: { status: 0, feature: 'announcements' },
    at: H6,
    release: 'b2c3d4e',
    stage: 'prod',
  },
  // Group 2: TypeError from realtimeLogic -- 2 occurrences (with minified stack)
  {
    ref: 'IV-K3F4-L5GH',
    name: 'TypeError',
    message: "Cannot read properties of undefined (reading 'selected_option_ids')",
    source: 'realtimeLogic.applyVoteInsert',
    extra: { feature: 'polls' },
    at: D1 + 10800000,
    release: 'b2c3d4e',
    stage: 'prod',
    stack: [
      "TypeError: Cannot read properties of undefined (reading 'selected_option_ids')",
      '    at ts (https://vecini.online/assets/main-b2c3d4e.js:1:82345)',
      '    at rs (https://vecini.online/assets/main-b2c3d4e.js:1:80123)',
      '    at Object.<anonymous> (https://vecini.online/assets/main-b2c3d4e.js:1:79056)',
      '    at ne (https://vecini.online/assets/react-vendor-5e6f7a.js:1:45678)',
    ].join('\n'),
  },
  {
    ref: 'IV-L4G5-M6HI',
    name: 'TypeError',
    message: "Cannot read properties of undefined (reading 'selected_option_ids')",
    source: 'realtimeLogic.applyVoteInsert',
    extra: { feature: 'polls' },
    at: D1 + 72000000,
    release: 'b2c3d4e',
    stage: 'prod',
    stack: [
      "TypeError: Cannot read properties of undefined (reading 'selected_option_ids')",
      '    at ts (https://vecini.online/assets/main-b2c3d4e.js:1:82345)',
      '    at rs (https://vecini.online/assets/main-b2c3d4e.js:1:80123)',
    ].join('\n'),
  },
  // Group 3: Error from error boundary -- 1 occurrence
  {
    ref: 'IV-A1B2-C3DE',
    name: 'Error',
    message: 'Minified React error #321; visit https://reactjs.org/docs/error-decoder.html',
    source: 'platform-route',
    extra: { route: '/consola/asociatii' },
    at: H6 + 1800000,
    release: 'b2c3d4e',
    stage: 'prod',
  },
  // Group 4: RangeError -- 1 occurrence (oldest, no release tag -- pre-T258a)
  {
    ref: 'IV-R7S8-T9UV',
    name: 'RangeError',
    message: 'Invalid time value',
    source: 'tickets.parseDate',
    extra: { feature: 'tickets' },
    at: D5 - 86400000,
  },
];

interface PlatformErrorState {
  reports: PlatformErrorReport[];
  fetchError: string | null;
  setReports: (reports: PlatformErrorReport[]) => void;
  setFetchError: (err: string | null) => void;
}

export const usePlatformErrorStore = create<PlatformErrorState>()((set) => ({
  reports: DEMO_REPORTS,
  fetchError: null,
  setReports: (reports) => set({ reports, fetchError: null }),
  setFetchError: (fetchError) => set({ fetchError }),
}));
