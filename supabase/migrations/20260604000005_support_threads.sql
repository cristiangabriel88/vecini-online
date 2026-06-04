-- vecini.online -- T99: support messenger (asociatie admin <-> platform superadmin)
--
-- A per-asociatie support channel: the asociatie's managers raise issues to the
-- platform team, the platform team replies. Scoped so only that asociatie's
-- admins/presedinte/comitet and the platform superadmins can read a thread.
--
-- Platform superadmin WRITES go through the service-role Netlify function
-- (support-admin.ts) that bypasses RLS. Only SELECT policies reference
-- is_super_admin() here, in line with the read-only platform RLS contract.

create table if not exists support_threads (
  id            uuid        primary key default gen_random_uuid(),
  asociatie_id  uuid        not null references asociatii(id) on delete cascade,
  asociatie_name text       not null,
  admin_user_id uuid        references users(id),
  admin_name    text        not null,
  subject       text        not null,
  status        text        not null default 'open' check (status in ('open', 'resolved')),
  created_at    timestamptz not null default now()
);
create index if not exists support_threads_asociatie_id_idx on support_threads (asociatie_id, created_at desc);

create table if not exists support_messages (
  id          uuid        primary key default gen_random_uuid(),
  thread_id   uuid        not null references support_threads(id) on delete cascade,
  sender      text        not null check (sender in ('admin', 'superadmin')),
  sender_name text        not null,
  body        text        not null,
  created_at  timestamptz not null default now(),
  read        boolean     not null default false
);
create index if not exists support_messages_thread_id_idx on support_messages (thread_id, created_at asc);

alter table support_threads enable row level security;
alter table support_messages enable row level security;

-- admin/presedinte/comitet: read their own asociatie's threads
create policy "admin reads own support threads"
  on support_threads for select to authenticated
  using (has_role(asociatie_id, array['admin','presedinte','comitet']));

-- admin/presedinte/comitet: open a new thread on behalf of their asociatie
create policy "admin inserts support thread"
  on support_threads for insert to authenticated
  with check (has_role(asociatie_id, array['admin','presedinte','comitet'])
              and admin_user_id = auth.uid());

-- admin/presedinte/comitet: toggle status (open/resolved)
create policy "admin updates support thread status"
  on support_threads for update to authenticated
  using (has_role(asociatie_id, array['admin','presedinte','comitet']));

-- superadmin: read all threads (cross-tenant, SELECT only per platform RLS contract)
create policy "superadmin reads all support threads"
  on support_threads for select to authenticated
  using (is_super_admin());

-- admin side: read messages in own asociatie's threads
create policy "admin reads messages in own threads"
  on support_messages for select to authenticated
  using (
    exists (
      select 1 from support_threads t
      where t.id = thread_id
        and has_role(t.asociatie_id, array['admin','presedinte','comitet'])
    )
  );

-- admin side: write messages (sender must be 'admin')
create policy "admin inserts messages as admin"
  on support_messages for insert to authenticated
  with check (
    sender = 'admin'
    and exists (
      select 1 from support_threads t
      where t.id = thread_id
        and has_role(t.asociatie_id, array['admin','presedinte','comitet'])
    )
  );

-- superadmin: read all messages (SELECT only per platform RLS contract)
create policy "superadmin reads all support messages"
  on support_messages for select to authenticated
  using (is_super_admin());

-- admin marks superadmin messages as read (UPDATE own-side only)
create policy "admin marks superadmin messages read"
  on support_messages for update to authenticated
  using (
    sender = 'superadmin'
    and exists (
      select 1 from support_threads t
      where t.id = thread_id
        and has_role(t.asociatie_id, array['admin','presedinte','comitet'])
    )
  );
