// Netlify Function: SaaS billing plan upgrade (T19).
//
// Security model:
//  - POST only.
//  - Requires isSupabaseAdminConfigured().
//  - Caller resolved server-side via verifyBearerToken().
//  - asociatie_id ownership verified: caller must be an admin/presedinte of the target asociatie.
//  - In live mode: updates subscriptions row via service-role (Stripe integration is a stub;
//    replace the mock block with real Stripe calls when billing goes live).
//  - Returns: { ok: true, invoice_id } on success.
//
// HTTP responses:
//  405  method-not-allowed
//  503  backend-not-configured
//  401  unauthorized
//  403  forbidden (caller is not admin of the target asociatie)
//  422  validation-failed (missing/invalid plan_id or asociatie_id)
//  200  { ok: true, invoice_id }
//
// Privacy: never log the bearer token or user id.

import {
  isSupabaseAdminConfigured,
  supabaseAdmin,
  verifyBearerToken,
} from './_shared/supabaseAdmin';

const VALID_PLAN_IDS = ['plan-gratuit', 'plan-standard', 'plan-premium'] as const;
type PlanId = (typeof VALID_PLAN_IDS)[number];

const PLAN_PRICES: Record<PlanId, number> = {
  'plan-gratuit': 0,
  'plan-standard': 29,
  'plan-premium': 59,
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface CheckoutPayload {
  plan_id?: unknown;
  asociatie_id?: unknown;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });
  if (!isSupabaseAdminConfigured()) return json(503, { error: 'backend-not-configured' });

  const { userId, error: authError } = await verifyBearerToken(req.headers.get('Authorization'));
  if (!userId) return json(401, { error: authError ?? 'unauthorized' });

  let payload: CheckoutPayload;
  try {
    payload = (await req.json()) as CheckoutPayload;
  } catch {
    return json(400, { error: 'invalid-json' });
  }

  const planId = typeof payload.plan_id === 'string' ? payload.plan_id : '';
  const asociatieId = typeof payload.asociatie_id === 'string' ? payload.asociatie_id : '';

  if (!planId || !VALID_PLAN_IDS.includes(planId as PlanId)) {
    return json(422, { error: 'invalid-plan_id' });
  }
  if (!asociatieId) return json(422, { error: 'asociatie_id required' });

  // Verify caller is admin/presedinte of the target asociatie.
  const { data: memberRow } = await supabaseAdmin()
    .from('memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('asociatie_id', asociatieId)
    .in('role', ['admin', 'presedinte'])
    .maybeSingle();
  if (!memberRow) return json(403, { error: 'forbidden' });

  const now = new Date().toISOString();
  const periodStart = now;
  const periodEnd = new Date(Date.now() + 30 * 86_400_000).toISOString();

  // Upsert subscription (Stripe stub -- replace with real Stripe API in production).
  const { data: subData, error: subErr } = await supabaseAdmin()
    .from('subscriptions')
    .upsert(
      {
        asociatie_id: asociatieId,
        plan_id: planId,
        status: 'active',
        current_period_start: periodStart,
        current_period_end: periodEnd,
        trial_end_at: null,
        grace_period_end_at: null,
        canceled_at: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
      },
      { onConflict: 'asociatie_id' },
    )
    .select('id')
    .maybeSingle();

  if (subErr || !subData) return json(500, { error: 'upsert-failed' });

  const subscriptionId = (subData as { id: string }).id;
  const amountRon = PLAN_PRICES[planId as PlanId];

  const { data: invData, error: invErr } = await supabaseAdmin()
    .from('invoices')
    .insert({
      asociatie_id: asociatieId,
      subscription_id: subscriptionId,
      plan_id: planId,
      amount_ron: amountRon,
      issued_at: now,
      due_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      paid_at: amountRon === 0 ? now : null,
      period_start: periodStart,
      period_end: periodEnd,
      stripe_invoice_id: null,
    })
    .select('id')
    .maybeSingle();

  if (invErr) return json(500, { error: 'invoice-insert-failed' });

  return json(200, { ok: true, invoice_id: (invData as { id: string } | null)?.id ?? null });
};
