import type { Ticket, TicketAttachment } from '@/shared/types/domain';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { type NewTicketInput, newTicket, ticketsForAsociatie } from './ticketLogic';
import { useTicketsStore } from './ticketsStore';
import { genId } from '@/shared/lib/id';
import { downscalePhoto } from '@/shared/lib/imageResize';

/* Dual-mode sesizări/reclamații repository (F17, T57). The zustand store is the
   synchronous source of truth the page reads; these functions apply each change
   there and, when a backend is configured, mirror it to `tickets` under RLS
   (members read within their asociație; reporters who are members may insert).

   The demo/offline store stays the default when Supabase is absent. */

const BUCKET = 'attachments';
const SIGNED_URL_EXPIRY_SECONDS = 3600;

function buildAttachmentPath(asociatieId: string, ticketId: string, fileName: string): string {
  return `${asociatieId}/tickets/${ticketId}/${fileName}`;
}

type TicketRow = Omit<Ticket, 'attachments'> & {
  ticket_attachments?: {
    id: string;
    file_name: string | null;
    file_size: number | null;
    mime_type: string | null;
    storage_path: string | null;
    created_at: string;
  }[];
};

/** Hydrate the tickets for one asociație from the backend, when configured.
 *  The demo store is the source of truth if the read fails or backend is absent. */
export async function hydrateTickets(asociatieId: string): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = useTicketsStore.getState();
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select(
        `id, asociatie_id, reporter_user_id, apartment_id, title, description, category, severity,
         location_scara, location_etaj, location_description, status, assigned_to_user_id,
         sla_due_at, resolved_at, verified_at, resolution_notes, rating, created_at, updated_at,
         ticket_attachments(id, file_name, file_size, mime_type, storage_path, created_at)`,
      )
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      reportError(error ?? new Error('no data'), { source: 'ticketsApi.hydrate' });
      store.setFetchError('load');
      return;
    }
    store.setFetchError(null);
    const tickets: Ticket[] = (data as TicketRow[]).map(({ ticket_attachments, ...row }) => ({
      ...row,
      attachments: (ticket_attachments ?? []).map((att) => ({
        id: att.id,
        ticket_id: row.id,
        file_name: att.file_name ?? '',
        file_size: att.file_size ?? 0,
        mime_type: att.mime_type ?? '',
        storage_path: att.storage_path,
        file_data_url: null,
        created_at: att.created_at,
      })),
    }));
    store.replaceForAsociatie(asociatieId, tickets);
  } catch (err) {
    reportError(err, { source: 'ticketsApi.hydrate' });
    store.setFetchError('load');
  }
}

/** Upload attachment files to Storage and insert rows in `ticket_attachments`.
 *  Best-effort: skips individual files that fail, returns successfully uploaded ones. */
export async function uploadTicketAttachments(
  asociatieId: string,
  ticketId: string,
  files: File[],
): Promise<TicketAttachment[]> {
  const uploaded: TicketAttachment[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const uploadFile = await downscalePhoto(file);
      const id = genId();
      const path = buildAttachmentPath(asociatieId, ticketId, uploadFile.name);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, uploadFile, { contentType: uploadFile.type, upsert: false });
      if (error) {
        reportError(error, { source: 'ticketsApi.uploadAttachment' });
        continue;
      }
      const now = new Date().toISOString();
      await supabase.from('ticket_attachments').insert({
        id,
        ticket_id: ticketId,
        storage_path: path,
        mime_type: uploadFile.type,
        file_name: uploadFile.name,
        file_size: uploadFile.size,
        created_at: now,
      });
      uploaded.push({
        id,
        ticket_id: ticketId,
        file_name: uploadFile.name,
        file_size: uploadFile.size,
        mime_type: uploadFile.type,
        storage_path: path,
        file_data_url: null,
        created_at: now,
      });
    } catch (err) {
      reportError(err, { source: 'ticketsApi.uploadAttachment' });
    }
  }
  return uploaded;
}

/** Return a short-lived signed URL for a ticket attachment, or null. */
export async function getTicketAttachmentUrl(storagePath: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/** Submit a sesizare: updates the store synchronously and mirrors to the
 *  `tickets` table when a backend is configured.
 *
 *  Pass `offlineAttachments` (pre-resolved data-URL objects) for the demo path,
 *  or `liveFiles` (raw File objects) for the live path -- never both. */
export function submitTicket(
  asociatieId: string,
  reporterUserId: string,
  input: NewTicketInput,
  offlineAttachments: TicketAttachment[] = [],
  liveFiles: File[] = [],
): void {
  const ticket = newTicket(input, asociatieId, reporterUserId);
  const withAttachments: Ticket = { ...ticket, attachments: offlineAttachments };
  const state = useTicketsStore.getState();
  const current = ticketsForAsociatie(state.byAsociatie, asociatieId);
  state.replaceForAsociatie(asociatieId, [withAttachments, ...current]);

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
        if (liveFiles.length) {
          const uploaded = await uploadTicketAttachments(asociatieId, ticket.id, liveFiles);
          if (uploaded.length) {
            const s = useTicketsStore.getState();
            const updated = ticketsForAsociatie(s.byAsociatie, asociatieId).map((t) =>
              t.id === ticket.id ? { ...t, attachments: uploaded } : t,
            );
            s.replaceForAsociatie(asociatieId, updated);
          }
        }
      } catch (err) {
        reportError(err, { source: 'ticketsApi.submit' });
      }
    })();
  }
}
