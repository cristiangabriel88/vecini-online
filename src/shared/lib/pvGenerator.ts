// Pure process-verbal content generation (T37).
//
// Extracted from agaLogic.ts so this module can be imported by both the React
// app and Netlify functions. No @/ aliases -- esbuild (the Netlify function
// bundler) does not resolve Vite path aliases; all imports use relative paths.
//
// Identity-H PDF encoding (server-side renderer) stores each character as its
// Unicode code point, so Romanian diacritics render correctly in modern PDF
// viewers without embedding a font.

import type { AgaAgendaItem, AgaMeeting, AgaProxy, AgaVoteCounts } from '../types/domain';
import { formatDateLong } from './format';

function proxyVotesFor(itemId: string, proxies: AgaProxy[]): AgaVoteCounts {
  const counts: AgaVoteCounts = { pentru: 0, contra: 0, abtinere: 0 };
  for (const proxy of proxies) {
    const decision = proxy.votes[itemId];
    if (decision) counts[decision] += 1;
  }
  return counts;
}

/** Apartments represented, counting the current demo apartment when it is
 *  present or has given a proxy, plus every recorded procură. */
export function presentApartments(meeting: AgaMeeting): number {
  const mine = meeting.my_rsvp === 'prezent' || meeting.my_rsvp === 'procura' ? 1 : 0;
  return meeting.represented_apartments + mine + meeting.proxies.length;
}

/** Attendance as a percent of all apartments (0 when there are none). */
export function quorumPercent(meeting: AgaMeeting): number {
  if (meeting.total_apartments === 0) return 0;
  return Math.round((presentApartments(meeting) / meeting.total_apartments) * 100);
}

/** Whether the quorum required for valid decisions is met. */
export function isQuorumMet(meeting: AgaMeeting): boolean {
  return quorumPercent(meeting) >= meeting.required_quorum_percent;
}

export interface ItemTally {
  pentru: number;
  contra: number;
  abtinere: number;
  total: number;
}

/** Vote counts for an item, folding in the current apartment's own vote and any
 *  votes cast through procură (proxy) on other apartments' behalf. */
export function itemTally(item: AgaAgendaItem, proxies: AgaProxy[] = []): ItemTally {
  const px = proxyVotesFor(item.id, proxies);
  const pentru = item.votes.pentru + (item.my_vote === 'pentru' ? 1 : 0) + px.pentru;
  const contra = item.votes.contra + (item.my_vote === 'contra' ? 1 : 0) + px.contra;
  const abtinere = item.votes.abtinere + (item.my_vote === 'abtinere' ? 1 : 0) + px.abtinere;
  return { pentru, contra, abtinere, total: pentru + contra + abtinere };
}

/** Each option as a whole-number percent of the votes cast on the item. */
export function itemPercentages(
  item: AgaAgendaItem,
  proxies: AgaProxy[] = [],
): Omit<ItemTally, 'total'> {
  const { pentru, contra, abtinere, total } = itemTally(item, proxies);
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return { pentru: pct(pentru), contra: pct(contra), abtinere: pct(abtinere) };
}

export type ItemOutcome = 'adoptat' | 'respins' | 'in_asteptare';

/** Outcome of an agenda item under its majority rule, requiring quorum.
 *  Returns `in_asteptare` while no votes have been cast. */
export function itemOutcome(item: AgaAgendaItem, meeting: AgaMeeting): ItemOutcome {
  const { pentru, contra, total } = itemTally(item, meeting.proxies);
  if (total === 0) return 'in_asteptare';
  if (!isQuorumMet(meeting)) return 'respins';
  switch (item.majority_rule) {
    case 'simple':
      return pentru > contra ? 'adoptat' : 'respins';
    case 'absolute':
      return pentru > meeting.total_apartments / 2 ? 'adoptat' : 'respins';
    case 'qualified_2_3':
      return pentru >= (2 / 3) * total ? 'adoptat' : 'respins';
  }
}

const OUTCOME_LABEL: Record<ItemOutcome, string> = {
  adoptat: 'ADOPTAT',
  respins: 'RESPINS',
  in_asteptare: 'FARA VOT',
};

/** Build a plain-text proces-verbal (legal minutes) of a concluded assembly.
 *  Romanian by design -- it is a legal document regardless of UI language. */
export function generateProcesVerbal(meeting: AgaMeeting): string {
  const lines: string[] = [];
  lines.push('PROCES-VERBAL AL ADUNARII GENERALE');
  lines.push(meeting.title);
  lines.push('');
  lines.push(`Data: ${formatDateLong(meeting.scheduled_at)}`);
  // Hyphen replaces em dash as the fallback separator (CLAUDE.md: no em dashes in code)
  lines.push(`Locul: ${meeting.scheduled_online ? 'Online' : meeting.location || '-'}`);
  lines.push(
    `Apartamente reprezentate: ${presentApartments(meeting)} din ${meeting.total_apartments} (${quorumPercent(meeting)}%)`,
  );
  lines.push(
    `Cvorum: ${isQuorumMet(meeting) ? 'întrunit' : 'neintrunit'} (necesar ${meeting.required_quorum_percent}%)`,
  );
  if (meeting.proxies.length > 0) {
    lines.push(`Procuri (împuterniciri) înregistrate: ${meeting.proxies.length}`);
  }
  lines.push('');
  lines.push('ORDINEA DE ZI SI HOTARARILE:');
  const ordered = [...meeting.agenda].sort((a, b) => a.sort_order - b.sort_order);
  ordered.forEach((item, i) => {
    const tally = itemTally(item, meeting.proxies);
    lines.push('');
    lines.push(`${i + 1}. ${item.title}`);
    if (item.description) lines.push(`   ${item.description}`);
    lines.push(`   Voturi: pentru ${tally.pentru}, contra ${tally.contra}, abtineri ${tally.abtinere}`);
    lines.push(`   Hotarare: ${OUTCOME_LABEL[itemOutcome(item, meeting)]}`);
  });
  lines.push('');
  lines.push('Intocmit prin platforma vecini.online, conform Legii 196/2018.');
  return lines.join('\n');
}
