import { create } from 'zustand';
import type { AlarmSystem } from '@/shared/types/domain';
import { DEMO_ALARM_SYSTEMS } from '@/shared/demo/demoData';

interface AlarmState {
  systems: AlarmSystem[];
  add: (name: string) => void;
  logTest: (id: string) => void;
  reportFault: (id: string) => void;
}

function prependEvent(system: AlarmSystem, kind: string) {
  return [
    { id: `ae-${Date.now()}`, system_id: system.id, kind, occurred_at: new Date().toISOString() },
    ...system.events,
  ];
}

export const useAlarmStore = create<AlarmState>((set) => ({
  systems: [...DEMO_ALARM_SYSTEMS],
  add: (name) =>
    set((s) => ({
      systems: [
        {
          id: `al-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          name: name.trim(),
          status: 'ok',
          last_test: null,
          events: [],
        },
        ...s.systems,
      ],
    })),
  logTest: (id) =>
    set((s) => ({
      systems: s.systems.map((sys) =>
        sys.id === id
          ? {
              ...sys,
              status: 'ok',
              last_test: new Date().toISOString().slice(0, 10),
              events: prependEvent(sys, 'Test efectuat'),
            }
          : sys,
      ),
    })),
  reportFault: (id) =>
    set((s) => ({
      systems: s.systems.map((sys) =>
        sys.id === id
          ? { ...sys, status: 'defect', events: prependEvent(sys, 'Defecțiune semnalată') }
          : sys,
      ),
    })),
}));
