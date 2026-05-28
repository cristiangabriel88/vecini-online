import type { Ticket } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { type NewTicketInput, newTicket, ticketsForAsociatie } from './ticketLogic';
import { useTicketsStore } from './ticketsStore';

/* Dual-mode sesizări/reclamații repository (F17, T57). The zustand store is the
   synchronous source of truth the page reads; these functions apply each change
   there and, when a backend is configured, mirror it to `tickets` under RLS
   (members read within their asociație; reporters who are members may insert).

   The demo/offline store stays the default when Supabase is absent. */

/** Hydrate the tickets for one asociație from the backend, when configured.
 *  The demo store is the source of truth if the read fails or backend is absent. */
export async function hydrateTickets(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select(
        'id, asociatie_id, reporter_user_id, apartment_id, title, description, category, severity, location_scara, location_etaj, location_description, status, assigned_to_user_id, sla_due_at, resolved_at, verified_at, resolution_notes, rating, created_at, updated_at',
      )
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !data) return;
    useTicketsStore.getState().replaceForAsociatie(asociatieId, data as Ticket[]);
  } catch {
    /* best-effort: the local list remains the source of truth for the UI */
  }
}

/** Submit a sesizare: updates the store synchronously and mirrors to the
 *  `tickets` table when a backend is configured. */
export function submitTicket(
  asociatieId: string,
  reporterUserId: string,
  input: NewTicketInput,
): void {
  const ticket = newTicket(input, asociatieId, reporterUserId);
  const state = useTicketsStore.getState();
  const current = ticketsForAsociatie(state.byAsociatie, asociatieId);
  state.replaceForAsociatie(asociatieId, [ticket, ...current]);
  if (isSupabaseConfigured) {
    void (async () => {
      try {
        await supabase.from('tickets').insert({
          id: ticket.id,
          asociatie_id: ticket.asociatie_id,
          reporter_user_id: ticket.reporter_user_id,
          apartment_id: ticket.apartment_id,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          severity: ticket.severity,
          location_scara: ticket.location_scara,
          location_etaj: ticket.location_etaj,
          location_description: ticket.location_description,
          status: ticket.status,
          sla_due_at: ticket.sla_due_at,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
        });
      } catch {
        /* mirroring is best-effort */
      }
    })();
  }
}
