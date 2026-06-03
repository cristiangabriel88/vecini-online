import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase';
import {
  type DataSubjectRequest,
  type DsrStatus,
  type DsrType,
  actionRequest as applyAction,
  makeRequest,
} from '@/features/gdpr/gdprLogic';
import { triggerErasure } from '@/features/gdpr/gdprErasureApi';

/**
 * Data-subject request queue (T06): export and erasure requests with the
 * admin-action audit trail (who actioned what, when). Persisted so demo mode
 * keeps a working queue offline; when a backend is present each new request and
 * each admin decision is mirrored, best-effort, to `data_subject_requests`.
 *
 * Erasure is irreversible, so completing it also records the subject's id in
 * `erasedUserIds` — the platform's offline marker that the account's identity
 * has been anonymized on retained records (the actual cross-store mutation runs
 * server-side; see DATA_RETENTION / DECISIONS.md).
 */
interface GdprState {
  requests: DataSubjectRequest[];
  /** Subject ids whose account has been erased/anonymized. */
  erasedUserIds: string[];

  request: (
    type: DsrType,
    subjectUserId: string,
    subjectName: string,
    asociatieId: string,
  ) => DataSubjectRequest;
  action: (
    id: string,
    status: Extract<DsrStatus, 'completed' | 'rejected'>,
    actor: string,
    note?: string | null,
  ) => void;
  isErased: (userId: string) => boolean;
}

function mirrorInsert(req: DataSubjectRequest): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase.from('data_subject_requests').insert({
        asociatie_id: req.asociatie_id,
        subject_user_id: req.subject_user_id,
        subject_name: req.subject_name,
        type: req.type,
        status: req.status,
        requested_at: req.requested_at,
      });
    } catch {
      /* mirroring is best-effort; the local queue is authoritative for the UI */
    }
  })();
}

function mirrorAction(req: DataSubjectRequest): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      await supabase
        .from('data_subject_requests')
        .update({
          status: req.status,
          actioned_at: req.actioned_at,
          actioned_by: req.actioned_by,
          note: req.note,
        })
        .eq('id', req.id);
    } catch {
      /* mirroring is best-effort */
    }
  })();
}

export const useGdprStore = create<GdprState>()(
  persist(
    (set, get) => ({
      requests: [],
      erasedUserIds: [],

      request: (type, subjectUserId, subjectName, asociatieId) => {
        const req = makeRequest(type, subjectUserId, subjectName, asociatieId);
        set({ requests: [req, ...get().requests] });
        mirrorInsert(req);
        return req;
      },

      action: (id, status, actor, note = null) => {
        let actioned: DataSubjectRequest | null = null;
        set({
          requests: get().requests.map((r) => {
            if (r.id !== id) return r;
            actioned = applyAction(r, status, actor, note);
            return actioned;
          }),
        });
        if (!actioned) return;
        const done: DataSubjectRequest = actioned;
        if (done.type === 'erasure' && done.status === 'completed') {
          const ids = get().erasedUserIds;
          if (!ids.includes(done.subject_user_id)) {
            set({ erasedUserIds: [...ids, done.subject_user_id] });
          }
          // Trigger server-side erasure execution behind isSupabaseConfigured.
          void triggerErasure(done.id);
        }
        mirrorAction(done);
      },

      isErased: (userId) => get().erasedUserIds.includes(userId),
    }),
    { name: 'vecini.gdpr' },
  ),
);
