import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { env } from '@/shared/lib/env';
import type {
  Announcement,
  Ticket,
  PrivateThread,
  PrivateMessage,
  Vote,
  DiscussionMessage,
} from '@/shared/types/domain';
import type { AppNotification, NotificationKind, NotificationPriority } from '@/features/notifications/notificationLogic';
import { useAnnouncementsStore } from '@/features/announcements/announcementsStore';
import { useTicketsStore } from '@/features/tickets/ticketsStore';
import { useAdminChatStore } from '@/features/adminchat/adminChatStore';
import { useDiscussionStore } from '@/features/discussions/discussionStore';
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
  applyDiscussionThreadInsert,
  applyDiscussionThreadUpdate,
  applyDiscussionThreadDelete,
  applyDiscussionMessageChange,
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

/** DB row shape for discussion_threads (no computed messages join). */
type DiscussionThreadRow = {
  id: string;
  asociatie_id: string;
  topic: string | null;
  title: string | null;
  pinned: boolean;
  created_at: string;
};

/** DB row shape for discussion_messages (carries the soft-delete marker). */
type DiscussionMessageRow = {
  id: string;
  thread_id: string;
  author_user_id: string | null;
  author_name: string | null;
  body: string | null;
  deleted_at: string | null;
  created_at: string;
};

function fromDiscussionMessageRow(row: DiscussionMessageRow): DiscussionMessage {
  return {
    id: row.id,
    thread_id: row.thread_id,
    author_user_id: row.author_user_id ?? '',
    author_name: row.author_name ?? '',
    body: row.body ?? '',
    created_at: row.created_at,
  };
}

/**
 * Subscribe to Supabase Realtime postgres_changes for the active asociație:
 * announcements, tickets, discussions (F02 threads + messages), private
 * messaging threads + messages (F04), notifications, petition signatures,
 * poll votes, and event RSVPs.
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
    // The Pi DEV stack intentionally runs a minimal local Supabase setup without
    // the Realtime service. Subscribing there makes the browser retry a failing
    // websocket every few seconds, while normal REST reads/writes still work.
    if (env.appStage === 'dev') return;

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

      // ---- discussion threads (F02) ---------------------------------------
      .on<DiscussionThreadRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'discussion_threads', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const store = useDiscussionStore.getState();
          const row = payload.new;
          store.replaceForAsociatie(
            aid,
            applyDiscussionThreadInsert(store.forAsociatie(aid), {
              id: row.id,
              asociatie_id: row.asociatie_id,
              topic: row.topic ?? '#general',
              title: row.title ?? '',
              pinned: row.pinned,
              created_at: row.created_at,
              messages: [],
            }),
          );
        },
      )
      .on<DiscussionThreadRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'discussion_threads', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const store = useDiscussionStore.getState();
          const row = payload.new;
          store.replaceForAsociatie(
            aid,
            applyDiscussionThreadUpdate(store.forAsociatie(aid), row.id, {
              topic: row.topic ?? '#general',
              title: row.title ?? '',
              pinned: row.pinned,
            }),
          );
        },
      )
      .on<{ id: string }>(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'discussion_threads', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const id = payload.old.id;
          if (!id) return;
          const store = useDiscussionStore.getState();
          store.replaceForAsociatie(
            aid,
            applyDiscussionThreadDelete(store.forAsociatie(aid), id),
          );
        },
      )

      // ---- discussion messages (F02) ---------------------------------------
      // UPDATE covers both edits (body) and soft-deletes (deleted_at set).
      .on<DiscussionMessageRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'discussion_messages', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const store = useDiscussionStore.getState();
          store.replaceForAsociatie(
            aid,
            applyDiscussionMessageChange(
              store.forAsociatie(aid),
              fromDiscussionMessageRow(payload.new),
              payload.new.deleted_at,
            ),
          );
        },
      )
      .on<DiscussionMessageRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'discussion_messages', filter: `asociatie_id=eq.${aid}` },
        (payload) => {
          const store = useDiscussionStore.getState();
          store.replaceForAsociatie(
            aid,
            applyDiscussionMessageChange(
              store.forAsociatie(aid),
              fromDiscussionMessageRow(payload.new),
              payload.new.deleted_at,
            ),
          );
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
