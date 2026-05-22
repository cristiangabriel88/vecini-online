/**
 * Deterministic small-talk detection for the assistant.
 *
 * This is what makes the bot feel social without a model: a query is normalized
 * and checked against a small bilingual keyword set. A hit returns an intent id;
 * the engine maps it to a varied, pre-written reply. Anything that isn't clearly
 * social returns `null` and falls through to knowledge-base retrieval — so a
 * jailbreak-style prompt is never "social", it just becomes a normal (failed)
 * lookup and lands on the friendly fallback. There is nothing to manipulate.
 */
import { normalize } from './match';

export type SmallTalkIntent = 'greeting' | 'thanks' | 'bye' | 'identity' | 'capabilities' | 'affirm';

/** Multi-word phrases (checked against the whole normalized string). */
const PHRASES: { intent: SmallTalkIntent; phrases: string[] }[] = [
  {
    intent: 'capabilities',
    phrases: [
      'ce poti face', 'ce stii sa faci', 'cu ce ma poti ajuta', 'cu ce poti ajuta',
      'cum ma poti ajuta', 'la ce esti bun', 'ce poti sa faci',
      'what can you do', 'what can you help', 'how can you help', 'what do you do',
    ],
  },
  {
    intent: 'identity',
    phrases: [
      'cine esti', 'ce esti', 'cine esti tu', 'esti robot', 'esti om', 'esti un bot', 'esti ai',
      'who are you', 'what are you', 'are you a bot', 'are you human', 'are you real', 'your name',
    ],
  },
  {
    intent: 'bye',
    phrases: ['la revedere', 'o zi buna', 'numai bine', 'pe curand', 'good bye', 'see you', 'have a nice day'],
  },
  {
    intent: 'thanks',
    phrases: ['multumesc frumos', 'iti multumesc', 'mii de multumiri', 'thank you', 'thanks a lot', 'many thanks'],
  },
];

/** Single tokens that signal an intent when they appear in a short message. */
const TOKENS: { intent: SmallTalkIntent; tokens: string[] }[] = [
  { intent: 'greeting', tokens: ['salut', 'buna', 'bună', 'noroc', 'servus', 'salutare', 'hey', 'hello', 'hi', 'hola'] },
  { intent: 'thanks', tokens: ['multumesc', 'multam', 'mersi', 'merci', 'thanks', 'thx', 'ty'] },
  { intent: 'bye', tokens: ['pa', 'bye', 'goodbye', 'cheers'] },
  { intent: 'capabilities', tokens: ['ajutor', 'help', 'meniu', 'menu'] },
  { intent: 'affirm', tokens: ['da', 'ok', 'oki', 'okay', 'sigur', 'desigur', 'yes', 'yep', 'yup', 'sure'] },
];

/**
 * Returns the small-talk intent for a query, or `null` if it isn't social.
 * Phrase rules win over single tokens. Token rules only fire on short messages
 * (<= 3 words) so that "da, unde votez?" or "ajutor cu sesizarea" stay real
 * questions handled by the knowledge base.
 */
export function detectSmallTalk(query: string): SmallTalkIntent | null {
  const norm = normalize(query);
  if (!norm) return null;

  for (const { intent, phrases } of PHRASES) {
    if (phrases.some((p) => norm === p || norm.includes(p))) return intent;
  }

  const words = norm.split(' ').filter(Boolean);
  if (words.length > 3) return null;

  const wordSet = new Set(words);
  for (const { intent, tokens } of TOKENS) {
    if (tokens.some((tok) => wordSet.has(normalize(tok)))) return intent;
  }
  return null;
}
