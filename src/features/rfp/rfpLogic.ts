import type { Rfp, RfpQuote } from '@/shared/types/domain';
import { DEMO_ASOCIATIE, DEMO_RFPS } from '@/shared/demo/demoData';

/** An RFP needs a title. */
export function isValidRfp(title: string): boolean {
  return title.trim().length > 0;
}

/** A quote needs a contractor name and a positive amount. */
export function isValidQuote(contractor: string, amount: number): boolean {
  return contractor.trim().length > 0 && Number.isFinite(amount) && amount > 0;
}

/** The cheapest quote, or null when there are none. */
export function cheapestQuote(quotes: RfpQuote[]): RfpQuote | null {
  if (quotes.length === 0) return null;
  return quotes.reduce((min, q) => (q.amount < min.amount ? q : min));
}

/** Quotes sorted cheapest-first. */
export function sortedQuotes(quotes: RfpQuote[]): RfpQuote[] {
  return [...quotes].sort((a, b) => a.amount - b.amount);
}

/** Open RFPs first, then newest-first within each status group. */
export function sortRfps(rfps: Rfp[]): Rfp[] {
  return [...rfps].sort((a, b) => {
    const aOpen = a.status === 'deschis' ? 0 : 1;
    const bOpen = b.status === 'deschis' ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

// ── Per-asociatie RFP catalog ─────────────────────────────────────────────────

/** RFP catalog keyed by asociatie id. */
export type RfpsByAsociatie = Record<string, Rfp[]>;

const EMPTY_RFPS: Rfp[] = [];

export function rfpsForAsociatie(
  map: RfpsByAsociatie,
  asociatieId: string | null,
): Rfp[] {
  if (!asociatieId) return EMPTY_RFPS;
  return map[asociatieId] ?? EMPTY_RFPS;
}

export function seedRfps(): RfpsByAsociatie {
  return { [DEMO_ASOCIATIE.id]: [...DEMO_RFPS] };
}

export function addRfpIn(
  map: RfpsByAsociatie,
  asociatieId: string,
  rfp: Rfp,
): RfpsByAsociatie {
  const current = map[asociatieId] ?? [];
  return { ...map, [asociatieId]: [rfp, ...current] };
}

export function addQuoteIn(
  map: RfpsByAsociatie,
  asociatieId: string,
  rfpId: string,
  quote: RfpQuote,
): RfpsByAsociatie {
  const rfps = map[asociatieId] ?? [];
  return {
    ...map,
    [asociatieId]: rfps.map((r) =>
      r.id === rfpId ? { ...r, quotes: [...r.quotes, quote] } : r,
    ),
  };
}

export function decideRfpIn(
  map: RfpsByAsociatie,
  asociatieId: string,
  rfpId: string,
  quoteId: string,
): RfpsByAsociatie {
  const rfps = map[asociatieId] ?? [];
  return {
    ...map,
    [asociatieId]: rfps.map((r) =>
      r.id === rfpId
        ? {
            ...r,
            status: 'decis' as const,
            quotes: r.quotes.map((q) => ({ ...q, selected: q.id === quoteId })),
          }
        : r,
    ),
  };
}

export function migrateRfpsState(persisted: unknown): RfpsByAsociatie {
  const p = persisted as { byAsociatie?: RfpsByAsociatie } | null;
  const existing = p?.byAsociatie ?? {};
  return { ...existing, [DEMO_ASOCIATIE.id]: [...DEMO_RFPS] };
}
