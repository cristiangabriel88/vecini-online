/**
 * Knowledge base for the in-app help assistant.
 *
 * The assistant is a *grounded* retrieval bot: it never generates free text, it
 * only ever surfaces entries from this curated base. Two kinds of entries exist:
 *
 *  - `feature` entries are derived from the central feature registry. Their
 *    user-facing copy (title / description) comes from the i18n catalog at match
 *    time via `featureTitle` / `featureDescription`, so nothing is duplicated or
 *    re-translated here. Their `audience` is taken straight from the registry,
 *    which is what enforces "no admin access" once filtered (see visibility.ts).
 *  - `howto` / `concept` entries are hand-authored. Their question/answer copy
 *    lives under the `assistant.kb.<id>` i18n keys (ro.json / en.json).
 *
 * `aliases` are language-agnostic matching hints (RO + EN), never shown to the
 * user, so they live in code rather than the locale files.
 */
import { FEATURES, type FeatureAudience, type FeatureKey } from '@/shared/features/registry';

export type KbKind = 'feature' | 'howto' | 'concept' | 'meta' | 'data';

/** Inline answer payload for `data` entries (contact lookups, etc.). */
export interface KbData {
  /** Matchable terms (plain words, RO + EN); not shown to the user. */
  terms: string[];
  /** Heading shown with the answer (e.g. "Președinte comitet"). */
  label: string;
  /** The actual value surfaced (a phone number, an email, ...). */
  value: string;
  valueKind: 'phone' | 'email' | 'text';
}

export interface KbEntry {
  /** Stable id: a feature key (e.g. "F17") or a namespaced slug ("concept.cota-parte"). */
  id: string;
  kind: KbKind;
  /** Set for `feature` entries; links back to the registry for title/description. */
  featureKey?: FeatureKey;
  /** Who may see this entry. Feature entries inherit the registry audience. */
  audience: FeatureAudience[];
  /** In-app destination, already prefixed with /app. Drives the "Open in app" button. */
  route?: string;
  /** Extra matching hints (RO + EN), normalized at match time. Not user-visible. */
  aliases?: string[];
  /** Present on `data` entries: the looked-up value and its matching terms. */
  data?: KbData;
}

/**
 * Per-feature matching hints. Keys are feature keys; values are the words a
 * resident is likely to type. Title/description tokens are matched too, so this
 * only needs to cover synonyms and colloquial phrasing the canonical copy misses.
 */
const FEATURE_ALIASES: Partial<Record<FeatureKey, string[]>> = {
  F01: ['anunt', 'anunturi', 'anunt oficial', 'stiri', 'news', 'announcement', 'announcements', 'notice'],
  F02: ['discutie', 'discutii', 'chat', 'forum', 'discussion', 'talk', 'mesaje vecini'],
  F03: ['alerta', 'alerte', 'urgenta', 'emergency', 'alert', 'avarie', 'pericol'],
  F04: ['administrator', 'admin', 'mesaj privat', 'contact admin', 'message admin', 'private message', 'scrie administratorului'],
  F05: ['anonim', 'mesaj anonim', 'anonymous', 'sesizare anonima', 'reclamatie anonima'],
  F06: ['locator', 'anunt vecin', 'anunturi vecini', 'sticky', 'neighbor post', 'caut ofer'],
  F07: ['faq', 'intrebari', 'intrebare', 'frequent', 'questions', 'question', 'ajutor intrebare'],
  F08: ['eveniment', 'evenimente', 'calendar', 'event', 'events', 'rsvp', 'intalnire', 'sedinta'],
  F09: ['vot', 'votez', 'votare', 'voturi', 'vote', 'voting', 'poll', 'polls', 'propunere', 'referendum'],
  F11: ['proces verbal', 'procese verbale', 'minutes', 'pv', 'arhiva sedinte'],
  F12: ['buget', 'buget participativ', 'budget', 'fond discretionar'],
  F13: ['prioritate', 'prioritati', 'prioritizare', 'priority', 'ranking', 'ordine proiecte'],
  F14: ['idee', 'idei', 'cutie de idei', 'idea', 'ideas', 'suggestion', 'sugestie'],
  F15: ['sondaj', 'sondaje', 'survey', 'surveys', 'opinie', 'chestionar'],
  F16: ['petitie', 'petitii', 'petition', 'semnatura', 'signature', 'strang semnaturi'],
  F17: ['sesizare', 'sesizari', 'problema', 'probleme', 'problem', 'defect', 'stricat', 'reparatie', 'repair', 'fix', 'teava', 'teava sparta', 'scurgere', 'leak', 'broken', 'issue', 'report', 'raportez', 'raportare', 'reclamatie', 'avarie'],
  F18: ['istoric', 'reparatii', 'repair history', 'reparatie facuta', 'ce s-a reparat'],
  F19: ['mentenanta', 'service', 'revizie', 'maintenance', 'iscir', 'centrala', 'deratizare', 'program service'],
  F20: ['contor', 'contoare', 'index', 'indexuri', 'meter', 'reading', 'citire', 'apa', 'gaz', 'caldura'],
  F21: ['sesizari recurente', 'probleme repetate', 'recurring'],
  F22: ['oferta', 'oferte', 'rfp', 'cerere oferta', 'cotatie'],
  F23: ['garda', 'vecin de garda', 'duty', 'weekend', 'voluntar garda'],
  F24: ['imprumut', 'imprumuturi', 'unealta', 'obiect', 'borrow', 'lending', 'tool', 'scara bormasina'],
  F25: ['spalatorie', 'spalat', 'masina de spalat', 'laundry', 'rezervare spalatorie'],
  F26: ['lift', 'mutare', 'moving', 'elevator', 'rezervare lift', 'mut'],
  F27: ['sala', 'terasa', 'sala comuna', 'venue', 'party', 'petrecere', 'rezervare sala', 'eveniment privat'],
  F28: ['parcare', 'masina', 'loc parcare', 'parking', 'car', 'inmatriculare', 'numar masina'],
  F29: ['bicicleta', 'biciclete', 'bike', 'bikes', 'bicicletarie'],
  F30: ['boxa', 'boxe', 'dependinta', 'storage', 'debara', 'pod', 'subsol'],
  F31: ['plante', 'spatii verzi', 'gradina', 'green', 'plants', 'voluntar plante', 'flori'],
  F32: ['curier', 'cod', 'interfon', 'acces', 'courier', 'code', 'livrare', 'delivery', 'cod temporar'],
  F33: ['document', 'documente', 'statut', 'regulament', 'contract', 'documents', 'arhiva', 'fisier'],
  F34: ['furnizor', 'furnizori', 'contracte furnizori', 'supplier'],
  F36: ['vecini', 'agenda', 'contacte', 'directory', 'neighbors', 'contact vecin', 'numar vecin'],
  F37: ['animal', 'animale', 'caine', 'pisica', 'pet', 'pets', 'companie'],
  F38: ['multumire', 'multumiri', 'carte de aur', 'thanks', 'thank you', 'multumesc'],
  F39: ['wiki', 'ghid', 'instructiuni', 'knowledge', 'cum functioneaza bloc'],
  F40: ['glosar', 'termen', 'definitie', 'glossary', 'term', 'jargon', 'ce inseamna'],
  F41: ['proiect', 'proiecte', 'lucrari', 'project', 'works', 'santier', 'anvelopare'],
  F42: ['jurnal foto', 'poze lucrari', 'photo journal', 'galerie lucrari'],
  F43: ['contractor', 'contractori', 'firma', 'contractor library'],
  F44: ['crowdfunding', 'finantare', 'contributie', 'donatie', 'crowdfund', 'strangere fonduri'],
  F45: ['plan multianual', 'plan lucrari', 'multi year', 'plan pe ani'],
  F46: ['fond de reparatii', 'fond reparatii', 'repair fund', 'rata fond', 'calculator fond'],
  F47: ['energie', 'consum', 'energy', 'curent', 'electricitate'],
  F48: ['garantie', 'garantii', 'warranty', 'garantie echipament'],
  F49: ['cod siguranta', 'parola', 'escrocherie', 'safety code', 'vecini de incredere'],
  F50: ['evacuare', 'plan evacuare', 'iesire', 'evacuation', 'incendiu', 'pompieri'],
  F51: ['psi', 'verificare psi', 'stingator', 'hidrant', 'fire'],
  F52: ['asigurare', 'polita', 'insurance'],
  F53: ['chei', 'registru chei', 'keys', 'cine are cheia'],
  F54: ['vizitator', 'vizitatori', 'strain', 'suspect', 'visitor', 'intrus'],
  F55: ['alarma', 'sistem alarma', 'alarm', 'detectie', 'senzor'],
  F56: ['urgenta', 'numere urgenta', '112', 'emergency numbers', 'salvare', 'politie', 'pompieri'],
  F57: ['marketplace', 'piata', 'vand', 'cumpar', 'donez', 'sell', 'buy', 'vanzare', 'second hand'],
  F58: ['carpool', 'carpooling', 'drum', 'transport', 'ride', 'masina comuna'],
  F59: ['bona', 'babysitting', 'pet sitting', 'ingrijire', 'sitter', 'dadaca'],
  F60: ['barter', 'schimb servicii', 'skill', 'servicii', 'exchange'],
  F61: ['cumparaturi comune', 'group buy', 'comanda grup', 'bulk', 'en gros'],
  F62: ['kit', 'bun venit', 'welcome', 'locatar nou', 'new resident', 'sunt nou'],
  F63: ['aniversare', 'aniversari', 'zi de nastere', 'birthday', 'ziua'],
  F64: ['copii', 'adolescenti', 'activitati copii', 'kids', 'children', 'joaca'],
  F65: ['feedback', 'parere', 'sugestie aplicatie', 'platform feedback'],
};

/** Feature entries: every implemented feature that has a dedicated page. */
const FEATURE_ENTRIES: KbEntry[] = FEATURES.filter((f) => f.implemented && f.path).map((f) => ({
  id: f.key,
  kind: 'feature',
  featureKey: f.key,
  audience: f.audience,
  route: `/app/${f.path}`,
  aliases: FEATURE_ALIASES[f.key],
}));

/**
 * Hand-authored help entries that don't map cleanly to a single feature page.
 * Copy lives under `assistant.kb.<id>.{q,a}` in the locale files.
 */
const CURATED_ENTRIES: KbEntry[] = [
  {
    id: 'meta.help',
    kind: 'meta',
    audience: ['all'],
    aliases: ['ajutor', 'help', 'ce poti face', 'ce stii', 'what can you do', 'cu ce ma poti ajuta', 'meniu', 'optiuni'],
  },
  {
    id: 'concept.cota-parte',
    kind: 'concept',
    audience: ['all'],
    route: '/app/glosar',
    aliases: ['cota parte', 'cota indiviza', 'cota parte indiviza', 'cat platesc', 'pondere vot'],
  },
  {
    id: 'concept.fond-reparatii',
    kind: 'concept',
    audience: ['all'],
    route: '/app/fond-reparatii',
    aliases: ['fond de reparatii', 'la ce e fondul', 'pentru ce fond reparatii'],
  },
  {
    id: 'concept.cvorum',
    kind: 'concept',
    audience: ['all'],
    route: '/app/glosar',
    aliases: ['cvorum', 'quorum', 'cati trebuie sa voteze', 'majoritate vot'],
  },
];

/** The full base. Order is irrelevant; matching ranks by score. */
export const KNOWLEDGE_BASE: KbEntry[] = [...FEATURE_ENTRIES, ...CURATED_ENTRIES];
