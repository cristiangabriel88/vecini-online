/**
 * Turns a user query into a grounded assistant reply.
 *
 * Pure given a `t` function and the (already role-filtered) entry list, so it is
 * straightforward to unit-test. The flow is fully deterministic — there is no
 * text generation anywhere, so nothing can be prompt-injected:
 *   1. social small talk (greeting / thanks / identity / ...) → a canned reply,
 *   2. otherwise rank knowledge-base matches and, when two are nearly tied, ask a
 *      clarifying question instead of guessing,
 *   3. a confident single match returns the concise factual answer (unchanged),
 *   4. nothing confident → a friendly, varied fallback with suggestions.
 *
 * A `seed` (the conversation turn index) rotates the wording of social/clarify/
 * fallback replies so the bot doesn't sound robotic, while staying deterministic.
 */
import type { TFunction } from 'i18next';
import { FEATURES, featureTitle, featureDescription, getFeature } from '@/shared/features/registry';
import { matchEntries, MATCH_THRESHOLD } from './match';
import { detectSmallTalk, type SmallTalkIntent } from './smalltalk';
import type { KbEntry } from './knowledge';

export interface ReplyChip {
  label: string;
  /** Re-asking this text reproduces the answer for the suggested entry. */
  ask: string;
}

export interface AssistantReply {
  /** Bold heading (feature name / question). */
  title?: string;
  text: string;
  /** In-app destination for the "Open in app" button. */
  route?: string;
  /** Human label for that destination (the feature page name). */
  routeLabel?: string;
  /** Follow-up suggestions shown as chips. */
  chips?: ReplyChip[];
  /** False when nothing cleared the confidence threshold. */
  matched: boolean;
}

/** Deterministically pick one of several phrasings by turn index. */
export function pickVariant(values: string[], seed: number): string {
  if (values.length === 0) return '';
  const i = ((seed % values.length) + values.length) % values.length;
  return values[i];
}

/** Read a localized array of phrasings; `[]` if the key is missing. */
function variants(t: TFunction, key: string): string[] {
  const v = t(key, { returnObjects: true });
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Quick-prompt chips, used to steer social replies back toward helping. */
function quickPromptChips(t: TFunction): ReplyChip[] {
  return variants(t, 'assistant.quickPrompts').map((p) => ({ label: p, ask: p }));
}

/** Title of the feature a route points at, if any (used to label the button). */
function routeLabel(route: string | undefined, t: TFunction): string | undefined {
  if (!route) return undefined;
  const f = FEATURES.find((feat) => feat.path && `/app/${feat.path}` === route);
  return f ? featureTitle(t, f) : undefined;
}

/** Display label for an entry, used in suggestion / clarify chips. */
function entryLabel(entry: KbEntry, t: TFunction): string {
  if (entry.kind === 'data' && entry.data) return entry.data.label;
  if (entry.featureKey) {
    const f = getFeature(entry.featureKey);
    return f ? featureTitle(t, f) : entry.id;
  }
  return t(`assistant.kb.${entry.id}.q`);
}

/** A canned, varied reply for a social intent, or `null` if copy is missing. */
function socialReply(intent: SmallTalkIntent, t: TFunction, seed: number): AssistantReply | null {
  const text = pickVariant(variants(t, `assistant.social.${intent}`), seed);
  if (!text) return null;
  // Greetings and "what can you do" nudge toward concrete help.
  const chips = intent === 'greeting' || intent === 'capabilities' ? quickPromptChips(t) : undefined;
  return { text, chips, matched: true };
}

function formatEntry(entry: KbEntry, t: TFunction): AssistantReply {
  if (entry.kind === 'data' && entry.data) {
    // The answer IS the value (phone/email); the route points to its page.
    return {
      title: entry.data.label,
      text: entry.data.value,
      route: entry.route,
      routeLabel: routeLabel(entry.route, t),
      matched: true,
    };
  }
  if (entry.featureKey) {
    const f = getFeature(entry.featureKey)!;
    const title = featureTitle(t, f);
    return { title, text: featureDescription(t, f), route: entry.route, routeLabel: title, matched: true };
  }
  if (entry.id === 'meta.help') {
    return { text: t('assistant.kb.meta.help.a'), chips: quickPromptChips(t), matched: true };
  }
  return {
    title: t(`assistant.kb.${entry.id}.q`),
    text: t(`assistant.kb.${entry.id}.a`),
    route: entry.route,
    routeLabel: routeLabel(entry.route, t),
    matched: true,
  };
}

/** Produce a reply for `query` against the given (visible) entries. */
export function answerQuery(query: string, entries: KbEntry[], t: TFunction, seed = 0): AssistantReply {
  // 1. Social small talk takes precedence over knowledge lookups.
  const intent = detectSmallTalk(query);
  if (intent) {
    const reply = socialReply(intent, t, seed);
    if (reply) return reply;
  }

  const matches = matchEntries(query, entries, t);
  const top = matches[0];

  // 2. Nothing confident → friendly, varied fallback with the closest topics.
  if (!top || top.score < MATCH_THRESHOLD) {
    const chips = matches.slice(0, 3).map((m) => {
      const label = entryLabel(m.entry, t);
      return { label, ask: label };
    });
    const fallbacks = variants(t, 'assistant.fallbackVariants');
    const text = fallbacks.length ? pickVariant(fallbacks, seed) : t('assistant.noMatch');
    return { text, chips, matched: false };
  }

  // 3. Two distinct topics nearly tied → ask which one instead of guessing.
  const second = matches[1];
  if (
    second &&
    second.entry.id !== top.entry.id &&
    second.score >= MATCH_THRESHOLD &&
    top.score - second.score <= 1
  ) {
    const clarify = variants(t, 'assistant.clarifyVariants');
    if (clarify.length) {
      const chips = matches.slice(0, 3).map((m) => {
        const label = entryLabel(m.entry, t);
        return { label, ask: label };
      });
      return { text: pickVariant(clarify, seed), chips, matched: true };
    }
  }

  // 4. Confident single match → concise factual answer (unchanged).
  return formatEntry(top.entry, t);
}
