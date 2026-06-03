import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import { reportError } from '@/shared/lib/errorReporting';
import { recordAudit } from '@/shared/store/auditStore';
import { useNotificationStore } from '@/shared/store/notificationStore';
import { createNotification } from '@/features/notifications/notificationLogic';
import { persistAndFanOut } from '@/features/notifications/notificationsApi';
import { DEMO_ASOCIATIE, DEMO_CURRENT_USER_ID } from '@/shared/demo/demoData';
import { isThresholdReached, petitionsForAsociatie } from './petitionLogic';
import { usePetitionStore } from './petitionStore';
import type { Petition } from '@/shared/types/domain';

/* Dual-mode petition repository (F16, T196). The zustand store is the
   synchronous source of truth the page reads; these functions apply each
   change there and, when a backend is configured, mirror it to
   `petitions`/`petition_signatures` under RLS (members read + create own
   petitions + sign once per apartment). Signature counts are tallied in JS
   from the raw `petition_signatures` rows (not secret).
   The demo/offline store stays the default when Supabase is absent.
   Auto-forward: when a signing pushes a petition past its threshold, the status
   is set to 'inaintata' in the DB and an audit event is recorded. */

interface PetitionRow {
  id: string;
  asociatie_id: string;
  author_user_id: string | null;
  title: string | null;
  body: string | null;
  threshold_percent: number;
  status: string;
  created_at: string;
  response: string | null;
  responded_at: string | null;
  responded_by_name: string | null;
}

interface SignatureRow {
  petition_id: string;
  apartment_id: string;
}

const VALID_STATUSES = new Set(['deschisa', 'inaintata', 'rezolvata', 'respinsa']);

function rowToPetition(row: PetitionRow, signatures: number, totalApartments: number): Petition {
  return {
    id: row.id,
    asociatie_id: row.asociatie_id,
    author_user_id: row.author_user_id ?? '',
    author_name: '',
    title: row.title ?? '',
    body: row.body ?? '',
    threshold_percent: row.threshold_percent,
    status: VALID_STATUSES.has(row.status) ? row.status : 'deschisa',
    created_at: row.created_at,
    signatures,
    total_apartments: totalApartments,
    response: row.response ?? null,
    responded_at: row.responded_at ?? null,
    responded_by_name: row.responded_by_name ?? null,
  };
}

/**
 * Hydrate one asociație's petitions and signature counts from the backend. The
 * demo/offline store is kept as the source of truth if the read fails or the
 * backend is absent. totalApartments must be passed by the caller (from the
 * apartments store) to populate the threshold denominator on live rows.
 */
export async function hydratePetitions(
  asociatieId: string,
  totalApartments: number,
): Promise<void> {
  if (!isSupabaseConfigured || !asociatieId) return;
  const store = usePetitionStore.getState();
  try {
    const { data: petitionRows, error: petErr } = await supabase
      .from('petitions')
      .select('id, asociatie_id, author_user_id, title, body, threshold_percent, status, created_at, response, responded_at, responded_by_name')
      .eq('asociatie_id', asociatieId)
      .order('created_at', { ascending: false });
    if (petErr || !petitionRows) {
      reportError(petErr ?? new Error('no data'), { source: 'petitionApi.hydrate.petitions' });
      store.setFetchError('load');
      return;
    }

    const petitionIds = (petitionRows as PetitionRow[]).map((r) => r.id);
    const sigCounts: Record<string, number> = {};

    if (petitionIds.length > 0) {
      const { data: sigRows, error: sigErr } = await supabase
        .from('petition_signatures')
        .select('petition_id, apartment_id')
        .in('petition_id', petitionIds);
      if (!sigErr && sigRows) {
        for (const s of sigRows as SignatureRow[]) {
          sigCounts[s.petition_id] = (sigCounts[s.petition_id] ?? 0) + 1;
        }
      }
    }

    const petitions = (petitionRows as PetitionRow[]).map((r) =>
      rowToPetition(r, sigCounts[r.id] ?? 0, totalApartments),
    );
    store.setFetchError(null);
    store.replaceForAsociatie(asociatieId, petitions);
  } catch (err) {
    reportError(err, { source: 'petitionApi.hydrate' });
    store.setFetchError('load');
  }
}

/**
 * Submit a new petition: apply to the store synchronously (optimistic) then
 * mirror an insert to `petitions` when a backend is configured.
 */
export function createPetition(
  asociatieId: string,
  petition: Petition,
  authorUserId: string | null,
): void {
  usePetitionStore.getState().addPetition(asociatieId, petition);
  if (isSupabaseConfigured && authorUserId) {
    void (async () => {
      try {
        await supabase.from('petitions').insert({
          asociatie_id: asociatieId,
          author_user_id: authorUserId,
          title: petition.title,
          body: petition.body,
          threshold_percent: petition.threshold_percent,
          status: petition.status,
        });
      } catch (err) {
        reportError(err, { source: 'petitionApi.create' });
      }
    })();
  }
}

/**
 * Publish an official committee response on a forwarded petition: apply to the
 * store synchronously then mirror an update to `petitions` when a backend is
 * configured. Requires the caller to pass the responder's display name and
 * user id.
 */
export function savePetitionResponse(
  asociatieId: string,
  petitionId: string,
  response: string,
  respondedByName: string,
  userId: string | null,
): void {
  const now = new Date().toISOString();
  usePetitionStore.getState().addResponse(asociatieId, petitionId, response, now, respondedByName);
  if (isSupabaseConfigured && userId) {
    void (async () => {
      try {
        await supabase
          .from('petitions')
          .update({ response, responded_at: now, responded_by_name: respondedByName })
          .eq('id', petitionId)
          .eq('asociatie_id', asociatieId);
      } catch (err) {
        reportError(err, { source: 'petitionApi.saveResponse' });
      }
    })();
  }
}

/**
 * Sign a petition: apply to the store synchronously (optimistic) then mirror
 * an insert into `petition_signatures` when a backend is configured and the
 * user has not yet signed. Signatures are immutable in the DB (one per
 * apartment per petition, enforced by the primary key).
 * Auto-forward: when the signing pushes the petition past its threshold, the
 * status is updated to 'inaintata' in the DB and an audit event is recorded.
 * In demo mode a local notification is emitted to the demo admin user.
 */
export function signPetition(
  asociatieId: string,
  petitionId: string,
  apartmentId: string | null,
): void {
  const store = usePetitionStore.getState();
  const alreadySigned = store.mySigned[petitionId] ?? false;
  if (alreadySigned) return;

  store.signPetition(asociatieId, petitionId);

  const updatedPetition = petitionsForAsociatie(
    usePetitionStore.getState().byAsociatie,
    asociatieId,
  ).items.find((p) => p.id === petitionId);

  const thresholdJustReached = updatedPetition && isThresholdReached(updatedPetition);

  if (thresholdJustReached) {
    recordAudit({
      action: 'petition.forwarded',
      entity: 'petition',
      entity_label: updatedPetition.title,
    });

    if (!isSupabaseConfigured) {
      useNotificationStore.getState().emit(
        createNotification({
          userId: DEMO_CURRENT_USER_ID,
          asociatieId: DEMO_ASOCIATIE.id,
          kind: 'generic',
          title: updatedPetition.title,
          body: '',
          link: '/app/petitii',
          priority: 'normal',
          data: { petitionId },
        }),
      );
    }
  }

  if (isSupabaseConfigured && apartmentId) {
    void (async () => {
      try {
        await supabase
          .from('petition_signatures')
          .insert({ petition_id: petitionId, apartment_id: apartmentId });

        if (thresholdJustReached) {
          await supabase
            .from('petitions')
            .update({ status: 'inaintata' })
            .eq('id', petitionId)
            .eq('asociatie_id', asociatieId);

          const { data: { session } } = await supabase.auth.getSession();
          if (session && updatedPetition) {
            persistAndFanOut(
              createNotification({
                userId: session.user.id,
                asociatieId,
                kind: 'generic',
                title: updatedPetition.title,
                body: '',
                link: '/app/petitii',
                priority: 'normal',
                data: { petitionId },
              }),
            );
          }
        }
      } catch (err) {
        reportError(err, { source: 'petitionApi.sign' });
      }
    })();
  }
}
