import { create } from 'zustand';
import { DEMO_POLLS, DEMO_POLL_OPTIONS, DEMO_VOTE_COUNTS } from '@/shared/demo/demoData';

interface PollsState {
  counts: Record<string, number>;
  myVotes: Record<string, string>; // pollId -> optionId
  vote: (pollId: string, optionId: string) => void;
}

export const usePollsStore = create<PollsState>((set, get) => ({
  counts: { ...DEMO_VOTE_COUNTS },
  myVotes: {},
  vote: (pollId, optionId) => {
    if (get().myVotes[pollId]) return;
    set((s) => ({
      counts: { ...s.counts, [optionId]: (s.counts[optionId] ?? 0) + 1 },
      myVotes: { ...s.myVotes, [pollId]: optionId },
    }));
  },
}));

export const polls = DEMO_POLLS;
export const pollOptions = DEMO_POLL_OPTIONS;
