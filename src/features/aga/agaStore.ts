import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgaDecision, AgaMeeting, AgaProxy, AgaRsvp, MajorityRule } from '@/shared/types/domain';
import { useAuthStore } from '@/shared/store/authStore';
import {
  type AgasByAsociatie,
  agasForAsociatie,
  migrateAgasState,
  nextStatus,
  seedAgas,
} from './agaLogic';

interface AgaState {
  /** Assemblies per asociație, keyed by asociație id. */
  byAsociatie: AgasByAsociatie;
  /** Non-null when the last live fetch failed; null in demo/offline mode or after a successful fetch. */
  fetchError: string | null;
  setRsvp: (asociatieId: string, meetingId: string, rsvp: AgaRsvp) => void;
  castVote: (asociatieId: string, meetingId: string, itemId: string, decision: AgaDecision) => void;
  castProxyVote: (
    asociatieId: string,
    meetingId: string,
    proxyId: string,
    itemId: string,
    decision: AgaDecision,
  ) => void;
  advanceStatus: (asociatieId: string, meetingId: string) => void;
  addMeeting: (
    asociatieId: string,
    title: string,
    scheduledAt: string,
    location: string,
    online: boolean,
    totalApartments: number,
  ) => void;
  addAgendaItem: (
    asociatieId: string,
    meetingId: string,
    title: string,
    description: string,
    rule: MajorityRule,
  ) => void;
  addProxy: (asociatieId: string, meetingId: string, proxy: AgaProxy) => void;
  /** Replace the full list for one asociație (used by live hydration). */
  replaceForAsociatie: (asociatieId: string, meetings: AgaMeeting[]) => void;
  /** Set or clear the live-fetch error (called by the API layer). */
  setFetchError: (msg: string | null) => void;
  /** The assemblies for one asociație (stable reference). */
  forAsociatie: (asociatieId: string | null) => AgaMeeting[];
}

/** Apply a transform to one asociație's meeting list, returning a new map. */
function mapMeetings(
  byAsociatie: AgasByAsociatie,
  asociatieId: string,
  fn: (meetings: AgaMeeting[]) => AgaMeeting[],
): AgasByAsociatie {
  return { ...byAsociatie, [asociatieId]: fn(byAsociatie[asociatieId] ?? []) };
}

/** Apply a transform to a single meeting within one asociație's list. */
function mapMeeting(
  byAsociatie: AgasByAsociatie,
  asociatieId: string,
  meetingId: string,
  fn: (meeting: AgaMeeting) => AgaMeeting,
): AgasByAsociatie {
  return mapMeetings(byAsociatie, asociatieId, (meetings) =>
    meetings.map((m) => (m.id === meetingId ? fn(m) : m)),
  );
}

/**
 * Digital general assembly (F10) scoped per asociație (T190): the demo asociație
 * is seeded so the offline app is populated, and a convoked assembly lands only
 * in the active asociație's list. Persisted so a created assembly / RSVP / vote
 * survives reload; version bumps reseed the demo asociație so stale demo content
 * is refreshed. Live read/write against `agas` / `aga_agenda_items` /
 * `aga_attendees` / `aga_votes` under RLS is in `agaApi.ts`.
 */
export const useAgaStore = create<AgaState>()(
  persist(
    (set, get) => ({
      byAsociatie: seedAgas(),
      fetchError: null,

      setRsvp: (asociatieId, meetingId, rsvp) =>
        set((s) => ({
          byAsociatie: mapMeeting(s.byAsociatie, asociatieId, meetingId, (m) => ({ ...m, my_rsvp: rsvp })),
        })),

      castVote: (asociatieId, meetingId, itemId, decision) =>
        set((s) => ({
          byAsociatie: mapMeeting(s.byAsociatie, asociatieId, meetingId, (m) => ({
            ...m,
            agenda: m.agenda.map((a) => (a.id === itemId ? { ...a, my_vote: decision } : a)),
          })),
        })),

      castProxyVote: (asociatieId, meetingId, proxyId, itemId, decision) =>
        set((s) => ({
          byAsociatie: mapMeeting(s.byAsociatie, asociatieId, meetingId, (m) => ({
            ...m,
            proxies: m.proxies.map((p) =>
              p.id === proxyId ? { ...p, votes: { ...p.votes, [itemId]: decision } } : p,
            ),
          })),
        })),

      advanceStatus: (asociatieId, meetingId) =>
        set((s) => ({
          byAsociatie: mapMeeting(s.byAsociatie, asociatieId, meetingId, (m) => {
            const next = nextStatus(m.status);
            return next ? { ...m, status: next } : m;
          }),
        })),

      addMeeting: (asociatieId, title, scheduledAt, location, online, totalApartments) =>
        set((s) => ({
          byAsociatie: mapMeetings(s.byAsociatie, asociatieId, (meetings) => [
            ...meetings,
            {
              id: `aga-${Date.now()}`,
              asociatie_id: asociatieId,
              title: title.trim(),
              scheduled_at: scheduledAt,
              location: location.trim(),
              scheduled_online: online,
              required_quorum_percent: 50,
              status: 'convocata',
              total_apartments: totalApartments,
              represented_apartments: 0,
              my_rsvp: null,
              agenda: [],
              proxies: [],
            },
          ]),
        })),

      addAgendaItem: (asociatieId, meetingId, title, description, rule) =>
        set((s) => ({
          byAsociatie: mapMeeting(s.byAsociatie, asociatieId, meetingId, (m) => ({
            ...m,
            agenda: [
              ...m.agenda,
              {
                id: `agi-${Date.now()}`,
                aga_id: m.id,
                sort_order: m.agenda.length + 1,
                title: title.trim(),
                description: description.trim(),
                majority_rule: rule,
                votes: { pentru: 0, contra: 0, abtinere: 0 },
                my_vote: null,
              },
            ],
          })),
        })),

      addProxy: (asociatieId, meetingId, proxy) =>
        set((s) => ({
          byAsociatie: mapMeeting(s.byAsociatie, asociatieId, meetingId, (m) => ({
            ...m,
            proxies: [...m.proxies, proxy],
          })),
        })),

      replaceForAsociatie: (asociatieId, meetings) =>
        set((s) => ({ byAsociatie: { ...s.byAsociatie, [asociatieId]: meetings } })),

      setFetchError: (msg) => set({ fetchError: msg }),

      forAsociatie: (asociatieId) => agasForAsociatie(get().byAsociatie, asociatieId),
    }),
    {
      name: 'vecini.aga',
      version: 1,
      partialize: (s) => ({ byAsociatie: s.byAsociatie }),
      migrate: (persisted) => ({ byAsociatie: migrateAgasState(persisted) }),
    },
  ),
);

/** Hook: the assemblies for the currently active asociație. */
export function useAsociatieAgas(): AgaMeeting[] {
  const asociatieId = useAuthStore((s) => s.currentAsociatieId);
  return useAgaStore((s) => agasForAsociatie(s.byAsociatie, asociatieId));
}
