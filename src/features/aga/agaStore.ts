import { create } from 'zustand';
import type { AgaDecision, AgaMeeting, AgaRsvp, MajorityRule } from '@/shared/types/domain';
import { DEMO_AGAS } from '@/shared/demo/demoData';
import { nextStatus } from './agaLogic';

const clone = (meetings: AgaMeeting[]): AgaMeeting[] =>
  meetings.map((m) => ({ ...m, agenda: m.agenda.map((a) => ({ ...a, votes: { ...a.votes } })) }));

interface AgaState {
  meetings: AgaMeeting[];
  setRsvp: (meetingId: string, rsvp: AgaRsvp) => void;
  castVote: (meetingId: string, itemId: string, decision: AgaDecision) => void;
  advanceStatus: (meetingId: string) => void;
  addMeeting: (title: string, scheduledAt: string, location: string, online: boolean) => void;
  addAgendaItem: (meetingId: string, title: string, description: string, rule: MajorityRule) => void;
}

export const useAgaStore = create<AgaState>((set) => ({
  meetings: clone(DEMO_AGAS),

  setRsvp: (meetingId, rsvp) =>
    set((s) => ({
      meetings: s.meetings.map((m) => (m.id === meetingId ? { ...m, my_rsvp: rsvp } : m)),
    })),

  castVote: (meetingId, itemId, decision) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              agenda: m.agenda.map((a) => (a.id === itemId ? { ...a, my_vote: decision } : a)),
            }
          : m,
      ),
    })),

  advanceStatus: (meetingId) =>
    set((s) => ({
      meetings: s.meetings.map((m) => {
        if (m.id !== meetingId) return m;
        const next = nextStatus(m.status);
        return next ? { ...m, status: next } : m;
      }),
    })),

  addMeeting: (title, scheduledAt, location, online) =>
    set((s) => ({
      meetings: [
        ...s.meetings,
        {
          id: `aga-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          title: title.trim(),
          scheduled_at: scheduledAt,
          location: location.trim(),
          scheduled_online: online,
          required_quorum_percent: 50,
          status: 'convocata',
          total_apartments: 40,
          represented_apartments: 0,
          my_rsvp: null,
          agenda: [],
        },
      ],
    })),

  addAgendaItem: (meetingId, title, description, rule) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? {
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
            }
          : m,
      ),
    })),
}));
