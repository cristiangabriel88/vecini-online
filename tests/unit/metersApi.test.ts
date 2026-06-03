import { beforeEach, describe, expect, it } from 'vitest';
import { useMetersStore } from '@/features/meters/metersStore';
import { hydrateMeters, submitMeterReading } from '@/features/meters/metersApi';
import { metersForAsociatie, seedMeters } from '@/features/meters/meterLogic';
import { DEMO_ASOCIATIE, DEMO_METERS } from '@/shared/demo/demoData';

// metersApi offline-path tests (T213).
// Live-path tests require a real Supabase backend; the offline path
// (isSupabaseConfigured === false) is what CI exercises here. Key contracts:
//   - hydrateMeters: no-op when not configured / empty id
//   - submitMeterReading: updates meter last_value + prepends reading synchronously

const ASOC = DEMO_ASOCIATIE.id;
const METER_ID = DEMO_METERS[0].id;
const PREV_VALUE = DEMO_METERS[0].last_value;

beforeEach(() => {
  useMetersStore.setState({ byAsociatie: seedMeters(), fetchError: null });
});

describe('hydrateMeters', () => {
  it('is a no-op when Supabase is not configured (offline/CI)', async () => {
    const before = useMetersStore.getState().byAsociatie;
    await hydrateMeters(ASOC);
    expect(useMetersStore.getState().byAsociatie).toBe(before);
    expect(useMetersStore.getState().fetchError).toBeNull();
  });

  it('is a no-op when asociatieId is empty', async () => {
    const before = useMetersStore.getState().byAsociatie;
    await hydrateMeters('');
    expect(useMetersStore.getState().byAsociatie).toBe(before);
  });
});

describe('submitMeterReading', () => {
  it('updates the meter last_value synchronously', () => {
    const newValue = PREV_VALUE + 10;
    submitMeterReading(ASOC, METER_ID, newValue, 'u-test');
    const { meters } = metersForAsociatie(useMetersStore.getState().byAsociatie, ASOC);
    const meter = meters.find((m) => m.id === METER_ID)!;
    expect(meter.last_value).toBe(newValue);
  });

  it('prepends the reading to the readings list', () => {
    const before = metersForAsociatie(useMetersStore.getState().byAsociatie, ASOC).readings.length;
    const newValue = PREV_VALUE + 5;
    const reading = submitMeterReading(ASOC, METER_ID, newValue, 'u-test');
    const { readings } = metersForAsociatie(useMetersStore.getState().byAsociatie, ASOC);
    expect(readings).toHaveLength(before + 1);
    expect(readings[0].id).toBe(reading.id);
    expect(readings[0].value).toBe(newValue);
    expect(readings[0].meter_id).toBe(METER_ID);
  });

  it('sets the submitted_by field on the reading', () => {
    submitMeterReading(ASOC, METER_ID, PREV_VALUE + 1, 'u-admin');
    const { readings } = metersForAsociatie(useMetersStore.getState().byAsociatie, ASOC);
    expect(readings[0].submitted_by).toBe('u-admin');
  });

  it('does not affect meters of other kinds', () => {
    const before = metersForAsociatie(useMetersStore.getState().byAsociatie, ASOC).meters;
    submitMeterReading(ASOC, METER_ID, PREV_VALUE + 8, 'u-test');
    const after = metersForAsociatie(useMetersStore.getState().byAsociatie, ASOC).meters;
    const others = DEMO_METERS.filter((m) => m.id !== METER_ID);
    for (const m of others) {
      const origValue = before.find((b) => b.id === m.id)!.last_value;
      const newMeter = after.find((a) => a.id === m.id)!;
      expect(newMeter.last_value).toBe(origValue);
    }
  });
});
