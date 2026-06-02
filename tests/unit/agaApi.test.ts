import { beforeEach, describe, expect, it } from 'vitest';
import { useAgaStore } from '@/features/aga/agaStore';
import {
  addAgendaItem,
  advanceStatus,
  castProxyVote,
  castVote,
  convokeMeeting,
  hydrateAgas,
  recordProxy,
  setRsvp,
} from '@/features/aga/agaApi';
import { seedAgas } from '@/features/aga/agaLogic';
import { DEMO_ASOCIATIE } from '@/shared/demo/demoData';

// agaApi offline-path tests (T190).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Each write applies
// to the per-asociație store synchronously and must not throw when offline. Key
// contracts:
//   - hydrateAgas: no-op when not configured / empty id (store untouched)
//   - the writes update the active asociație's list (convoke, agenda, RSVP,
//     vote, proxy, proxy vote, advance) and stay offline-safe.

const ASOC = DEMO_ASOCIATIE.id;

beforeEach(() => {
  useAgaStore.setState({ byAsociatie: seedAgas(), fetchError: null });
});

const liveMeeting = () =>
  useAgaStore
    .getState()
    .forAsociatie(ASOC)
    .find((m) => m.status === 'in_desfasurare')!;

describe('hydrateAgas', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useAgaStore.getState().byAsociatie;
    await hydrateAgas(ASOC, 'u-res');
    expect(useAgaStore.getState().byAsociatie).toBe(before);
    expect(useAgaStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useAgaStore.getState().byAsociatie;
    await hydrateAgas('', 'u-res');
    expect(useAgaStore.getState().byAsociatie).toBe(before);
  });
});

describe('convokeMeeting + addAgendaItem', () => {
  it('adds a convoked assembly with the passed apartment count, then an item', () => {
    convokeMeeting(ASOC, 'AGA extraordinară 2026', '2026-09-01T18:00', 'Sala A', false, 33);
    const list = useAgaStore.getState().forAsociatie(ASOC);
    const created = list.find((m) => m.title === 'AGA extraordinară 2026')!;
    expect(created.status).toBe('convocata');
    expect(created.total_apartments).toBe(33);
    expect(created.proxies).toEqual([]);

    addAgendaItem(ASOC, created.id, 'Aprobare buget', 'Detalii', 'absolute');
    const after = useAgaStore.getState().forAsociatie(ASOC).find((m) => m.id === created.id)!;
    expect(after.agenda).toHaveLength(1);
    expect(after.agenda[0].majority_rule).toBe('absolute');
  });
});

describe('setRsvp + castVote', () => {
  it('records the resident RSVP and an item vote offline', () => {
    const m = liveMeeting();
    setRsvp(ASOC, m.id, 'prezent', 'u-res', null);
    expect(liveMeeting().my_rsvp).toBe('prezent');

    const itemId = m.agenda[0].id;
    castVote(ASOC, m.id, itemId, 'pentru', null);
    const voted = liveMeeting().agenda.find((a) => a.id === itemId)!;
    expect(voted.my_vote).toBe('pentru');
  });
});

describe('recordProxy + castProxyVote', () => {
  it('records a procură distinctly and a proxy vote on its behalf', () => {
    const m = liveMeeting();
    const beforeProxies = m.proxies.length;
    recordProxy(ASOC, m.id, {
      id: 'agp-test',
      grantor_apartment: 'Ap. 30',
      proxy_holder: 'Maria Ionescu',
      document_name: 'procura.pdf',
      document_url: null,
      votes: {},
    });
    const withProxy = liveMeeting();
    expect(withProxy.proxies).toHaveLength(beforeProxies + 1);

    const itemId = m.agenda[0].id;
    castProxyVote(ASOC, m.id, 'agp-test', itemId, 'contra', null);
    const proxy = liveMeeting().proxies.find((p) => p.id === 'agp-test')!;
    expect(proxy.votes[itemId]).toBe('contra');
  });
});

describe('advanceStatus', () => {
  it('walks the lifecycle forward', () => {
    const m = liveMeeting();
    advanceStatus(ASOC, m.id);
    const after = useAgaStore.getState().forAsociatie(ASOC).find((x) => x.id === m.id)!;
    expect(after.status).toBe('incheiata');
  });
});
