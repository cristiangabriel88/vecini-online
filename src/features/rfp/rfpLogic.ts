import type { Rfp, RfpQuote } from '@/shared/types/domain';

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
