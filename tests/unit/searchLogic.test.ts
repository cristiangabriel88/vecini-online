import { describe, expect, it } from 'vitest';
import { normalize, scoreMatch, searchResults } from '@/shared/search/searchLogic';
import type { NavItem, SearchResult } from '@/shared/search/searchLogic';
import type { Announcement, DiscussionThread, Ticket } from '@/shared/types/domain';

// ---------- normalize ----------

describe('normalize', () => {
  it('lowercases and strips common Romanian diacritics', () => {
    expect(normalize('Anunț')).toBe('anunt');
    expect(normalize('Ședință')).toBe('sedinta');
    expect(normalize('Asociație')).toBe('asociatie');
    expect(normalize('Închide')).toBe('inchide');
  });

  it('handles ASCII without change (only lowercases)', () => {
    expect(normalize('Hello')).toBe('hello');
  });
});

// ---------- scoreMatch ----------

describe('scoreMatch', () => {
  it('returns 100 for an exact match', () => {
    expect(scoreMatch('anunt', 'anunt')).toBe(100);
  });

  it('returns 80 when text starts with query', () => {
    expect(scoreMatch('anun', 'anunturi')).toBe(80);
  });

  it('returns 50 when text contains query', () => {
    expect(scoreMatch('nunt', 'anunturi')).toBe(50);
  });

  it('returns > 0 for multi-word partial match', () => {
    expect(scoreMatch('anunt urgent', 'anunturi urgente de bloc')).toBeGreaterThan(0);
  });

  it('returns 0 for no match', () => {
    expect(scoreMatch('xyz', 'anunturi')).toBe(0);
  });

  it('is diacritic-insensitive (query without, text with)', () => {
    expect(scoreMatch('anunt', 'Anunț oficial')).toBe(80);
  });

  it('is diacritic-insensitive (query with, text without)', () => {
    expect(scoreMatch('anunț', 'anunturi')).toBe(80);
  });

  it('returns 0 for empty query', () => {
    expect(scoreMatch('', 'anunturi')).toBe(0);
  });

  it('returns 0 for empty text', () => {
    expect(scoreMatch('anunt', '')).toBe(0);
  });
});

// ---------- searchResults ----------

function nav(id: string, title: string): NavItem {
  return { id, title, subtitle: 'Category', path: `/app/${id}` };
}

function announcement(id: string, title: string): Announcement {
  return {
    id,
    asociatie_id: 'a1',
    author_user_id: 'u1',
    title,
    body_html: '',
    category: 'informativ',
    audience: { type: 'all' },
    scheduled_at: null,
    published_at: '2026-01-01T00:00:00Z',
    expires_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function thread(id: string, title: string): DiscussionThread {
  return {
    id,
    asociatie_id: 'a1',
    topic: 'general',
    title,
    pinned: false,
    created_at: '2026-01-01T00:00:00Z',
    messages: [],
  };
}

function ticket(id: string, title: string): Ticket {
  return {
    id,
    asociatie_id: 'a1',
    reporter_user_id: 'u1',
    apartment_id: null,
    title,
    description: '',
    category: 'tehnic',
    severity: 'low',
    location_scara: null,
    location_etaj: null,
    location_description: null,
    status: 'primit',
    assigned_to_user_id: null,
    sla_due_at: null,
    resolved_at: null,
    verified_at: null,
    resolution_notes: null,
    rating: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

const navItems = [nav('home', 'Acasa'), nav('anunturi', 'Anunturi')];
const announcements = [announcement('a1', 'Avarie apa rece')];
const threads = [thread('t1', 'Curatenie scara')];
const tickets = [ticket('k1', 'Lift defect')];

describe('searchResults', () => {
  it('returns empty array for blank query', () => {
    expect(searchResults('', navItems, announcements, threads, tickets)).toEqual([]);
    expect(searchResults('   ', navItems, announcements, threads, tickets)).toEqual([]);
  });

  it('returns matching nav items for a nav-title query', () => {
    const results = searchResults('anunt', navItems, [], [], []);
    expect(results.some((r) => r.kind === 'nav')).toBe(true);
  });

  it('nav results appear before content results', () => {
    const mixedAnn = [announcement('am', 'Anunturi de bloc')];
    const results = searchResults('anunt', navItems, mixedAnn, [], []);
    const firstNavIdx = results.findIndex((r) => r.kind === 'nav');
    const firstAnnIdx = results.findIndex((r) => r.kind === 'announcement');
    expect(firstNavIdx).toBeGreaterThanOrEqual(0);
    expect(firstAnnIdx).toBeGreaterThan(firstNavIdx);
  });

  it('does not exceed MAX_PER_KIND (5) per section', () => {
    const manyAnn = Array.from({ length: 10 }, (_, i) =>
      announcement(`a${i}`, `Anunt numarul ${i + 1}`),
    );
    const results = searchResults('anunt', [], manyAnn, [], []);
    expect(results.filter((r) => r.kind === 'announcement').length).toBeLessThanOrEqual(5);
  });

  it('is diacritic-insensitive in full pipeline', () => {
    const results = searchResults('avarie', [], announcements, [], []);
    expect(results.some((r) => r.title.includes('Avarie'))).toBe(true);
  });

  it('returns correct paths for each kind', () => {
    const results = searchResults('curatenie', [], [], threads, []);
    const disc = results.find((r) => r.kind === 'discussion');
    expect(disc?.path).toBe('/app/discutii');
  });

  it('includes subtitle in result when present', () => {
    const results = searchResults('curatenie', [], [], threads, []);
    const disc = results.find((r) => r.kind === 'discussion') as SearchResult | undefined;
    expect(disc?.subtitle).toBeDefined();
  });
});
