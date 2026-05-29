import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import type { Announcement, Ticket, PrivateThread, PrivateMessage } from '@/shared/types/domain';
import { useAnnouncementsStore } from '@/features/announcements/announcementsStore';
import { useTicketsStore } from '@/features/tickets/ticketsStore';
import { useAdminChatStore } from '@/features/adminchat/adminChatStore';
import {
  applyAnnouncementChange,
  applyAnnouncementDelete,
  applyTicketChange,
  applyTicketDelete,
  applyThreadInsert,
  applyThreadStatusUpdate,
  applyThreadDelete,
  applyMessageInsert,
} from './realtimeLogic';

/** DB row shape for private_threads (no computed messages join). */
type ThreadRow = Omit<PrivateThread, 'messages'>;

/**
 * Subscribe to Supabase Realtime postgres_changes for the active asociație:
 * announcements, tickets, and private messaging threads + messages (F04).
 *
 * Each INSERT is deduplicated by id against the local store so optimistic writes
 * (which use the same id as the backend row) do not produce duplicates. Updates
 * and deletes are applied directly. Supabase Realtime reconnects automatically
 * on network interruptions.
 *
 * No-op in demo/offline mode (isSupabaseConfigured === false) or when
 * asociatieId is null. Votes surfaces are subscribed once their live read path
 * lands (T80).
 */
export function useRealtimeSync(asociatieId: string | null): void {
  useEffect(() => {
    if (!isSupabaseConfigured || !asociatieId) return;
    const aid = asociatieId;

    const channel = supabase
      .channel(`rt-${aid}`)

      // ---- announcements ------------------------------------------------
      .on<Announcement>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const store = useAnnouncementsStore.getState();
          store.replaceForAsociatie(
            aid,
            applyAnnouncementChange(store.forAsociatie(aid), 'INSERT', payload.new),
          );
        },
      )
      .on<Announcement>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'announcements', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const store = useAnnouncementsStore.getState();
          store.replaceForAsociatie(
            aid,
            applyAnnouncementChange(store.forAsociatie(aid), 'UPDATE', payload.new),
          );
        },
      )
      .on<{ id: string }>(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'announcements', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const id = payload.old.id;
          if (!id) return;
          const store = useAnnouncementsStore.getState();
          store.replaceForAsociatie(aid, applyAnnouncementDelete(store.forAsociatie(aid), id));
        },
      )

      // ---- tickets -------------------------------------------------------
      .on<Ticket>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const store = useTicketsStore.getState();
          store.replaceForAsociatie(
            aid,
            applyTicketChange(store.forAsociatie(aid), 'INSERT', payload.new),
          );
        },
      )
      .on<Ticket>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const store = useTicketsStore.getState();
          store.replaceForAsociatie(
            aid,
            applyTicketChange(store.forAsociatie(aid), 'UPDATE', payload.new),
          );
        },
      )
      .on<{ id: string }>(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tickets', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const id = payload.old.id;
          if (!id) return;
          const store = useTicketsStore.getState();
          store.replaceForAsociatie(aid, applyTicketDelete(store.forAsociatie(aid), id));
        },
      )

      // ---- private threads -----------------------------------------------
      .on<ThreadRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_threads', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const store = useAdminChatStore.getState();
          const thread: PrivateThread = { ...payload.new, messages: [] };
          store.replaceAll(aid, applyThreadInsert(store.forAsociatie(aid), thread));
        },
      )
      .on<ThreadRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'private_threads', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const store = useAdminChatStore.getState();
          store.replaceAll(
            aid,
            applyThreadStatusUpdate(store.forAsociatie(aid), payload.new.id, payload.new.status),
          );
        },
      )
      .on<{ id: string }>(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'private_threads', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const id = payload.old.id;
          if (!id) return;
          const store = useAdminChatStore.getState();
          store.replaceAll(aid, applyThreadDelete(store.forAsociatie(aid), id));
        },
      )

      // ---- private messages ----------------------------------------------
      .on<PrivateMessage>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const store = useAdminChatStore.getState();
          store.replaceAll(aid, applyMessageInsert(store.forAsociatie(aid), payload.new));
        },
      )

      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [asociatieId]);
}
