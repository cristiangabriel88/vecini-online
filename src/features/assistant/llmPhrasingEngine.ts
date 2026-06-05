// Optional LLM-backed PhrasingEngine (T237).
//
// The default deterministicPhrasing in intentRouter.ts is always active and keeps
// all three build stages (PROD/DEV/DEMO) fully functional offline. This module adds
// an OPTIONAL upgrade path for when an LLM phrasing proxy is available server-side
// (see netlify/functions/assistant-phrase.ts).
//
// IMPORTANT: PhrasingEngine.phrase() is synchronous. Real async LLM calls therefore
// require a two-step flow:
//   1. Prefetch: call /api/assistant-phrase before the widget needs a phrase,
//      cache the returned choice_index keyed by the candidate list signature.
//   2. Consume: phrase() reads the cached choice; falls back to deterministicPhrasing
//      on cache miss, network failure, or any invalid server response.
// This module implements the safety validation layer only (T237). The async prefetch
// orchestration is the follow-up (see DECISIONS.md for the prompt contract).
//
// Safety invariant (tested in tests/unit/assistant.llmPhrasingEngine.test.ts):
//   The engine can NEVER emit a string that was not in the supplied candidates array.
//   All server-returned values are validated by safeChoice() before use; on any
//   out-of-range, non-numeric, non-finite, or missing response the engine falls
//   back to pickVariant (deterministic), which is always in range.

import { pickVariant } from './engine';
import type { PhrasingEngine } from './intentRouter';

/**
 * Validate a server-returned choice_index against the supplied candidate list.
 *
 * Returns candidates[i] when the index is a finite number that, after truncation
 * to an integer, lies within [0, candidates.length - 1]. Returns null on any
 * other input so the caller can fall back to a deterministic choice.
 *
 * This is the central safety gate: even if the server returns an unexpected value,
 * the engine cannot emit text outside the pre-written, curated variant list.
 */
export function safeChoice(candidates: string[], choiceIndex: unknown): string | null {
  if (candidates.length === 0) return null;
  if (typeof choiceIndex !== 'number' || !isFinite(choiceIndex)) return null;
  const i = Math.trunc(choiceIndex);
  if (i < 0 || i >= candidates.length) return null;
  return candidates[i];
}

/**
 * Create a PhrasingEngine that uses a pre-fetched server choice and falls back
 * to deterministicPhrasing when no valid cached choice is available.
 *
 * @param getCachedChoice - Called with the candidate list; returns the server's
 *   raw choice_index (or null/undefined when no cached result exists).
 *
 * Usage:
 *   const engine = createLlmPhrasingEngine(candidates => cache.get(key(candidates)));
 *   routeQuery(query, kb, ctx, t, seed, lastOffered, engine);
 */
export function createLlmPhrasingEngine(
  getCachedChoice: (candidates: string[]) => unknown,
): PhrasingEngine {
  return {
    phrase(candidates: string[], seed: number): string {
      const raw = getCachedChoice(candidates);
      const chosen = safeChoice(candidates, raw);
      if (chosen !== null) return chosen;
      return pickVariant(candidates, seed);
    },
  };
}
