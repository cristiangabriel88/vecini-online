import type { Announcement, DiscussionThread, Ticket } from '@/shared/types/domain';

export type SearchKind = 'nav' | 'announcement' | 'discussion' | 'ticket';

export interface NavItem {
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

export interface SearchResult {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  path: string;
}

/** Strip diacritics and lowercase for locale-aware comparison. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Score how well `text` matches `query` on a 0..100 scale.
 * Returns 0 when there is no match.
 */
export function scoreMatch(query: string, text: string): number {
  if (!query || !text) return 0;
  const q = normalize(query.trim());
  const t = normalize(text);
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 50;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const hits = words.filter((w) => t.includes(w)).length;
    if (hits > 0) return Math.round((30 * hits) / words.length);
  }
  return 0;
}

function best(q: string, ...texts: (string | undefined | null)[]): number {
  return Math.max(0, ...texts.map((t) => (t ? scoreMatch(q, t) : 0)));
}

const MAX_PER_KIND = 5;

/**
 * Search across nav items and content stores.
 * Returns results grouped by kind (nav first), each group sorted by score desc.
 * Returns an empty array when `query` is blank.
 */
export function searchResults(
  query: string,
  navItems: NavItem[],
  announcements: Announcement[],
  threads: DiscussionThread[],
  tickets: Ticket[],
): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  type Scored = SearchResult & { score: number };

  const byKind: Record<SearchKind, Scored[]> = {
    nav: [],
    announcement: [],
    discussion: [],
    ticket: [],
  };

  for (const item of navItems) {
    const score = best(q, item.title, item.subtitle);
    if (score > 0)
      byKind.nav.push({
        id: `nav:${item.id}`,
        kind: 'nav',
        title: item.title,
        subtitle: item.subtitle,
        path: item.path,
        score,
      });
  }

  for (const a of announcements) {
    const score = best(q, a.title);
    if (score > 0)
      byKind.announcement.push({
        id: `ann:${a.id}`,
        kind: 'announcement',
        title: a.title,
        path: '/app/anunturi',
        score,
      });
  }

  for (const thread of threads) {
    const score = best(q, thread.title, thread.topic);
    if (score > 0)
      byKind.discussion.push({
        id: `disc:${thread.id}`,
        kind: 'discussion',
        title: thread.title,
        subtitle: thread.topic,
        path: '/app/discutii',
        score,
      });
  }

  for (const ticket of tickets) {
    const score = best(q, ticket.title, ticket.description);
    if (score > 0)
      byKind.ticket.push({
        id: `ticket:${ticket.id}`,
        kind: 'ticket',
        title: ticket.title,
        subtitle: ticket.category,
        path: '/app/sesizari',
        score,
      });
  }

  for (const kind of Object.keys(byKind) as SearchKind[]) {
    byKind[kind].sort((a, b) => b.score - a.score);
    byKind[kind] = byKind[kind].slice(0, MAX_PER_KIND);
  }

  return [...byKind.nav, ...byKind.announcement, ...byKind.discussion, ...byKind.ticket];
}
