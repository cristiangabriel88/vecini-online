import { describe, it, expect, beforeEach } from 'vitest';
import type { Apartment } from '@/shared/types/domain';
import { emitBreachResidentNotice } from '@/features/notifications/notificationFanout';
import { useNotificationStore } from '@/shared/store/notificationStore';
import type { BreachRecord } from '@/features/gdpr/breachLogic';

const BASE_NOW = 1_700_000_000_000;

function makeBreach(overrides: Partial<BreachRecord> = {}): BreachRecord {
  return {
    id: 'brk-1',
    asociatie_id: 'asoc-1',
    title: 'Scurgere date locatari',
    description: 'Date de contact expuse accidental.',
    nature: ['confidentiality'],
    discovered_at: '2026-06-01T10:00:00.000Z',
    occurred_at: null,
    data_categories: ['contact'],
    affected_count: 10,
    risk: 'high',
    factors: { sensitiveData: true, largeScale: false, identifiable: true, mitigated: false },
    consequences: 'Consecinte posibile.',
    measures: 'Acces revocat, parole resetate.',
    status: 'notificat',
    authority_notified_at: '2026-06-01T12:00:00.000Z',
    subjects_notified_at: null,
    reported_by: 'Admin Test',
    created_at: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeApartment(id: string, claimedUserIds: (string | null)[]): Apartment {
  return {
    id,
    asociatie_id: 'asoc-1',
    scara: 'A',
    etaj: 1,
    numar_apartament: id,
    suprafata_utila: 60,
    cota_parte_indiviza: 0.04,
    numar_persoane: claimedUserIds.length,
    persons: claimedUserIds.map((uid, i) => ({
      id: `pe-${id}-${i}`,
      name: `Persoana ${i}`,
      role: 'proprietar',
      is_primary: i === 0,
      claimed_user_id: uid,
    })),
    proprietar_principal_name: 'Test',
    is_active: true,
    notes: null,
    created_at: '',
    updated_at: '',
  };
}

describe('emitBreachResidentNotice', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  it('emits breach.resident_notice to each claimed holder', () => {
    const apts = [makeApartment('ap-1', ['u-res1']), makeApartment('ap-2', ['u-res2'])];
    emitBreachResidentNotice(makeBreach(), apts, 'u-admin', BASE_NOW);
    const ns = useNotificationStore.getState().notifications;
    expect(ns).toHaveLength(2);
    expect(ns.every((n) => n.kind === 'breach.resident_notice')).toBe(true);
    expect(ns.map((n) => n.userId).sort()).toEqual(['u-res1', 'u-res2']);
  });

  it('sets priority to urgent', () => {
    const apts = [makeApartment('ap-1', ['u-res1'])];
    emitBreachResidentNotice(makeBreach(), apts, 'u-admin', BASE_NOW);
    const n = useNotificationStore.getState().notifications[0];
    expect(n.priority).toBe('urgent');
  });

  it('stores breach id and title in notification data', () => {
    const breach = makeBreach({ id: 'brk-abc', title: 'Scurgere date' });
    const apts = [makeApartment('ap-1', ['u-res1'])];
    emitBreachResidentNotice(breach, apts, 'u-admin', BASE_NOW);
    const n = useNotificationStore.getState().notifications[0];
    expect(n.data.breachId).toBe('brk-abc');
    expect(n.data.title).toBe('Scurgere date');
  });

  it('links to /app/datele-mele', () => {
    const apts = [makeApartment('ap-1', ['u-res1'])];
    emitBreachResidentNotice(makeBreach(), apts, 'u-admin', BASE_NOW);
    expect(useNotificationStore.getState().notifications[0].link).toBe('/app/datele-mele');
  });

  it('excludes the actor (selfUserId) from recipients', () => {
    const apts = [makeApartment('ap-1', ['u-admin']), makeApartment('ap-2', ['u-res1'])];
    emitBreachResidentNotice(makeBreach(), apts, 'u-admin', BASE_NOW);
    const ns = useNotificationStore.getState().notifications;
    expect(ns).toHaveLength(1);
    expect(ns[0].userId).toBe('u-res1');
  });

  it('skips when no apartments are provided', () => {
    emitBreachResidentNotice(makeBreach(), [], 'u-admin', BASE_NOW);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('skips when no apartment has a claimed_user_id', () => {
    const apts = [makeApartment('ap-1', [null]), makeApartment('ap-2', [null])];
    emitBreachResidentNotice(makeBreach(), apts, 'u-admin', BASE_NOW);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('deduplicates recipients (same user in multiple apartments)', () => {
    const apts = [
      makeApartment('ap-1', ['u-res1']),
      makeApartment('ap-2', ['u-res1']),
      makeApartment('ap-3', ['u-res2']),
    ];
    emitBreachResidentNotice(makeBreach(), apts, 'u-admin', BASE_NOW);
    const ns = useNotificationStore.getState().notifications;
    expect(ns).toHaveLength(2);
    expect(ns.map((n) => n.userId).sort()).toEqual(['u-res1', 'u-res2']);
  });

  it('sets the correct asociatieId on each notification', () => {
    const apts = [makeApartment('ap-1', ['u-res1'])];
    emitBreachResidentNotice(makeBreach({ asociatie_id: 'asoc-99' }), apts, 'u-admin', BASE_NOW);
    expect(useNotificationStore.getState().notifications[0].asociatieId).toBe('asoc-99');
  });

  it('is offline-safe (no Supabase call needed for store emit)', () => {
    const apts = [makeApartment('ap-1', ['u-res1'])];
    expect(() => emitBreachResidentNotice(makeBreach(), apts, 'u-admin', BASE_NOW)).not.toThrow();
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });
});

describe('breach audit actions in AUDIT_ACTIONS', () => {
  it('includes breach.authority_notified', async () => {
    const { AUDIT_ACTIONS } = await import('@/features/audit/auditLogic');
    expect(AUDIT_ACTIONS).toContain('breach.authority_notified');
  });

  it('includes breach.residents_notified', async () => {
    const { AUDIT_ACTIONS } = await import('@/features/audit/auditLogic');
    expect(AUDIT_ACTIONS).toContain('breach.residents_notified');
  });

  it('includes breach.closed', async () => {
    const { AUDIT_ACTIONS } = await import('@/features/audit/auditLogic');
    expect(AUDIT_ACTIONS).toContain('breach.closed');
  });
});

describe('buildBreachResidentNoticeNotification', () => {
  it('builds a breach.resident_notice notification with correct fields', async () => {
    const { buildBreachResidentNoticeNotification } = await import('@/features/notifications/notificationLogic');
    const n = buildBreachResidentNoticeNotification({
      recipientUserId: 'u-1',
      asociatieId: 'asoc-1',
      breachId: 'brk-1',
      breachTitle: 'Test breach',
      now: BASE_NOW,
    });
    expect(n.kind).toBe('breach.resident_notice');
    expect(n.userId).toBe('u-1');
    expect(n.asociatieId).toBe('asoc-1');
    expect(n.priority).toBe('urgent');
    expect(n.link).toBe('/app/datele-mele');
    expect(n.data.breachId).toBe('brk-1');
    expect(n.data.title).toBe('Test breach');
  });
});
