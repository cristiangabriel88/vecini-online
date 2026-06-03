/**
 * Builds "data" knowledge-base entries from user-visible app data so the
 * assistant can answer concrete lookups like "numărul de telefon al
 * președintelui" or "care sunt sesizarile mele?" by surfacing the actual
 * value, not just a page link.
 *
 * Only data a regular resident is allowed to see is included:
 *  - Emergency contacts (F56) -- public to everyone (includes the administrator
 *    and the committee president, with their phone numbers).
 *  - Resident directory (F36) -- opt-in; each field is masked through the same
 *    `visibleEntry` consent filter the directory page uses, so a number the
 *    owner did not choose to share never becomes an answer.
 *  - Open polls (F09) -- polls that are published, not yet closed, and within
 *    their open window; surface so a resident can ask about active votes.
 *  - My open tickets (F17) -- tickets reported by the current user whose status
 *    is not terminal; lets the resident ask "care e statusul sesizarii mele?".
 *  - Upcoming events (F08) -- events that have not yet started; lets a resident
 *    ask "ce evenimente urmează?".
 *
 * Phase 1 (demo): data sourced from demo fixtures via the seeded stores.
 * Phase 2 (live): `useDataEntries()` reads from real per-asociatie stores
 *   (emergency contacts hydrated from Supabase; others from their reactive
 *   stores, which hold live or demo entries depending on hydration).
 */
import { useState, useEffect, useMemo } from 'react';
import {
  DEMO_EMERGENCY,
  DEMO_DIRECTORY,
  DEMO_POLLS,
  DEMO_EVENTS,
  DEMO_TICKETS,
  DEMO_CURRENT_USER_ID,
} from '@/shared/demo/demoData';
import { isListed, visibleEntry } from '@/features/directory/directoryLogic';
import { useAsociatieDirectory } from '@/features/directory/directoryStore';
import { useAsociatiePolls } from '@/features/polls/pollsStore';
import { useAsociatieTickets } from '@/features/tickets/ticketsStore';
import { useAsociatieEvents } from '@/features/events/eventsStore';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { normalize } from './match';
import type { KbEntry } from './knowledge';
import type { EmergencyContact, DirectoryEntry, Poll, Ticket, TicketStatus, BuildingEvent } from '@/shared/types/domain';

/** Generic intent words that should pull a contact answer to the top. */
const PHONE_TERMS = ['telefon', 'numar', 'phone', 'number', 'contact', 'suna', 'sunat', 'apel', 'call'];
const EMAIL_TERMS = ['email', 'mail', 'adresa', 'contact'];

/** Extra RO/EN words per emergency-contact category, beyond the label itself. */
const CATEGORY_TERMS: Record<string, string[]> = {
  admin: ['administrator', 'admin', 'manager'],
  comitet: ['presedinte', 'president', 'comitet', 'committee'],
  lift: ['lift', 'elevator'],
  apa: ['apa', 'water'],
  gaz: ['gaz', 'gas'],
  general: ['urgenta', 'emergency', '112', 'salvare', 'pompieri', 'politie'],
};

/** Statuses that indicate a ticket is no longer actionable. */
const CLOSED_TICKET_STATUSES: TicketStatus[] = ['rezolvat', 'verificat', 'inchis', 'respins'];

/** Split a human label into plain matchable words. */
function words(text: string | null | undefined): string[] {
  if (!text) return [];
  return normalize(text).split(' ').filter((w) => w.length >= 2);
}

/** Build KbEntries from an emergency contacts list (demo or live). */
export function buildEmergencyEntries(contacts: EmergencyContact[]): KbEntry[] {
  return contacts.map((c): KbEntry => ({
    id: `data.emergency.${c.id}`,
    kind: 'data',
    featureKey: 'F56',
    audience: ['all'],
    route: '/app/urgenta',
    data: {
      terms: [...words(c.label), ...(CATEGORY_TERMS[c.category] ?? []), ...PHONE_TERMS],
      label: c.label,
      value: c.phone,
      valueKind: 'phone',
    },
  }));
}

/** Build KbEntries from a directory entry list, applying per-field consent masks. */
export function buildDirectoryEntries(entries: DirectoryEntry[]): KbEntry[] {
  const result: KbEntry[] = [];
  for (const raw of entries) {
    if (!isListed(raw)) continue;
    const v = visibleEntry(raw);
    const base = [...words(v.name), ...words(v.apartment)];
    if (v.phone) {
      result.push({
        id: `data.dir.phone.${v.id}`,
        kind: 'data',
        featureKey: 'F36',
        audience: ['all'],
        route: '/app/vecini',
        data: { terms: [...base, ...PHONE_TERMS], label: v.name ?? v.apartment ?? 'Vecin', value: v.phone, valueKind: 'phone' },
      });
    }
    if (v.email) {
      result.push({
        id: `data.dir.email.${v.id}`,
        kind: 'data',
        featureKey: 'F36',
        audience: ['all'],
        route: '/app/vecini',
        data: { terms: [...base, ...EMAIL_TERMS], label: v.name ?? v.apartment ?? 'Vecin', value: v.email, valueKind: 'email' },
      });
    }
  }
  return result;
}

/**
 * Build KbEntries from polls that are currently open (published, not closed,
 * within the open window). One entry per poll so a resident can ask about an
 * active vote by name.
 */
export function buildPollEntries(polls: Poll[]): KbEntry[] {
  const now = new Date().toISOString();
  const open = polls.filter(
    (p) =>
      p.published_at !== null &&
      p.closed_at === null &&
      (p.opens_at === null || p.opens_at <= now) &&
      (p.closes_at === null || p.closes_at > now),
  );
  return open.map((p): KbEntry => ({
    id: `data.poll.${p.id}`,
    kind: 'data',
    featureKey: 'F09',
    audience: ['all'],
    route: '/app/voturi',
    data: {
      terms: [
        ...words(p.title),
        ...words(p.description),
        'vot', 'votez', 'votare', 'voturi', 'vote', 'poll', 'activ', 'deschis', 'open', 'propunere', 'referendum',
      ],
      label: p.title,
      value: p.title,
      valueKind: 'text',
    },
  }));
}

/**
 * Build KbEntries from the current user's non-terminal tickets. One entry per
 * ticket so a resident can ask about a specific sesizare by keyword.
 */
export function buildMyTicketEntries(tickets: Ticket[], currentUserId: string): KbEntry[] {
  const myOpen = tickets.filter(
    (t) => t.reporter_user_id === currentUserId && !CLOSED_TICKET_STATUSES.includes(t.status),
  );
  return myOpen.map((t): KbEntry => ({
    id: `data.ticket.${t.id}`,
    kind: 'data',
    featureKey: 'F17',
    audience: ['all'],
    route: '/app/sesizari',
    data: {
      terms: [
        ...words(t.title),
        ...words(t.category),
        ...words(t.location_description),
        'sesizare', 'sesizarile', 'reclamatie', 'problem', 'status', 'ale', 'mele', 'mea',
      ],
      label: t.title,
      value: t.title,
      valueKind: 'text',
    },
  }));
}

/**
 * Build KbEntries from events that have not yet started. One entry per event
 * so a resident can ask about upcoming activities by name.
 */
export function buildEventEntries(events: BuildingEvent[]): KbEntry[] {
  const now = new Date().toISOString();
  const upcoming = events.filter((e) => e.starts_at > now);
  return upcoming.map((e): KbEntry => ({
    id: `data.event.${e.id}`,
    kind: 'data',
    featureKey: 'F08',
    audience: ['all'],
    route: '/app/evenimente',
    data: {
      terms: [
        ...words(e.title),
        ...words(e.category),
        ...words(e.location),
        'eveniment', 'evenimente', 'calendar', 'urmator', 'viitor', 'programat', 'intalnire', 'event',
      ],
      label: e.title,
      value: e.title,
      valueKind: 'text',
    },
  }));
}

/**
 * Hook: returns emergency contacts for the active asociatie.
 * Demo path: returns DEMO_EMERGENCY.
 * Live path: queries `emergency_contacts` under RLS when Supabase is configured.
 */
export function useAsociatieEmergencyContacts(): EmergencyContact[] {
  const [contacts, setContacts] = useState<EmergencyContact[]>(DEMO_EMERGENCY);
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentAsociatieId) return;
    void supabase
      .from('emergency_contacts')
      .select('id, asociatie_id, label, phone, category, sort_order')
      .eq('asociatie_id', currentAsociatieId)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) setContacts(data as EmergencyContact[]);
      });
  }, [currentAsociatieId]);

  return contacts;
}

/**
 * Hook: reactive KbEntries built from the real per-asociatie stores.
 * Emergency contacts hydrated from Supabase when live; polls, tickets, events,
 * and directory read from their reactive stores (seeded with demo data, hydrated
 * live behind isSupabaseConfigured by their respective API layers).
 */
export function useDataEntries(): KbEntry[] {
  const emergencyContacts = useAsociatieEmergencyContacts();
  const directoryEntries = useAsociatieDirectory();
  const { polls } = useAsociatiePolls();
  const allTickets = useAsociatieTickets();
  const allEvents = useAsociatieEvents();
  const currentUserId = useAuthStore((s) => s.session?.user?.id ?? DEMO_CURRENT_USER_ID);

  return useMemo(
    () => [
      ...buildEmergencyEntries(emergencyContacts),
      ...buildDirectoryEntries(directoryEntries),
      ...buildPollEntries(polls),
      ...buildMyTicketEntries(allTickets, currentUserId),
      ...buildEventEntries(allEvents),
    ],
    [emergencyContacts, directoryEntries, polls, allTickets, allEvents, currentUserId],
  );
}

/** Static demo-backed entries for tests and backwards-compat imports. */
export const DATA_ENTRIES: KbEntry[] = [
  ...buildEmergencyEntries(DEMO_EMERGENCY),
  ...buildDirectoryEntries(DEMO_DIRECTORY),
  ...buildPollEntries(DEMO_POLLS),
  ...buildMyTicketEntries(DEMO_TICKETS, DEMO_CURRENT_USER_ID),
  ...buildEventEntries(DEMO_EVENTS),
];
