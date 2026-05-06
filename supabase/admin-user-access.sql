-- ProdForge - Administração de plano e cota de forjas por usuário.
-- Apply after auth-rls.sql and admin-readonly.sql.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table if exists public.profiles
  add column if not exists forge_limit_override integer null,
  add column if not exists access_notes text null,
  add column if not exists access_updated_by uuid null references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_forge_limit_override_check'
  ) then
    alter table public.profiles
      add constraint profiles_forge_limit_override_check
      check (
        forge_limit_override is null
        or (forge_limit_override >= 0 and forge_limit_override <= 9999)
      );
  end if;
end $$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

revoke insert, update, delete on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

create table if not exists public.admin_user_access_logs (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  updated_by uuid null references auth.users(id) on delete set null,
  previous_plan text null,
  next_plan text not null,
  previous_forge_limit_override integer null,
  next_forge_limit_override integer null,
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_user_access_logs_target_user_id
  on public.admin_user_access_logs (target_user_id, created_at desc);

create index if not exists idx_admin_user_access_logs_updated_by
  on public.admin_user_access_logs (updated_by, created_at desc);

alter table public.admin_user_access_logs enable row level security;

revoke insert, update, delete on table public.admin_user_access_logs from anon, authenticated;
grant select on table public.admin_user_access_logs to authenticated;

drop policy if exists "admin_user_access_logs_select_admin" on public.admin_user_access_logs;
create policy "admin_user_access_logs_select_admin"
on public.admin_user_access_logs
for select
to authenticated
using (public.is_admin());

create or replace function public.admin_update_user_access(
  p_user_id uuid,
  p_plan text,
  p_forge_limit_override integer default null,
  p_notes text default null
)
returns table (
  id uuid,
  email text,
  plan text,
  role text,
  forge_limit_override integer,
  access_notes text,
  access_updated_by uuid,
  updated_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_previous public.profiles%rowtype;
  v_plan text := lower(btrim(coalesce(p_plan, '')));
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Apenas administradores podem alterar acesso de usuários.'
      using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'Usuário não informado.'
      using errcode = '22023';
  end if;

  if v_plan not in ('free', 'premium') then
    raise exception 'Plano inválido.'
      using errcode = '22023';
  end if;

  if p_forge_limit_override is not null and (p_forge_limit_override < 0 or p_forge_limit_override > 9999) then
    raise exception 'Limite de forjas inválido. Use um número inteiro entre 0 e 9999.'
      using errcode = '22023';
  end if;

  select pr.*
    into v_previous
  from public.profiles pr
  where pr.id = p_user_id
  for update;

  if not found then
    raise exception 'Usuário não encontrado.'
      using errcode = 'P0002';
  end if;

  update public.profiles pr
  set plan = v_plan,
      forge_limit_override = p_forge_limit_override,
      access_notes = v_notes,
      access_updated_by = v_actor_id,
      updated_at = now()
  where pr.id = p_user_id
  returning
    pr.id,
    pr.email,
    pr.plan,
    pr.role,
    pr.forge_limit_override,
    pr.access_notes,
    pr.access_updated_by,
    pr.updated_at,
    pr.created_at
  into
    id,
    email,
    plan,
    role,
    forge_limit_override,
    access_notes,
    access_updated_by,
    updated_at,
    created_at;

  insert into public.admin_user_access_logs (
    target_user_id,
    updated_by,
    previous_plan,
    next_plan,
    previous_forge_limit_override,
    next_forge_limit_override,
    notes
  )
  values (
    p_user_id,
    v_actor_id,
    v_previous.plan,
    v_plan,
    v_previous.forge_limit_override,
    p_forge_limit_override,
    v_notes
  );

  return next;
end;
$$;

revoke all on function public.admin_update_user_access(uuid, text, integer, text) from public;
grant execute on function public.admin_update_user_access(uuid, text, integer, text) to authenticated;
