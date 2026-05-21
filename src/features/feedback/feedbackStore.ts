import { create } from 'zustand';
import type { FeedbackSentiment, PlatformFeedback } from '@/shared/types/domain';
import { DEMO_FEEDBACK } from '@/shared/demo/demoData';

interface NewFeedback {
  body: string;
  sentiment: FeedbackSentiment;
  anonymous: boolean;
}

interface FeedbackState {
  items: PlatformFeedback[];
  add: (input: NewFeedback) => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  items: [...DEMO_FEEDBACK],
  add: ({ body, sentiment, anonymous }) =>
    set((s) => ({
      items: [
        {
          id: `fb-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          user_id: anonymous ? null : 'u-res',
          anonymous,
          body: body.trim(),
          sentiment,
          created_at: new Date().toISOString(),
        },
        ...s.items,
      ],
    })),
}));
