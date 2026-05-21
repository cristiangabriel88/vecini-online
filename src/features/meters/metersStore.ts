import { create } from 'zustand';
import type { Meter, MeterReading } from '@/shared/types/domain';
import { DEMO_METERS, DEMO_METER_READINGS } from '@/shared/demo/demoData';

interface MetersState {
  meters: Meter[];
  readings: MeterReading[];
  submit: (meterId: string, value: number) => void;
}

export const useMetersStore = create<MetersState>((set) => ({
  meters: [...DEMO_METERS],
  readings: [...DEMO_METER_READINGS],
  submit: (meterId, value) =>
    set((s) => ({
      meters: s.meters.map((m) => (m.id === meterId ? { ...m, last_value: value } : m)),
      readings: [
        {
          id: `mrd-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          meter_id: meterId,
          value,
          photo_path: null,
          submitted_by: 'u-res',
          reading_date: new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
        },
        ...s.readings,
      ],
    })),
}));
