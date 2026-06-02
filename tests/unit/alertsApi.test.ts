import { beforeEach, describe, expect, it } from 'vitest';
import type { Alert } from '@/shared/types/domain';
import { useAlertsStore } from '@/features/alerts/alertsStore';
import { hydrateAlerts, sendAlert } from '@/features/alerts/alertsApi';

// alertsApi offline-path tests (T184).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydrateAlerts: no-op when not configured (store untouched)
//   - sendAlert: prepends a well-formed alert and returns it

const DEMO_ASOC = 'asoc-test';

const SEED: Alert[] = [
  {
    id: 'al-seed',
    asociatie_id: DEMO_ASOC,
    sender_user_id: 'u-admin',
    title: 'First',
    body: 'First body',
    kind: 'emergency',
    sent_at: '2026-01-01T10:00:00.000Z',
    recipient_count: 5,
  },
];

beforeEach(() => {
  useAlertsStore.setState({ byAsociatie: { [DEMO_ASOC]: [...SEED] }, fetchError: null });
});

describe('hydrateAlerts', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useAlertsStore.getState().byAsociatie[DEMO_ASOC];
    await hydrateAlerts(DEMO_ASOC);
    expect(useAlertsStore.getState().byAsociatie[DEMO_ASOC]).toBe(before);
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useAlertsStore.getState().byAsociatie[DEMO_ASOC];
    await hydrateAlerts('');
    expect(useAlertsStore.getState().byAsociatie[DEMO_ASOC]).toBe(before);
  });
});

describe('sendAlert', () => {
  it('prepends a new alert to the store and returns it', () => {
    const sent = sendAlert(DEMO_ASOC, 'u-admin', { title: 'Gaz', body: 'Evacuați' }, 9);
    const items = useAlertsStore.getState().byAsociatie[DEMO_ASOC];
    expect(items).toHaveLength(2);
    expect(items[0]).toBe(sent);
    expect(items[0].title).toBe('Gaz');
    expect(items[0].recipient_count).toBe(9);
    expect(items[0].kind).toBe('emergency');
    expect(items[0].sender_user_id).toBe('u-admin');
  });

  it('keeps pre-existing alerts after a send', () => {
    sendAlert(DEMO_ASOC, 'u-admin', { title: 'Second', body: 'x' }, 3);
    const titles = useAlertsStore.getState().byAsociatie[DEMO_ASOC].map((a) => a.title);
    expect(titles).toContain('First');
    expect(titles).toContain('Second');
  });

  it('does not touch other asociatii', () => {
    sendAlert('other-asoc', 'u-admin', { title: 'Elsewhere', body: 'x' }, 1);
    expect(useAlertsStore.getState().byAsociatie[DEMO_ASOC]).toHaveLength(1);
    expect(useAlertsStore.getState().byAsociatie['other-asoc']).toHaveLength(1);
  });
});
