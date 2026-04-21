-- ProdForge - Auth + RLS + Profiles
-- Execute no SQL Editor do Supabase

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  created_at timestamptz not null default now()
);

alter table public.user_stories enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "user_stories_select_own" on public.user_stories;
create policy "user_stories_select_own"
on public.user_stories
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_stories_insert_own" on public.user_stories;
create policy "user_stories_insert_own"
on public.user_stories
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_stories_update_own" on public.user_stories;
create policy "user_stories_update_own"
on public.user_stories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
