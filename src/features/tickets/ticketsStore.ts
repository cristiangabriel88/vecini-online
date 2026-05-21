import { create } from 'zustand';
import type { Ticket, TicketSeverity } from '@/shared/types/domain';
import { DEMO_TICKETS } from '@/shared/demo/demoData';
import { slaDueAt } from './ticketLogic';

interface TicketsState {
  items: Ticket[];
  add: (input: {
    title: string;
    description: string;
    category: string;
    severity: TicketSeverity;
    location: string;
  }) => void;
}

export const useTicketsStore = create<TicketsState>((set) => ({
  items: [...DEMO_TICKETS],
  add: ({ title, description, category, severity, location }) =>
    set((s) => ({
      items: [
        {
          id: `t-${Date.now()}`,
          asociatie_id: 'demo-asoc',
          reporter_user_id: 'u-res',
          apartment_id: null,
          title,
          description,
          category,
          severity,
          location_scara: null,
          location_etaj: null,
          location_description: location,
          status: 'primit',
          assigned_to_user_id: null,
          sla_due_at: slaDueAt(severity).toISOString(),
          resolved_at: null,
          verified_at: null,
          resolution_notes: null,
          rating: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...s.items,
      ],
    })),
}));
