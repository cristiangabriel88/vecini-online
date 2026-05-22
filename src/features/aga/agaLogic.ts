import type { AgaAgendaItem, AgaMeeting } from '@/shared/types/domain';
import { formatDateLong } from '@/shared/lib/format';

/** A meeting needs a title and a parseable scheduled date. */
export function isValidMeeting(title: string, scheduledAt: string): boolean {
  return title.trim().length > 0 && !Number.isNaN(Date.parse(scheduledAt));
}

/** An agenda item needs a title. */
export function isValidAgendaItem(title: string): boolean {
  return title.trim().length > 0;
}

/** Apartments represented, counting the current demo apartment when it is
 *  present or has given a proxy. */
export function presentApartments(meeting: AgaMeeting): number {
  const mine = meeting.my_rsvp === 'prezent' || meeting.my_rsvp === 'procura' ? 1 : 0;
  return meeting.represented_apartments + mine;
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

/** Vote counts for an item, folding in the current apartment's own vote. */
export function itemTally(item: AgaAgendaItem): ItemTally {
  const pentru = item.votes.pentru + (item.my_vote === 'pentru' ? 1 : 0);
  const contra = item.votes.contra + (item.my_vote === 'contra' ? 1 : 0);
  const abtinere = item.votes.abtinere + (item.my_vote === 'abtinere' ? 1 : 0);
  return { pentru, contra, abtinere, total: pentru + contra + abtinere };
}

/** Each option as a whole-number percent of the votes cast on the item. */
export function itemPercentages(item: AgaAgendaItem): Omit<ItemTally, 'total'> {
  const { pentru, contra, abtinere, total } = itemTally(item);
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return { pentru: pct(pentru), contra: pct(contra), abtinere: pct(abtinere) };
}

export type ItemOutcome = 'adoptat' | 'respins' | 'in_asteptare';

/** Outcome of an agenda item under its majority rule, requiring quorum.
 *  Returns `in_asteptare` while no votes have been cast. */
export function itemOutcome(item: AgaAgendaItem, meeting: AgaMeeting): ItemOutcome {
  const { pentru, contra, total } = itemTally(item);
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

const STATUS_RANK: Record<AgaMeeting['status'], number> = {
  in_desfasurare: 0,
  convocata: 1,
  incheiata: 2,
};

/** Meetings ordered for display: in-progress first, then upcoming soonest-first,
 *  then concluded most-recent-first. */
export function sortMeetings(meetings: AgaMeeting[]): AgaMeeting[] {
  return [...meetings].sort((a, b) => {
    if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) {
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    }
    const ta = Date.parse(a.scheduled_at);
    const tb = Date.parse(b.scheduled_at);
    return a.status === 'incheiata' ? tb - ta : ta - tb;
  });
}

/** The next status in the convocata → in_desfasurare → incheiata lifecycle,
 *  or null when already concluded. */
export function nextStatus(status: AgaMeeting['status']): AgaMeeting['status'] | null {
  if (status === 'convocata') return 'in_desfasurare';
  if (status === 'in_desfasurare') return 'incheiata';
  return null;
}

const OUTCOME_LABEL: Record<ItemOutcome, string> = {
  adoptat: 'ADOPTAT',
  respins: 'RESPINS',
  in_asteptare: 'FĂRĂ VOT',
};

/** Build a plain-text proces-verbal (legal minutes) of a concluded assembly.
 *  Romanian by design — it is a legal document regardless of UI language. */
export function generateProcesVerbal(meeting: AgaMeeting): string {
  const lines: string[] = [];
  lines.push('PROCES-VERBAL AL ADUNĂRII GENERALE');
  lines.push(meeting.title);
  lines.push('');
  lines.push(`Data: ${formatDateLong(meeting.scheduled_at)}`);
  lines.push(`Locul: ${meeting.scheduled_online ? 'Online' : meeting.location || '—'}`);
  lines.push(
    `Apartamente reprezentate: ${presentApartments(meeting)} din ${meeting.total_apartments} (${quorumPercent(meeting)}%)`,
  );
  lines.push(
    `Cvorum: ${isQuorumMet(meeting) ? 'întrunit' : 'neîntrunit'} (necesar ${meeting.required_quorum_percent}%)`,
  );
  lines.push('');
  lines.push('ORDINEA DE ZI ȘI HOTĂRÂRILE:');
  const ordered = [...meeting.agenda].sort((a, b) => a.sort_order - b.sort_order);
  ordered.forEach((item, i) => {
    const tally = itemTally(item);
    lines.push('');
    lines.push(`${i + 1}. ${item.title}`);
    if (item.description) lines.push(`   ${item.description}`);
    lines.push(`   Voturi: pentru ${tally.pentru}, contra ${tally.contra}, abțineri ${tally.abtinere}`);
    lines.push(`   Hotărâre: ${OUTCOME_LABEL[itemOutcome(item, meeting)]}`);
  });
  lines.push('');
  lines.push('Întocmit prin platforma vecini.online, conform Legii 196/2018.');
  return lines.join('\n');
}
