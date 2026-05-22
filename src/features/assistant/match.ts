/**
 * Local, deterministic matcher for the help assistant.
 *
 * No model, no network: a query is normalized, tokenized, and scored against
 * each visible knowledge-base entry. Scoring is weighted token overlap with a
 * boost for alias hits. Below a confidence threshold the caller treats it as
 * "no match" and offers suggestions instead. Because answers are always
 * pre-written entries, the bot can neither hallucinate nor leak.
 */
import type { TFunction } from 'i18next';
import { featureTitle, featureDescription, getFeature } from '@/shared/features/registry';
import type { KbEntry } from './knowledge';

/** Minimum score for a confident answer (an alias hit alone clears this). */
export const MATCH_THRESHOLD = 3;

/** Function words ignored during matching (RO + EN). */
const STOPWORDS = new Set([
  // Romanian
  'cum', 'ce', 'unde', 'cand', 'care', 'cine', 'este', 'sunt', 'sa', 'se', 'si', 'sau',
  'un', 'o', 'de', 'la', 'in', 'pe', 'cu', 'din', 'al', 'ai', 'ale', 'am', 'as', ' as',
  'vreau', 'pot', 'as', 'imi', 'mi', 'ma', 'mea', 'meu', 'pentru', 'despre', 'fac', 'face',
  'aplicatie', 'aplicatia', 'aici', 'asta', 'acolo',
  // English
  'how', 'what', 'where', 'when', 'which', 'who', 'is', 'are', 'do', 'does', 'can', 'could',
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'with', 'for', 'about', 'my', 'me', 'i', 'want',
  'app', 'this', 'that', 'here', 'there', 'get', 'find',
]);

/** Lowercase, strip diacritics (handles ăâîșț + cedilla variants), drop punctuation. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalized, de-duplicated, stopword-free tokens of length >= 2. */
export function tokenize(input: string): string[] {
  return normalize(input)
    .split(' ')
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

interface EntryDoc {
  titleTokens: string[];
  bodyTokens: string[];
  aliasTokens: string[];
}

/** True if `a` and `b` are at most one edit apart — insert, delete, substitute,
 *  or a single adjacent transposition (Damerau). Bounded and cheap: it finds the
 *  first divergence, then checks whether one local fix makes the tails equal. */
function withinOneEdit(a: string, b: string): boolean {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;

  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (i === la && i === lb) return true; // identical

  if (la === lb) {
    // substitution at i, or transposition of a[i] and a[i+1]
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  if (la > lb) return a.slice(i + 1) === b.slice(i); // deletion in a
  return a.slice(i) === b.slice(i + 1); // insertion in a
}

/** True if two tokens are equal, one is a prefix of the other (>= 4 chars), or
 *  they are a single typo apart (>= 5 chars). The prefix rule absorbs Romanian
 *  inflections (președinte ~ președintelui); the edit rule absorbs typos
 *  (spalatorei ~ spalatorie). */
function tokenMatches(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  if (a.length >= 5 && b.length >= 5) return withinOneEdit(a, b);
  return false;
}

/** Does any doc token match the query token? */
function hits(queryTok: string, docTokens: string[]): boolean {
  return docTokens.some((d) => tokenMatches(queryTok, d));
}

/** Build the searchable token lists for an entry using its localized copy
 *  (features / curated) or its inline terms (data entries). */
function entryDoc(entry: KbEntry, t: TFunction): EntryDoc {
  if (entry.kind === 'data' && entry.data) {
    const aliasTokens: string[] = [];
    for (const term of entry.data.terms) aliasTokens.push(...tokenize(term));
    return { titleTokens: tokenize(entry.data.label), bodyTokens: [], aliasTokens };
  }

  let titleText = '';
  let bodyText = '';
  if (entry.featureKey) {
    const f = getFeature(entry.featureKey);
    if (f) {
      titleText = featureTitle(t, f);
      bodyText = featureDescription(t, f);
    }
  } else {
    titleText = t(`assistant.kb.${entry.id}.q`, '');
    bodyText = t(`assistant.kb.${entry.id}.a`, '');
  }
  const aliasTokens: string[] = [];
  for (const alias of entry.aliases ?? []) aliasTokens.push(...tokenize(alias));
  return {
    titleTokens: tokenize(titleText),
    bodyTokens: tokenize(bodyText),
    aliasTokens,
  };
}

export interface KbMatch {
  entry: KbEntry;
  score: number;
}

/**
 * Score every entry against the query and return matches (score > 0), best
 * first. Weighting: alias hit = 3, title hit = 2, body hit = 1, per query token.
 */
export function matchEntries(query: string, entries: KbEntry[], t: TFunction): KbMatch[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const matches: KbMatch[] = [];
  for (const entry of entries) {
    const doc = entryDoc(entry, t);
    let score = 0;
    for (const tok of queryTokens) {
      if (hits(tok, doc.aliasTokens)) score += 3;
      else if (hits(tok, doc.titleTokens)) score += 2;
      else if (hits(tok, doc.bodyTokens)) score += 1;
    }
    if (score > 0) matches.push({ entry, score });
  }

  // Best score first; on ties prefer feature entries (concrete destinations).
  matches.sort((a, b) => b.score - a.score || (a.entry.kind === 'feature' ? -1 : 1));
  return matches;
}
