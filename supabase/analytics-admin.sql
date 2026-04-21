-- ProdForge - Analytics foundation + admin role preparation
-- Run this script in Supabase SQL Editor

alter table if exists public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  event_name text not null,
  event_category text null,
  page_path text null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tracking_events_created_at
  on public.tracking_events (created_at desc);

create index if not exists idx_tracking_events_event_name
  on public.tracking_events (event_name);

create index if not exists idx_tracking_events_user_id
  on public.tracking_events (user_id);

alter table public.tracking_events enable row level security;

drop policy if exists "tracking_events_insert_anon_or_auth" on public.tracking_events;
create policy "tracking_events_insert_anon_or_auth"
on public.tracking_events
for insert
to anon, authenticated
with check (
  (auth.role() = 'anon' and user_id is null)
  or
  (auth.role() = 'authenticated' and (user_id = auth.uid() or user_id is null))
);

drop policy if exists "tracking_events_select_own" on public.tracking_events;
create policy "tracking_events_select_own"
on public.tracking_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "tracking_events_select_admin" on public.tracking_events;
create policy "tracking_events_select_admin"
on public.tracking_events
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

