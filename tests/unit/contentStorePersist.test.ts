import { describe, expect, it } from 'vitest';
import {
  migrateAnnouncementsState,
  seedAnnouncements,
} from '@/features/announcements/announcementsLogic';
import { migrateTicketsState, seedTickets } from '@/features/tickets/ticketLogic';
import { migrateThreadsState, seedThreads } from '@/features/discussions/discussionLogic';
import { DEMO_ANNOUNCEMENTS, DEMO_ASOCIATIE, DEMO_DISCUSSIONS, DEMO_TICKETS } from '@/shared/demo/demoData';

describe('migrateAnnouncementsState (T65)', () => {
  it('returns seed state when there is no prior persisted state', () => {
    expect(migrateAnnouncementsState(null)).toEqual(seedAnnouncements());
    expect(migrateAnnouncementsState(undefined)).toEqual(seedAnnouncements());
    expect(migrateAnnouncementsState({})).toEqual(seedAnnouncements());
  });

  it('preserves non-demo asociații and reseeds the demo asociație', () => {
    const old = {
      byAsociatie: {
        'asoc-other': [{ id: 'ann-x', title: 'Old', asociatie_id: 'asoc-other' }],
        [DEMO_ASOCIATIE.id]: [{ id: 'stale', title: 'Stale demo', asociatie_id: DEMO_ASOCIATIE.id }],
      },
    };
    const result = migrateAnnouncementsState(old);
    expect(result['asoc-other']).toEqual(old.byAsociatie['asoc-other']);
    expect(result[DEMO_ASOCIATIE.id]).toEqual(DEMO_ANNOUNCEMENTS);
  });

  it('demo seed is a fresh copy (not the same reference as DEMO_ANNOUNCEMENTS)', () => {
    const result = migrateAnnouncementsState(null);
    expect(result[DEMO_ASOCIATIE.id]).not.toBe(DEMO_ANNOUNCEMENTS);
    expect(result[DEMO_ASOCIATIE.id]).toEqual(DEMO_ANNOUNCEMENTS);
  });
});

describe('migrateTicketsState (T65)', () => {
  it('returns seed state when there is no prior persisted state', () => {
    expect(migrateTicketsState(null)).toEqual(seedTickets());
    expect(migrateTicketsState(undefined)).toEqual(seedTickets());
    expect(migrateTicketsState({})).toEqual(seedTickets());
  });

  it('preserves non-demo asociații and reseeds the demo asociație', () => {
    const old = {
      byAsociatie: {
        'asoc-other': [{ id: 'tk-x', title: 'Lift', asociatie_id: 'asoc-other' }],
        [DEMO_ASOCIATIE.id]: [{ id: 'stale', title: 'Stale', asociatie_id: DEMO_ASOCIATIE.id }],
      },
    };
    const result = migrateTicketsState(old);
    expect(result['asoc-other']).toEqual(old.byAsociatie['asoc-other']);
    expect(result[DEMO_ASOCIATIE.id]).toEqual(DEMO_TICKETS);
  });

  it('demo seed is a fresh copy (not the same reference as DEMO_TICKETS)', () => {
    const result = migrateTicketsState(null);
    expect(result[DEMO_ASOCIATIE.id]).not.toBe(DEMO_TICKETS);
    expect(result[DEMO_ASOCIATIE.id]).toEqual(DEMO_TICKETS);
  });
});

describe('migrateThreadsState (T65)', () => {
  it('returns seed state when there is no prior persisted state', () => {
    expect(migrateThreadsState(null)).toEqual(seedThreads());
    expect(migrateThreadsState(undefined)).toEqual(seedThreads());
    expect(migrateThreadsState({})).toEqual(seedThreads());
  });

  it('preserves non-demo asociații and reseeds the demo asociație', () => {
    const old = {
      byAsociatie: {
        'asoc-other': [{ id: 'dt-x', title: 'Parcare', asociatie_id: 'asoc-other', messages: [] }],
        [DEMO_ASOCIATIE.id]: [{ id: 'stale', title: 'Stale', asociatie_id: DEMO_ASOCIATIE.id, messages: [] }],
      },
    };
    const result = migrateThreadsState(old);
    expect(result['asoc-other']).toEqual(old.byAsociatie['asoc-other']);
    expect(result[DEMO_ASOCIATIE.id]).toEqual(DEMO_DISCUSSIONS);
  });

  it('demo seed is a fresh copy (not the same reference as DEMO_DISCUSSIONS)', () => {
    const result = migrateThreadsState(null);
    expect(result[DEMO_ASOCIATIE.id]).not.toBe(DEMO_DISCUSSIONS);
    expect(result[DEMO_ASOCIATIE.id]).toEqual(DEMO_DISCUSSIONS);
  });
});
