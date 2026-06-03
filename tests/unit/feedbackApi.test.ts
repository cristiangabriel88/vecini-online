import { describe, it, expect, beforeEach } from 'vitest';
import { useFeedbackStore } from '@/features/feedback/feedbackStore';
import { hydrateFeedback, addFeedbackLive } from '@/features/feedback/feedbackApi';

const DEMO_ID = 'demo-asoc';

beforeEach(() => { useFeedbackStore.setState({ byAsociatie: { [DEMO_ID]: [] }, fetchError: null }); });

describe('feedbackApi — offline path', () => {
  it('hydrateFeedback is a no-op when unconfigured', async () => {
    await hydrateFeedback(DEMO_ID);
    expect(useFeedbackStore.getState().fetchError).toBeNull();
  });

  it('hydrateFeedback is a no-op when id is empty', async () => {
    await hydrateFeedback('');
    expect(useFeedbackStore.getState().byAsociatie[DEMO_ID]).toEqual([]);
  });

  it('addFeedbackLive prepends synchronously', () => {
    const item = { id: 'fb-t1', asociatie_id: DEMO_ID, user_id: 'u1', anonymous: false, body: 'Super aplicatie', sentiment: 'lauda' as const, created_at: '2026-06-01T00:00:00Z' };
    addFeedbackLive(DEMO_ID, item);
    expect(useFeedbackStore.getState().byAsociatie[DEMO_ID][0]).toMatchObject({ body: 'Super aplicatie' });
  });

  it('addFeedbackLive anonymous item has null user_id', () => {
    const item = { id: 'fb-t2', asociatie_id: null, user_id: null, anonymous: true, body: 'Idee buna', sentiment: 'idee' as const, created_at: '2026-06-01T00:00:00Z' };
    addFeedbackLive(DEMO_ID, item);
    expect(useFeedbackStore.getState().byAsociatie[DEMO_ID][0].user_id).toBeNull();
  });
});
