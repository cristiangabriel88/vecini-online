-- T19: SaaS billing & plans
-- billing_plans   -- global lookup table (operator-managed)
-- subscriptions   -- one row per asociatie, RLS by asociatie_id
-- invoices        -- one row per billing cycle, RLS by asociatie_id

-- ============================================================
-- billing_plans (global, no per-tenant RLS needed)
-- ============================================================
create table if not exists public.billing_plans (
  id                 text primary key,
  name_ro            text not null,
  name_en            text not null,
  price_ron          numeric(10, 2) not null default 0,
  billing_interval   text not null default 'month' check (billing_interval in ('month', 'year')),
  max_apartments     int,
  max_members        int,
  max_admins         int,
  sort_order         int not null default 0
);

alter table public.billing_plans enable row level security;

-- Anyone authenticated may read plans (needed to render the plan cards).
drop policy if exists "billing_plans: authenticated read" on public.billing_plans;
create policy "billing_plans: authenticated read"
  on public.billing_plans for select
  using (auth.role() = 'authenticated');

-- Seed canonical plans (idempotent).
insert into public.billing_plans (id, name_ro, name_en, price_ron, billing_interval, max_apartments, max_members, max_admins, sort_order)
values
  ('plan-gratuit',  'Gratuit',  'Free',     0,  'month', 30,   60,   2,    0),
  ('plan-standard', 'Standard', 'Standard', 29, 'month', 100,  200,  5,    1),
  ('plan-premium',  'Premium',  'Premium',  59, 'month', null, null, null, 2)
on conflict (id) do update
  set name_ro          = excluded.name_ro,
      name_en          = excluded.name_en,
      price_ron        = excluded.price_ron,
      billing_interval = excluded.billing_interval,
      max_apartments   = excluded.max_apartments,
      max_members      = excluded.max_members,
      max_admins       = excluded.max_admins,
      sort_order       = excluded.sort_order;

-- ============================================================
-- subscriptions
-- ============================================================
create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  asociatie_id             uuid not null references public.asociatii (id) on delete cascade,
  plan_id                  text not null references public.billing_plans (id),
  status                   text not null default 'trialing'
                             check (status in ('trialing', 'active', 'past_due', 'unpaid', 'canceled')),
  current_period_start     timestamptz not null,
  current_period_end       timestamptz not null,
  trial_end_at             timestamptz,
  grace_period_end_at      timestamptz,
  canceled_at              timestamptz,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  created_at               timestamptz not null default now(),
  constraint subscriptions_one_per_asociatie unique (asociatie_id)
);

alter table public.subscriptions enable row level security;

-- Members may read their asociatie's subscription (to see the plan/status).
drop policy if exists "subscriptions: member read" on public.subscriptions;
create policy "subscriptions: member read"
  on public.subscriptions for select
  using (is_member(asociatie_id));

-- Only platform superadmins (via service-role Netlify function) may write.
-- No INSERT/UPDATE/DELETE policy for regular users; billing-checkout.ts uses service-role.

-- Superadmin cross-tenant read.
drop policy if exists "subscriptions: superadmin read" on public.subscriptions;
create policy "subscriptions: superadmin read"
  on public.subscriptions for select
  using (is_super_admin());

-- ============================================================
-- invoices
-- ============================================================
create table if not exists public.invoices (
  id               uuid primary key default gen_random_uuid(),
  asociatie_id     uuid not null references public.asociatii (id) on delete cascade,
  subscription_id  uuid not null references public.subscriptions (id) on delete cascade,
  plan_id          text not null references public.billing_plans (id),
  amount_ron       numeric(10, 2) not null,
  issued_at        timestamptz not null default now(),
  due_at           timestamptz not null,
  paid_at          timestamptz,
  period_start     timestamptz not null,
  period_end       timestamptz not null,
  stripe_invoice_id text
);

alter table public.invoices enable row level security;

-- Members (specifically admins) may read their asociatie's invoices.
drop policy if exists "invoices: member read" on public.invoices;
create policy "invoices: member read"
  on public.invoices for select
  using (is_member(asociatie_id));

-- Superadmin cross-tenant read.
drop policy if exists "invoices: superadmin read" on public.invoices;
create policy "invoices: superadmin read"
  on public.invoices for select
  using (is_super_admin());
