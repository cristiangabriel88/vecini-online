// generate-pv-pdf: server-side PDF generation for F10 AGA proces-verbal (T37).
//
// Authorization:
//   - POST only.
//   - Requires `Authorization: Bearer <access_token>` from the caller.
//   - Caller identity resolved server-side via verifyBearerToken().
//   - The caller must be an active member of the asociatie that owns the meeting.
//
// PDF generation:
//   - Meeting data is read from the DB (never from the client body) to prevent
//     content forgery.
//   - `generateProcesVerbal` from pvGenerator.ts is the single content source.
//   - `buildPvPdf` renders a well-structured A4 PDF with an asociatie header
//     and page footer, using Identity-H encoding for full Unicode support.
//
// Returns: application/pdf binary on success.
//
// Privacy: no meeting content, user ids or email addresses are ever logged.

import { generateProcesVerbal } from '../../src/shared/lib/pvGenerator';
import { buildPvPdf } from './_shared/pdfDoc';
import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';
import type {
  AgaAgendaItem,
  AgaDecision,
  AgaMeeting,
  AgaProxy,
  AgaRsvp,
  MajorityRule,
} from '../../src/shared/types/domain';

function errJson(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const MAJORITY_RULES = new Set(['simple', 'absolute', 'qualified_2_3']);

function toMajorityRule(v: string | null): MajorityRule {
  return v && MAJORITY_RULES.has(v) ? (v as MajorityRule) : 'simple';
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return errJson(405, 'method-not-allowed');
  if (!isSupabaseAdminConfigured()) return errJson(503, 'backend-not-configured');

  // Verify caller identity
  const { userId, error: authErr } = await verifyBearerToken(
    req.headers.get('authorization'),
  );
  if (!userId) return errJson(401, authErr ?? 'unauthorized');

  // Parse request
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errJson(400, 'invalid-json');
  }
  const meetingId = (body as Record<string, unknown>)?.meetingId;
  if (typeof meetingId !== 'string' || meetingId.trim() === '') {
    return errJson(400, 'missing-meetingId');
  }

  const db = supabaseAdmin();

  // Fetch the meeting row
  const { data: agaRow, error: agaErr } = await db
    .from('agas')
    .select(
      'id, asociatie_id, title, scheduled_at, location, scheduled_online, required_quorum_percent, status',
    )
    .eq('id', meetingId)
    .single();

  if (agaErr || !agaRow) return errJson(404, 'meeting-not-found');

  // Verify the caller is an active member of this asociatie
  const { data: membership } = await db
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('asociatie_id', agaRow.asociatie_id)
    .is('ended_at', null)
    .limit(1);
  if (!membership || membership.length === 0) return errJson(403, 'forbidden');

  // Fetch supporting data in parallel
  const [agendaRes, attendeeRes, voteRes, aptRes, asocRes] = await Promise.all([
    db
      .from('aga_agenda_items')
      .select('id, sort_order, title, description, decision_type')
      .eq('aga_id', meetingId),
    db
      .from('aga_attendees')
      .select('id, user_id, present, is_proxy')
      .eq('aga_id', meetingId),
    db.from('aga_votes').select('agenda_item_id, decision').eq('aga_id', meetingId),
    db
      .from('apartments')
      .select('id', { count: 'exact', head: true })
      .eq('asociatie_id', agaRow.asociatie_id),
    db.from('asociatii').select('name').eq('id', agaRow.asociatie_id).single(),
  ]);

  const agendaRows = agendaRes.data ?? [];
  const attendeeRows = attendeeRes.data ?? [];
  const voteRows = voteRes.data ?? [];
  const totalApartments = aptRes.count ?? 0;
  const asociatieName = (asocRes.data as { name?: string } | null)?.name ?? 'Asociatia de Proprietari';

  // Tally votes per agenda item
  const tallyMap = new Map<string, { pentru: number; contra: number; abtinere: number }>();
  for (const v of voteRows) {
    if (!v.agenda_item_id) continue;
    const dec = v.decision as AgaDecision | null;
    if (!dec || !['pentru', 'contra', 'abtinere'].includes(dec)) continue;
    const cur = tallyMap.get(v.agenda_item_id) ?? { pentru: 0, contra: 0, abtinere: 0 };
    cur[dec] += 1;
    tallyMap.set(v.agenda_item_id, cur);
  }

  // Assemble agenda items
  const agenda: AgaAgendaItem[] = agendaRows
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((g) => ({
      id: g.id,
      aga_id: meetingId,
      sort_order: g.sort_order ?? 0,
      title: g.title ?? '',
      description: g.description ?? '',
      majority_rule: toMajorityRule(g.decision_type ?? null),
      votes: tallyMap.get(g.id) ?? { pentru: 0, contra: 0, abtinere: 0 },
      my_vote: null, // server-side view: no personal ballot overlay
    }));

  // Count proxies and direct attendees
  const proxyRows = attendeeRows.filter((t) => t.is_proxy);
  const presentRows = attendeeRows.filter((t) => !t.is_proxy && t.present);

  const proxies: AgaProxy[] = proxyRows.map((t) => ({
    id: t.id,
    grantor_apartment: '',
    proxy_holder: '',
    document_name: null,
    document_url: null,
    votes: {},
  }));

  const myRsvp: AgaRsvp = null; // server-side PV has no personal perspective

  const meeting: AgaMeeting = {
    id: agaRow.id,
    asociatie_id: agaRow.asociatie_id,
    title: agaRow.title ?? '',
    scheduled_at: agaRow.scheduled_at ?? '',
    location: agaRow.location ?? '',
    scheduled_online: agaRow.scheduled_online ?? false,
    required_quorum_percent: agaRow.required_quorum_percent ?? 50,
    status: agaRow.status as AgaMeeting['status'],
    total_apartments: totalApartments,
    represented_apartments: presentRows.length,
    my_rsvp: myRsvp,
    agenda,
    proxies,
  };

  // Generate content and build PDF
  const pvText = generateProcesVerbal(meeting);
  const pdfBytes = buildPvPdf(pvText, asociatieName);

  const safeMeetingTitle = (agaRow.title ?? 'pv')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/-+$/, '');

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proces-verbal-${safeMeetingTitle}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
};
