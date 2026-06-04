/**
 * Visible-first intent router for the assistant.
 *
 * Wraps the existing `answerQuery` engine in a structured schema and adds
 * visible-context grounding: answers are drawn from what is actually on screen
 * when that matches the query, before falling back to the global knowledge base.
 *
 * All matching is deterministic and local — no model, no network, no free-text
 * generation. Injection safety is structural: visible page text is only ever
 * scored for token overlap and surfaced verbatim as a display value. There is
 * no code path that parses it as a command.
 *
 * A `PhrasingEngine` seam allows an optional future LLM implementation to
 * choose among pre-written variant strings and re-rank already-retrieved KB
 * candidates. It must never introduce facts, routes, or text not grounded in
 * the curated KB or visible content, and must never see secrets or PII. The
 * default `deterministicPhrasing` keeps the app fully functional offline.
 */
import type { TFunction } from 'i18next';
import { getFeature, featureTitle } from '@/shared/features/registry';
import { matchEntries, MATCH_THRESHOLD } from './match';
import type { KbMatch } from './match';
import { detectSmallTalk } from './smalltalk';
import type { KbEntry } from './knowledge';
import { answerQuery, pickVariant, variants } from './engine';
import type { AssistantReply, ReplyChip } from './engine';
import { visibleContextEntries } from './visibleState';
import type { VisibleContext } from './visibleState';

export type RouterIntent = 'greeting' | 'ask' | 'clarify' | 'confirm' | 'fallback';

export interface RouterResult {
  intent: RouterIntent;
  message: string;
  options: { label: string; ask: string }[];
  title?: string;
  route?: string;
  routeLabel?: string;
  matched: boolean;
}

/**
 * Pluggable phrasing engine.
 *
 * `phrase` selects one of a set of pre-written variant strings by seed.
 * `select` (optional) re-ranks already-retrieved KbMatch candidates.
 *
 * A future LLM implementation may implement both methods, but must satisfy
 * these constraints: input is a fixed list of candidate strings or already-
 * retrieved matches; the output must be validated against the input set before
 * use; it may never introduce facts, routes, or text outside the supplied set;
 * it must never receive raw page text as instructions. The default offline
 * engine must remain the fallback so all three build stages keep working.
 */
export interface PhrasingEngine {
  phrase(variantList: string[], seed: number): string;
  select?(query: string, candidates: KbMatch[], seed: number): KbMatch[];
}

export const deterministicPhrasing: PhrasingEngine = {
  phrase: pickVariant,
};

function entryLabel(entry: KbEntry, t: TFunction): string {
  if (entry.kind === 'data' && entry.data) return entry.data.label;
  if (entry.featureKey) {
    const f = getFeature(entry.featureKey);
    return f ? featureTitle(t, f) : entry.id;
  }
  return t(`assistant.kb.${entry.id}.q`);
}

/** Bridge an existing `AssistantReply` into a `RouterResult`. */
export function fromReply(reply: AssistantReply, intent: RouterIntent): RouterResult {
  return {
    intent,
    message: reply.text,
    options: reply.chips ?? [],
    title: reply.title,
    route: reply.route,
    routeLabel: reply.routeLabel,
    matched: reply.matched,
  };
}

/** Bridge a `RouterResult` back into an `AssistantReply` for the widget store. */
export function toMessage(result: RouterResult): AssistantReply {
  return {
    text: result.message,
    title: result.title,
    route: result.route,
    routeLabel: result.routeLabel,
    chips: result.options.length > 0 ? result.options : undefined,
    matched: result.matched,
  };
}

/**
 * Route `query` to a structured `RouterResult`.
 *
 * Ordering:
 *   1. Social small talk (non-affirm) detected by `detectSmallTalk`:
 *      greeting/capabilities → `greeting`; thanks/bye/identity → `ask`.
 *   2. Affirm intent + `lastOffered`:
 *      single option → re-run router on that option's `ask`, return as `confirm`;
 *      multiple options → `clarify` (never guess).
 *   3. Visible-first scoring: score `visibleContextEntries(visibleCtx)` and
 *      `kbEntries` separately. Visible wins when
 *      `vTop.score >= MATCH_THRESHOLD && vTop.score >= kbTop.score`.
 *   4. Merge all matches (visible first, dedup by id).
 *   5. Nothing over threshold → `fallback` (up to 3 closest options, visible first).
 *   6. Near-tie (both top two >= threshold and within 1 point) → `clarify`
 *      (2-4 options, visible first).
 *   7. Confident single winner → `ask`:
 *      visible win: verbatim value + current route + bilingual label prefix;
 *      KB win: delegate to `answerQuery` for full answer formatting.
 */
export function routeQuery(
  query: string,
  kbEntries: KbEntry[],
  visibleCtx: VisibleContext,
  t: TFunction,
  seed: number,
  lastOffered?: ReplyChip[],
  engine?: PhrasingEngine,
): RouterResult {
  const eng = engine ?? deterministicPhrasing;

  // Steps 1 + 2: social small talk and confirm.
  const smallTalk = detectSmallTalk(query);
  if (smallTalk) {
    if (smallTalk === 'affirm') {
      if (lastOffered && lastOffered.length === 1) {
        const sub = routeQuery(lastOffered[0].ask, kbEntries, visibleCtx, t, seed + 1, undefined, engine);
        return { ...sub, intent: 'confirm' };
      }
      if (lastOffered && lastOffered.length > 1) {
        const cv = variants(t, 'assistant.clarifyVariants');
        return {
          intent: 'clarify',
          message: eng.phrase(cv, seed),
          options: lastOffered,
          matched: true,
        };
      }
      // Bare affirm without context: fall through to ask (wraps social reply).
    }
    const reply = answerQuery(query, kbEntries, t, seed);
    const intent: RouterIntent =
      smallTalk === 'greeting' || smallTalk === 'capabilities' ? 'greeting' : 'ask';
    return fromReply(reply, intent);
  }

  // Steps 3-7: visible-first knowledge retrieval.
  const visibleKb = visibleContextEntries(visibleCtx);
  const rawVisible = matchEntries(query, visibleKb, t);
  const rawKb = matchEntries(query, kbEntries, t);

  const visibleMatches = eng.select ? eng.select(query, rawVisible, seed) : rawVisible;
  const kbMatches = eng.select ? eng.select(query, rawKb, seed) : rawKb;

  const vTop = visibleMatches[0];
  const kbTop = kbMatches[0];

  const useVisible = !!(
    vTop &&
    vTop.score >= MATCH_THRESHOLD &&
    (!kbTop || vTop.score >= kbTop.score)
  );

  // Merge: visible first, dedup by entry id.
  const seenIds = new Set<string>();
  const allMatches: KbMatch[] = [];
  for (const m of [...visibleMatches, ...kbMatches]) {
    if (!seenIds.has(m.entry.id)) {
      seenIds.add(m.entry.id);
      allMatches.push(m);
    }
  }

  const top = allMatches[0];
  const second = allMatches[1];

  // Step 5: nothing over threshold → fallback.
  if (!top || top.score < MATCH_THRESHOLD) {
    const opts = allMatches.slice(0, 3).map((m) => {
      const label = entryLabel(m.entry, t);
      return { label, ask: label };
    });
    const fv = variants(t, 'assistant.fallbackVariants');
    return {
      intent: 'fallback',
      message: eng.phrase(fv, seed) || t('assistant.noMatch'),
      options: opts,
      matched: false,
    };
  }

  // Step 6: near-tie → clarify (prevents guessing between close candidates).
  if (
    second &&
    second.entry.id !== top.entry.id &&
    second.score >= MATCH_THRESHOLD &&
    top.score - second.score <= 1
  ) {
    const cv = variants(t, 'assistant.clarifyVariants');
    const opts = allMatches.slice(0, 4).map((m) => {
      const label = entryLabel(m.entry, t);
      return { label, ask: label };
    });
    return {
      intent: 'clarify',
      message: eng.phrase(cv, seed),
      options: opts,
      matched: true,
    };
  }

  // Step 7: confident match.
  if (useVisible && vTop && top.entry.id === vTop.entry.id) {
    const val = vTop.entry.data?.value ?? vTop.entry.data?.label ?? '';
    const prefix = t('assistant.visiblePrefix', '');
    return {
      intent: 'ask',
      message: prefix ? `${prefix} ${val}` : val,
      options: [],
      title: vTop.entry.data?.label,
      route: visibleCtx.route,
      routeLabel: undefined,
      matched: true,
    };
  }
  // KB wins: delegate to answerQuery for full formatting (title, route, chips).
  const reply = answerQuery(query, kbEntries, t, seed);
  return fromReply(reply, 'ask');
}
