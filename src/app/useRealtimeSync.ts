import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import type { Announcement, Ticket, PrivateThread, PrivateMessage, Vote } from '@/shared/types/domain';
import type { AppNotification, NotificationKind, NotificationPriority } from '@/features/notifications/notificationLogic';
import { useAnnouncementsStore } from '@/features/announcements/announcementsStore';
import { useTicketsStore } from '@/features/tickets/ticketsStore';
import { useAdminChatStore } from '@/features/adminchat/adminChatStore';
import { useNotificationStore } from '@/shared/store/notificationStore';
import { usePetitionStore } from '@/features/petitions/petitionStore';
import { usePollsStore } from '@/features/polls/pollsStore';
import { useEventsStore } from '@/features/events/eventsStore';
import {
  applyAnnouncementChange,
  applyAnnouncementDelete,
  applyTicketChange,
  applyTicketDelete,
  applyThreadInsert,
  applyThreadStatusUpdate,
  applyThreadDelete,
  applyMessageInsert,
  applyNotificationInsert,
  applyPetitionSignatureInsert,
  applyVoteInsert,
  applyRsvpChange,
} from './realtimeLogic';

/** DB row shape for notifications (snake_case, as received from Supabase). */
type NotifRow = {
  id: string;
  user_id: string;
  asociatie_id: string | null;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  priority: string;
  read_at: string | null;
  created_at: string;
  data: Record<string, string>;
};

/** Minimal petition_signatures row shape (no asociatie_id column on this table). */
type PetSigRow = { petition_id: string };

/** Minimal event_rsvps row shape (no asociatie_id column on this table). */
type RsvpRow = { event_id: string; status: string };

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
 * asociatieId is null.
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

      // ---- notifications -------------------------------------------------
      .on<NotifRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const row = payload.new;
          const item: AppNotification = {
            id: row.id,
            userId: row.user_id,
            asociatieId: row.asociatie_id,
            kind: row.kind as NotificationKind,
            title: row.title,
            body: row.body,
            link: row.link,
            priority: row.priority as NotificationPriority,
            readAt: null,
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            data: row.data ?? {},
          };
          const store = useNotificationStore.getState();
          store.replaceForUser(
            item.userId,
            item.asociatieId ?? aid,
            applyNotificationInsert(store.forUser(item.userId, item.asociatieId ?? aid), item),
          );
        },
      )

      // ---- petition signatures -------------------------------------------
      // petition_signatures has no asociatie_id column; RLS scopes via petitions.
      .on<PetSigRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'petition_signatures' },
        (payload) => {
          const store = usePetitionStore.getState();
          store.replaceForAsociatie(
            aid,
            applyPetitionSignatureInsert(store.forAsociatie(aid).items, payload.new.petition_id),
          );
        },
      )

      // ---- votes (poll ballots) ------------------------------------------
      .on<Vote>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const optionIds = payload.new.selected_option_ids ?? [];
          if (optionIds.length === 0) return;
          const store = usePollsStore.getState();
          store.mergeCounts(applyVoteInsert(store.counts, optionIds));
        },
      )

      // ---- event RSVPs (cross-device own-RSVP sync) ----------------------
      // event_rsvps has no asociatie_id column; "self rsvp" RLS limits to own rows.
      .on<RsvpRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_rsvps' },
        (payload) => {
          const store = useEventsStore.getState();
          store.replaceRsvps(
            applyRsvpChange(store.rsvps, payload.new.event_id, payload.new.status === 'yes'),
          );
        },
      )
      .on<RsvpRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'event_rsvps' },
        (payload) => {
          const store = useEventsStore.getState();
          store.replaceRsvps(
            applyRsvpChange(store.rsvps, payload.new.event_id, payload.new.status === 'yes'),
          );
        },
      )

      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [asociatieId]);
}
