import { beforeEach, describe, expect, it } from 'vitest';
import type { Ticket } from '@/shared/types/domain';
import { useTicketsStore } from '@/features/tickets/ticketsStore';
import { hydrateTickets, submitTicket } from '@/features/tickets/ticketsApi';

// ticketsApi offline-path tests (T57).
// Key contracts:
//   - hydrateTickets: no-op when not configured
//   - submitTicket: prepends a well-formed ticket to the store
// replaceForAsociatie is also exercised directly.

const DEMO_ASOC = 'asoc-tkt';

const SEED: Ticket = {
  id: 't-1',
  asociatie_id: DEMO_ASOC,
  reporter_user_id: 'u-res',
  apartment_id: null,
  title: 'Lift broke',
  description: 'Lift stopped',
  category: 'lift',
  severity: 'high',
  location_scara: null,
  location_etaj: null,
  location_description: null,
  status: 'primit',
  assigned_to_user_id: null,
  sla_due_at: '2026-01-02T10:00:00.000Z',
  resolved_at: null,
  verified_at: null,
  resolution_notes: null,
  rating: null,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
};

beforeEach(() => {
  useTicketsStore.setState({ byAsociatie: { [DEMO_ASOC]: [{ ...SEED }] } });
});

describe('useTicketsStore — replaceForAsociatie', () => {
  it('replaces the ticket list for one asociație', () => {
    useTicketsStore.getState().replaceForAsociatie(DEMO_ASOC, []);
    expect(useTicketsStore.getState().byAsociatie[DEMO_ASOC]).toHaveLength(0);
  });

  it('does not touch other asociatii', () => {
    useTicketsStore.getState().replaceForAsociatie('other-asoc', []);
    expect(useTicketsStore.getState().byAsociatie[DEMO_ASOC]).toHaveLength(1);
  });
});

describe('hydrateTickets', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useTicketsStore.getState().byAsociatie[DEMO_ASOC];
    await hydrateTickets(DEMO_ASOC);
    expect(useTicketsStore.getState().byAsociatie[DEMO_ASOC]).toBe(before);
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useTicketsStore.getState().byAsociatie[DEMO_ASOC];
    await hydrateTickets('');
    expect(useTicketsStore.getState().byAsociatie[DEMO_ASOC]).toBe(before);
  });
});

describe('submitTicket', () => {
  it('prepends a new ticket to the store', () => {
    submitTicket(DEMO_ASOC, 'u-res', {
      title: 'Water leak',
      description: 'Dripping from ceiling',
      category: 'apa',
      severity: 'medium',
      location: 'Scara A',
    });
    const items = useTicketsStore.getState().byAsociatie[DEMO_ASOC];
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Water leak');
    expect(items[0].status).toBe('primit');
    expect(items[0].asociatie_id).toBe(DEMO_ASOC);
    expect(items[0].reporter_user_id).toBe('u-res');
  });

  it('sets location_description from input.location', () => {
    submitTicket(DEMO_ASOC, 'u-res', {
      title: 'Light out',
      description: 'Bulb burned',
      category: 'iluminat',
      severity: 'low',
      location: 'Holul intrare',
    });
    const ticket = useTicketsStore.getState().byAsociatie[DEMO_ASOC][0];
    expect(ticket.location_description).toBe('Holul intrare');
  });

  it('location_description is null when location is empty', () => {
    submitTicket(DEMO_ASOC, 'u-res', {
      title: 'No loc',
      description: 'Desc',
      category: 'altele',
      severity: 'low',
      location: '',
    });
    const ticket = useTicketsStore.getState().byAsociatie[DEMO_ASOC][0];
    expect(ticket.location_description).toBeNull();
  });

  it('keeps pre-existing tickets after submit', () => {
    submitTicket(DEMO_ASOC, 'u-res', {
      title: 'New one',
      description: 'x',
      category: 'altele',
      severity: 'low',
      location: '',
    });
    const items = useTicketsStore.getState().byAsociatie[DEMO_ASOC];
    expect(items.map((t) => t.title)).toContain('Lift broke');
    expect(items.map((t) => t.title)).toContain('New one');
  });

  it('sla_due_at is set based on severity', () => {
    submitTicket(DEMO_ASOC, 'u-res', {
      title: 'Critical',
      description: 'desc',
      category: 'electric',
      severity: 'critical',
      location: '',
    });
    const ticket = useTicketsStore.getState().byAsociatie[DEMO_ASOC][0];
    expect(ticket.sla_due_at).not.toBeNull();
    const sla = new Date(ticket.sla_due_at!);
    const created = new Date(ticket.created_at);
    expect(sla.getTime()).toBeGreaterThan(created.getTime());
  });
});
