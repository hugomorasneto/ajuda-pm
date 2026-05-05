-- ProdForge - Admin read-only access
-- Apply after auth-rls.sql, analytics-admin.sql and learning-progress.sql.

alter table if exists public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table if exists public.leads enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.user_stories enable row level security;
alter table if exists public.learning_progress enable row level security;
alter table if exists public.tracking_events enable row level security;

grant select on table public.leads to authenticated;
grant select on table public.profiles to authenticated;
grant select on table public.user_stories to authenticated;
grant select on table public.learning_progress to authenticated;
grant select on table public.tracking_events to authenticated;

drop policy if exists "leads_select_admin" on public.leads;
create policy "leads_select_admin"
on public.leads
for select
to authenticated
using (public.is_admin());

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "user_stories_select_admin" on public.user_stories;
create policy "user_stories_select_admin"
on public.user_stories
for select
to authenticated
using (public.is_admin());

drop policy if exists "learning_progress_select_admin" on public.learning_progress;
create policy "learning_progress_select_admin"
on public.learning_progress
for select
to authenticated
using (public.is_admin());

drop policy if exists "tracking_events_select_admin" on public.tracking_events;
create policy "tracking_events_select_admin"
on public.tracking_events
for select
to authenticated
using (public.is_admin());
