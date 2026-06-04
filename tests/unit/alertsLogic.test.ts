import { describe, expect, it } from 'vitest';
import type { Apartment } from '@/shared/types/domain';
import {
  ALERT_KIND,
  ALERT_PRIORITY,
  addAlertIn,
  alertsForAsociatie,
  isSendableAlert,
  migrateAlertsState,
  newAlert,
  recipientCount,
  seedAlerts,
  shouldDeliverAlert,
} from '@/features/alerts/alertsLogic';
import { defaultNotifEmailPrefs, type NotifEmailPrefs } from '@/shared/lib/notifPrefsLogic';
import { DEMO_ALERTS, DEMO_APARTMENTS, DEMO_ASOCIATIE } from '@/shared/demo/demoData';

function apt(id: string, personCount: number, is_active = true): Apartment {
  return {
    id,
    asociatie_id: 'asoc-x',
    scara: 'A',
    etaj: 0,
    numar_apartament: id,
    suprafata_utila: 50,
    cota_parte_indiviza: 0.04,
    numar_persoane: personCount,
    persons: Array.from({ length: personCount }, (_, i) => ({
      id: `${id}-p${i}`,
      name: `Person ${i}`,
      role: 'locatar',
      is_primary: i === 0,
    })),
    proprietar_principal_name: 'Person 0',
    is_active,
    notes: null,
    created_at: '',
    updated_at: '',
  };
}

describe('alertsLogic', () => {
  it('seeds the demo asociație with the seeded alerts', () => {
    const seed = seedAlerts();
    expect(seed[DEMO_ASOCIATIE.id]).toEqual(DEMO_ALERTS);
  });

  it('returns the stored alerts for a known asociație', () => {
    const seed = seedAlerts();
    expect(alertsForAsociatie(seed, DEMO_ASOCIATIE.id)).toEqual(DEMO_ALERTS);
  });

  it('returns an empty list for an unknown or null asociație', () => {
    const seed = seedAlerts();
    expect(alertsForAsociatie(seed, 'asoc-unknown')).toEqual([]);
    expect(alertsForAsociatie(seed, null)).toEqual([]);
  });

  it('returns a stable reference for the empty default (no needless re-renders)', () => {
    const seed = seedAlerts();
    expect(alertsForAsociatie(seed, 'x')).toBe(alertsForAsociatie(seed, 'y'));
    expect(alertsForAsociatie(seed, null)).toBe(alertsForAsociatie({}, null));
  });

  it('isSendableAlert requires a non-blank title and body', () => {
    expect(isSendableAlert({ title: 'Gaz', body: 'Evacuați' })).toBe(true);
    expect(isSendableAlert({ title: '  ', body: 'Evacuați' })).toBe(false);
    expect(isSendableAlert({ title: 'Gaz', body: '   ' })).toBe(false);
    expect(isSendableAlert({ title: '', body: '' })).toBe(false);
  });

  it('recipientCount sums residents across active apartments', () => {
    expect(recipientCount([apt('1', 2), apt('2', 3), apt('3', 1)])).toBe(6);
    // inactive apartments are excluded
    expect(recipientCount([apt('1', 2), apt('2', 3, false)])).toBe(2);
    expect(recipientCount([])).toBe(0);
  });

  it('recipientCount over the demo building equals the seeded recipient count', () => {
    expect(recipientCount(DEMO_APARTMENTS)).toBe(DEMO_ALERTS[0].recipient_count);
  });

  it('builds a sent alert owned by the asociație and sender, stamped with recipients', () => {
    const now = new Date('2026-05-23T10:00:00Z');
    const a = newAlert({ title: '  Gaz  ', body: '  Evacuați  ' }, 'asoc-b', 'u-1', 9, now);
    expect(a.asociatie_id).toBe('asoc-b');
    expect(a.sender_user_id).toBe('u-1');
    expect(a.title).toBe('Gaz'); // trimmed
    expect(a.body).toBe('Evacuați'); // trimmed
    expect(a.kind).toBe(ALERT_KIND);
    expect(a.recipient_count).toBe(9);
    expect(a.sent_at).toBe(now.toISOString());
  });

  it('id is a valid UUID so Supabase uuid column accepts it', () => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const a = newAlert({ title: 'Gaz', body: 'Evacuați' }, 'asoc-b', 'u-1', 9);
    const b = newAlert({ title: 'Gaz', body: 'Evacuați' }, 'asoc-b', 'u-1', 9);
    expect(a.id).toMatch(UUID_RE);
    expect(b.id).toMatch(UUID_RE);
    expect(a.id).not.toBe(b.id);
  });

  it('addAlertIn prepends, is pure, and is scoped per asociație', () => {
    const before = seedAlerts();
    const snapshot = JSON.parse(JSON.stringify(before));
    const a = newAlert({ title: 'Nou', body: 'x' }, 'asoc-b', 'u-1', 3, new Date('2026-05-23T10:00:00Z'));
    const next = addAlertIn(before, 'asoc-b', a);

    expect(next).not.toBe(before);
    expect(before).toEqual(snapshot); // input untouched
    expect(alertsForAsociatie(next, 'asoc-b')[0]).toBe(a); // newest first
    expect(alertsForAsociatie(next, DEMO_ASOCIATIE.id)).toEqual(DEMO_ALERTS);
  });

  it('migrateAlertsState preserves non-demo asociații and reseeds the demo one', () => {
    const a = newAlert({ title: 'Old', body: 'x' }, 'asoc-b', 'u-1', 2, new Date('2026-01-01T00:00:00Z'));
    const persisted = { byAsociatie: { 'asoc-b': [a], [DEMO_ASOCIATIE.id]: [] } };
    const migrated = migrateAlertsState(persisted);
    expect(migrated['asoc-b']).toEqual([a]); // kept
    expect(migrated[DEMO_ASOCIATIE.id]).toEqual(DEMO_ALERTS); // reseeded, stale empty refreshed
  });

  it('migrateAlertsState falls back to the seed when nothing is persisted', () => {
    expect(migrateAlertsState(null)).toEqual(seedAlerts());
    expect(migrateAlertsState({})).toEqual(seedAlerts());
  });

  describe('quiet-hours bypass', () => {
    const nightMs = Date.parse('2026-05-23T23:00:00+03:00'); // 23:00 Bucharest, inside quiet hours
    const quietPrefs: NotifEmailPrefs = {
      ...defaultNotifEmailPrefs(),
      quietHoursStart: 22,
      quietHoursEnd: 8,
    };

    it('uses urgent priority so essential alerts bypass quiet hours', () => {
      expect(ALERT_PRIORITY).toBe('urgent');
    });

    it('delivers an alert even inside the recipient quiet-hours window', () => {
      expect(shouldDeliverAlert(quietPrefs, nightMs)).toBe(true);
    });

    it('delivers an alert even when the recipient has opted out of email', () => {
      const optedOut: NotifEmailPrefs = { ...quietPrefs, emailEnabled: false };
      expect(shouldDeliverAlert(optedOut, nightMs)).toBe(true);
    });
  });
});
