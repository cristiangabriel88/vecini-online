import type {
  AgaAgendaItem,
  AgaDecision,
  AgaMeeting,
  AgaProxy,
  AgaRsvp,
  AgaStatus,
  MajorityRule,
} from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { useAgaStore } from './agaStore';

/* Dual-mode AGA repository (F10, T190). The zustand store is the synchronous
   source of truth the page reads; these functions apply each change there and,
   when a backend is configured, mirror it to `agas` / `aga_agenda_items` /
   `aga_attendees` / `aga_votes` under RLS (members read + record their own
   RSVP/proxy/vote, comitet convoke + manage the agenda + advance the status).

   The demo/offline store stays the default when Supabase is absent: every write
   updates the store first, then best-effort mirrors live, so demo and offline
   keep working with no backend. */

/** UI statuses we surface; rows in other DB states (draft/anulata) are skipped. */
const UI_STATUSES: ReadonlySet<string> = new Set(['convocata', 'in_desfasurare', 'incheiata']);
const MAJORITY_RULES: ReadonlySet<string> = new Set(['simple', 'absolute', 'qualified_2_3']);

interface AgaRow {
  id: string;
  asociatie_id: string;
  title: string | null;
  scheduled_at: string | null;
  location: string | null;
  scheduled_online: boolean | null;
  required_quorum_percent: number | null;
  status: string;
}
interface AgendaRow {
  id: string;
  aga_id: string;
  sort_order: number | null;
  title: string | null;
  description: string | null;
  decision_type: string | null;
}
interface AttendeeRow {
  id: string;
  aga_id: string;
  user_id: string | null;
  present: boolean | null;
  is_proxy: boolean | null;
  proxy_document_path: string | null;
}
interface VoteRow {
  aga_id: string;
  agenda_item_id: string | null;
  decision: string | null;
}

/** Coerce a free-text decision_type to a known majority rule (defaults simple). */
function toMajorityRule(value: string | null): MajorityRule {
  return value && MAJORITY_RULES.has(value) ? (value as MajorityRule) : 'simple';
}

/** Assemble the client meeting model from the four DB row sets. */
function assembleMeetings(
  agas: AgaRow[],
  agenda: AgendaRow[],
  attendees: AttendeeRow[],
  votes: VoteRow[],
  currentUserId: string,
): AgaMeeting[] {
  return agas
    .filter((a) => UI_STATUSES.has(a.status))
    .map((a) => {
      const items: AgaAgendaItem[] = agenda
        .filter((g) => g.aga_id === a.id)
        .sort((x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0))
        .map((g) => {
          const counts = { pentru: 0, contra: 0, abtinere: 0 };
          for (const v of votes) {
            if (v.agenda_item_id === g.id && v.decision && v.decision in counts) {
              counts[v.decision as AgaDecision] += 1;
            }
          }
          return {
            id: g.id,
            aga_id: a.id,
            sort_order: g.sort_order ?? 0,
            title: g.title ?? '',
            description: g.description ?? '',
            majority_rule: toMajorityRule(g.decision_type),
            votes: counts,
            // The aggregate already contains the current user's ballot; my_vote
            // stays null on the live path so itemTally does not double-count it.
            my_vote: null,
          };
        });
      const present = attendees.filter((t) => t.aga_id === a.id);
      const proxies: AgaProxy[] = present
        .filter((t) => t.is_proxy)
        .map((t) => ({
          id: t.id,
          grantor_apartment: '',
          proxy_holder: '',
          document_name: t.proxy_document_path,
          document_url: null,
          votes: {},
        }));
      const mine = present.find((t) => t.user_id === currentUserId);
      const myRsvp: AgaRsvp = mine ? (mine.is_proxy ? 'procura' : mine.present ? 'prezent' : 'absent') : null;
      return {
        id: a.id,
        asociatie_id: a.asociatie_id,
        title: a.title ?? '',
        scheduled_at: a.scheduled_at ?? '',
        location: a.location ?? '',
        scheduled_online: a.scheduled_online ?? false,
        required_quorum_percent: a.required_quorum_percent ?? 50,
        status: a.status as AgaStatus,
        total_apartments: 0,
        represented_apartments: present.filter((t) => !t.is_proxy && t.present).length,
        my_rsvp: myRsvp,
        agenda: items,
        proxies,
      };
    });
}

/** Hydrate one asociație's assemblies from the backend, when configured. The
 *  demo store is the source of truth if the read fails or the backend is
 *  absent. */
export async function hydrateAgas(asociatieId: string, currentUserId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useAgaStore.getState();
  try {
    const { data: agas, error } = await supabase
      .from('agas')
      .select(
        'id, asociatie_id, title, scheduled_at, location, scheduled_online, required_quorum_percent, status',
      )
      .eq('asociatie_id', asociatieId)
      .order('scheduled_at', { ascending: false });
    if (error || !agas) {
      reportError(error ?? new Error('no data'), { source: 'agaApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    const agaIds = agas.map((a) => a.id);
    let agenda: AgendaRow[] = [];
    let attendees: AttendeeRow[] = [];
    let votes: VoteRow[] = [];
    if (agaIds.length > 0) {
      const [agendaRes, attendeeRes, voteRes] = await Promise.all([
        supabase.from('aga_agenda_items').select('id, aga_id, sort_order, title, description, decision_type').in('aga_id', agaIds),
        supabase.from('aga_attendees').select('id, aga_id, user_id, present, is_proxy, proxy_document_path').in('aga_id', agaIds),
        supabase.from('aga_votes').select('aga_id, agenda_item_id, decision').in('aga_id', agaIds),
      ]);
      if (agendaRes.error || attendeeRes.error || voteRes.error) {
        reportError(agendaRes.error ?? attendeeRes.error ?? voteRes.error ?? new Error('no data'), {
          source: 'agaApi.hydrateChildren',
        });
        store.setFetchError('load');
        return;
      }
      agenda = (agendaRes.data ?? []) as AgendaRow[];
      attendees = (attendeeRes.data ?? []) as AttendeeRow[];
      votes = (voteRes.data ?? []) as VoteRow[];
    }
    store.setFetchError(null);
    store.replaceForAsociatie(
      asociatieId,
      assembleMeetings(agas as AgaRow[], agenda, attendees, votes, currentUserId),
    );
  } catch (err) {
    reportError(err, { source: 'agaApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Convoke an assembly: stores it, then mirrors an `agas` insert when configured. */
export function convokeMeeting(
  asociatieId: string,
  title: string,
  scheduledAt: string,
  location: string,
  online: boolean,
  totalApartments: number,
): void {
  const store = useAgaStore.getState();
  store.addMeeting(asociatieId, title, scheduledAt, location, online, totalApartments);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('agas').insert({
          asociatie_id: asociatieId,
          title: title.trim(),
          scheduled_at: scheduledAt,
          location: location.trim(),
          scheduled_online: online,
          required_quorum_percent: 50,
          status: 'convocata',
        });
      } catch (err) {
        reportError(err, { source: 'agaApi.convoke' });
      }
    })();
  }
}

/** Add an agenda item: stores it, then mirrors an `aga_agenda_items` insert. */
export function addAgendaItem(
  asociatieId: string,
  meetingId: string,
  title: string,
  description: string,
  rule: MajorityRule,
): void {
  const store = useAgaStore.getState();
  const before = store.forAsociatie(asociatieId).find((m) => m.id === meetingId);
  const sortOrder = (before?.agenda.length ?? 0) + 1;
  store.addAgendaItem(asociatieId, meetingId, title, description, rule);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('aga_agenda_items').insert({
          aga_id: meetingId,
          sort_order: sortOrder,
          title: title.trim(),
          description: description.trim(),
          decision_type: rule,
        });
      } catch (err) {
        reportError(err, { source: 'agaApi.addAgendaItem' });
      }
    })();
  }
}

/** Record the current resident's RSVP: stores it, then upserts their own
 *  `aga_attendees` row when configured (the self-manage-attendance policy). */
export function setRsvp(
  asociatieId: string,
  meetingId: string,
  rsvp: AgaRsvp,
  userId: string,
  apartmentId: string | null,
): void {
  const store = useAgaStore.getState();
  store.setRsvp(asociatieId, meetingId, rsvp);
  if (isSupabaseConfigured && rsvp) {
    void (async () => {
      try {
        await supabase.from('aga_attendees').insert({
          aga_id: meetingId,
          user_id: userId,
          apartment_id: apartmentId,
          present: rsvp === 'prezent',
          is_proxy: rsvp === 'procura',
        });
      } catch (err) {
        reportError(err, { source: 'agaApi.setRsvp' });
      }
    })();
  }
}

/** Cast the current resident's vote on an item: stores it, then inserts into
 *  `aga_votes` when configured and the voter is linked to an apartment. */
export function castVote(
  asociatieId: string,
  meetingId: string,
  itemId: string,
  decision: AgaDecision,
  apartmentId: string | null,
): void {
  const store = useAgaStore.getState();
  store.castVote(asociatieId, meetingId, itemId, decision);
  if (isSupabaseConfigured && apartmentId) {
    void (async () => {
      try {
        await supabase.from('aga_votes').insert({
          aga_id: meetingId,
          agenda_item_id: itemId,
          apartment_id: apartmentId,
          decision,
          weight: 1,
        });
      } catch (err) {
        reportError(err, { source: 'agaApi.castVote' });
      }
    })();
  }
}

/** Cast a vote on a proxied apartment's behalf: stores it, then inserts a
 *  distinct `aga_votes` row when configured. */
export function castProxyVote(
  asociatieId: string,
  meetingId: string,
  proxyId: string,
  itemId: string,
  decision: AgaDecision,
  proxyApartmentId: string | null,
): void {
  const store = useAgaStore.getState();
  store.castProxyVote(asociatieId, meetingId, proxyId, itemId, decision);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('aga_votes').insert({
          aga_id: meetingId,
          agenda_item_id: itemId,
          apartment_id: proxyApartmentId,
          decision,
          weight: 1,
        });
      } catch (err) {
        reportError(err, { source: 'agaApi.castProxyVote' });
      }
    })();
  }
}

/** Advance an assembly's status: stores it, then mirrors an `agas` update. */
export function advanceStatus(asociatieId: string, meetingId: string): void {
  const store = useAgaStore.getState();
  store.advanceStatus(asociatieId, meetingId);
  const updated = store.forAsociatie(asociatieId).find((m) => m.id === meetingId);
  if (isSupabaseConfigured && updated) {
    void (async () => {
      try {
        await supabase.from('agas').update({ status: updated.status }).eq('id', meetingId);
      } catch (err) {
        reportError(err, { source: 'agaApi.advanceStatus' });
      }
    })();
  }
}

/** Record a procură (proxy) designation: stores it, then mirrors a proxy
 *  `aga_attendees` row when configured. */
export function recordProxy(asociatieId: string, meetingId: string, proxy: AgaProxy): void {
  const store = useAgaStore.getState();
  store.addProxy(asociatieId, meetingId, proxy);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('aga_attendees').insert({
          aga_id: meetingId,
          present: true,
          is_proxy: true,
          proxy_document_path: proxy.document_name,
        });
      } catch (err) {
        reportError(err, { source: 'agaApi.recordProxy' });
      }
    })();
  }
}
