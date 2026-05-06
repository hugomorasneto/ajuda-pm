-- ProdForge - Track project member sources and recalculate team-derived access.
-- A project member can come from direct project access or from membership in one or more teams.

create table if not exists public.project_member_sources (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id, source_type, source_id),
  constraint project_member_sources_source_type_check check (source_type in ('direct', 'team')),
  constraint project_member_sources_role_check check (role in ('owner', 'admin', 'member', 'viewer'))
);

create index if not exists idx_project_member_sources_user_id
  on public.project_member_sources (user_id);

create index if not exists idx_project_member_sources_source
  on public.project_member_sources (source_type, source_id);

drop trigger if exists trg_project_member_sources_set_updated_at on public.project_member_sources;
create trigger trg_project_member_sources_set_updated_at
before update on public.project_member_sources
for each row execute function public.set_updated_at();

alter table public.project_member_sources enable row level security;

revoke all privileges on public.project_member_sources from authenticated;

drop policy if exists "project_member_sources_select_project_member" on public.project_member_sources;
create policy "project_member_sources_select_project_member"
on public.project_member_sources
for select
to authenticated
using (public.is_project_member(project_id));

create or replace function public.project_member_role_rank(p_role text)
returns integer
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_role = 'owner' then 4
    when p_role = 'admin' then 3
    when p_role = 'member' then 2
    when p_role = 'viewer' then 1
    else 0
  end;
$$;

create or replace function public.project_member_role_from_rank(p_rank integer)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_rank >= 4 then 'owner'
    when p_rank = 3 then 'admin'
    when p_rank = 2 then 'member'
    when p_rank = 1 then 'viewer'
    else null
  end;
$$;

create or replace function public.refresh_project_member_from_sources(
  p_project_id uuid,
  p_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select public.project_member_role_from_rank(max(public.project_member_role_rank(pms.role)))
    into v_role
  from public.project_member_sources pms
  where pms.project_id = p_project_id
    and pms.user_id = p_user_id;

  if v_role is null then
    delete from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = p_user_id;

    return null;
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, p_user_id, v_role)
  on conflict (project_id, user_id) do update
    set role = excluded.role;

  return v_role;
end;
$$;

revoke all on function public.project_member_role_rank(text) from public;
revoke all on function public.project_member_role_from_rank(integer) from public;
revoke all on function public.refresh_project_member_from_sources(uuid, uuid) from public;

insert into public.project_member_sources (project_id, user_id, source_type, source_id, role, created_at, updated_at)
select
  pm.project_id,
  pm.user_id,
  'direct',
  pm.project_id,
  pm.role,
  pm.created_at,
  pm.created_at
from public.project_members pm
where pm.role in ('owner', 'admin')
   or not exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where t.project_id = pm.project_id
      and tm.user_id = pm.user_id
  )
on conflict (project_id, user_id, source_type, source_id) do update
  set role = excluded.role;

insert into public.project_member_sources (project_id, user_id, source_type, source_id, role, created_at, updated_at)
select
  t.project_id,
  tm.user_id,
  'team',
  tm.team_id,
  public.project_role_from_team_role(tm.role),
  tm.created_at,
  tm.created_at
from public.team_members tm
join public.teams t on t.id = tm.team_id
on conflict (project_id, user_id, source_type, source_id) do update
  set role = excluded.role;

create or replace function public.handle_project_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_member_sources (project_id, user_id, source_type, source_id, role)
  values (new.id, new.owner_id, 'direct', new.id, 'owner')
  on conflict (project_id, user_id, source_type, source_id) do update
    set role = 'owner';

  perform public.refresh_project_member_from_sources(new.id, new.owner_id);

  return new;
end;
$$;

create or replace function public.add_project_member_by_email(
  p_project_id uuid,
  p_email text,
  p_role text default 'member'
)
returns table (
  project_id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text := coalesce(nullif(trim(p_role), ''), 'member');
begin
  if not public.can_manage_project(p_project_id) then
    raise exception 'Apenas responsáveis e administradores do projeto podem adicionar membros.';
  end if;

  if v_role not in ('admin', 'member', 'viewer') then
    raise exception 'Papel de membro inválido.';
  end if;

  select p.id into v_user_id
  from public.profiles p
  where lower(p.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'Usuário não encontrado para esse e-mail.';
  end if;

  if v_user_id = auth.uid() then
    raise exception 'Você não pode alterar seu próprio papel por aqui.';
  end if;

  if exists (
    select 1
    from public.project_member_sources pms
    where pms.project_id = p_project_id
      and pms.user_id = v_user_id
      and pms.role = 'owner'
  ) then
    raise exception 'O owner do projeto não pode ter o papel alterado por aqui.';
  end if;

  insert into public.project_member_sources (project_id, user_id, source_type, source_id, role)
  values (p_project_id, v_user_id, 'direct', p_project_id, v_role)
  on conflict (project_id, user_id, source_type, source_id) do update
    set role = excluded.role;

  perform public.refresh_project_member_from_sources(p_project_id, v_user_id);

  return query
    select
      pm.project_id,
      pm.user_id,
      p.email,
      pm.role,
      pm.created_at
    from public.project_members pm
    join public.profiles p on p.id = pm.user_id
    where pm.project_id = p_project_id
      and pm.user_id = v_user_id;
end;
$$;

create or replace function public.update_project_member_role(
  p_project_id uuid,
  p_member_user_id uuid,
  p_role text
)
returns table (
  project_id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_role text;
  v_role text := coalesce(nullif(trim(p_role), ''), 'member');
begin
  if not public.can_manage_project(p_project_id) then
    raise exception 'Apenas responsáveis e administradores do projeto podem alterar papéis.';
  end if;

  if p_member_user_id is null then
    raise exception 'Membro não informado.';
  end if;

  if p_member_user_id = auth.uid() then
    raise exception 'Você não pode alterar seu próprio papel por aqui.';
  end if;

  if v_role not in ('admin', 'member', 'viewer') then
    raise exception 'Papel de membro inválido.';
  end if;

  select pm.role into v_current_role
  from public.project_members pm
  where pm.project_id = p_project_id
    and pm.user_id = p_member_user_id;

  if v_current_role is null then
    raise exception 'Membro não encontrado neste projeto.';
  end if;

  if v_current_role = 'owner' then
    raise exception 'O owner do projeto não pode ter o papel alterado por aqui.';
  end if;

  insert into public.project_member_sources (project_id, user_id, source_type, source_id, role)
  values (p_project_id, p_member_user_id, 'direct', p_project_id, v_role)
  on conflict (project_id, user_id, source_type, source_id) do update
    set role = excluded.role;

  perform public.refresh_project_member_from_sources(p_project_id, p_member_user_id);

  return query
    select
      pm.project_id,
      pm.user_id,
      p.email,
      pm.role,
      pm.created_at
    from public.project_members pm
    join public.profiles p on p.id = pm.user_id
    where pm.project_id = p_project_id
      and pm.user_id = p_member_user_id;
end;
$$;

create or replace function public.remove_project_member(
  p_project_id uuid,
  p_member_user_id uuid
)
returns table (
  project_id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_role text;
  v_email text;
  v_created_at timestamptz;
begin
  if not public.can_manage_project(p_project_id) then
    raise exception 'Apenas responsáveis e administradores do projeto podem remover membros.';
  end if;

  if p_member_user_id is null then
    raise exception 'Membro não informado.';
  end if;

  if p_member_user_id = auth.uid() then
    raise exception 'Você não pode remover seu próprio acesso por aqui.';
  end if;

  select pm.role, p.email, pm.created_at
    into v_current_role, v_email, v_created_at
  from public.project_members pm
  join public.profiles p on p.id = pm.user_id
  where pm.project_id = p_project_id
    and pm.user_id = p_member_user_id;

  if v_current_role is null then
    raise exception 'Membro não encontrado neste projeto.';
  end if;

  if v_current_role = 'owner' then
    raise exception 'O owner do projeto não pode ser removido por aqui.';
  end if;

  delete from public.project_member_sources pms
  where pms.project_id = p_project_id
    and pms.user_id = p_member_user_id
    and pms.source_type = 'direct';

  delete from public.team_members tm
  using public.teams t
  where t.id = tm.team_id
    and t.project_id = p_project_id
    and tm.user_id = p_member_user_id;

  delete from public.project_member_sources pms
  where pms.project_id = p_project_id
    and pms.user_id = p_member_user_id
    and pms.source_type = 'team';

  perform public.refresh_project_member_from_sources(p_project_id, p_member_user_id);

  return query
    select
      p_project_id,
      p_member_user_id,
      v_email,
      v_current_role,
      v_created_at;
end;
$$;

create or replace function public.sync_project_member_from_team_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_team_id uuid;
  v_user_id uuid;
  v_role text;
begin
  v_team_id := coalesce(new.team_id, old.team_id);
  v_user_id := coalesce(new.user_id, old.user_id);

  select t.project_id into v_project_id
  from public.teams t
  where t.id = v_team_id;

  if v_project_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    delete from public.project_member_sources pms
    where pms.project_id = v_project_id
      and pms.user_id = v_user_id
      and pms.source_type = 'team'
      and pms.source_id = v_team_id;
  else
    v_role := public.project_role_from_team_role(new.role);

    insert into public.project_member_sources (project_id, user_id, source_type, source_id, role)
    values (v_project_id, v_user_id, 'team', v_team_id, v_role)
    on conflict (project_id, user_id, source_type, source_id) do update
      set role = excluded.role;
  end if;

  perform public.refresh_project_member_from_sources(v_project_id, v_user_id);

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists on_team_member_saved_sync_project_member on public.team_members;
drop trigger if exists on_team_member_deleted_sync_project_member on public.team_members;
create trigger on_team_member_saved_sync_project_member
after insert or update of role on public.team_members
for each row execute function public.sync_project_member_from_team_member();

create trigger on_team_member_deleted_sync_project_member
after delete on public.team_members
for each row execute function public.sync_project_member_from_team_member();

with affected_members as (
  select distinct project_id, user_id
  from public.project_member_sources
)
select public.refresh_project_member_from_sources(project_id, user_id)
from affected_members;

revoke all on function public.handle_project_owner_member() from public;
revoke all on function public.add_project_member_by_email(uuid, text, text) from public;
revoke all on function public.update_project_member_role(uuid, uuid, text) from public;
revoke all on function public.remove_project_member(uuid, uuid) from public;
revoke all on function public.sync_project_member_from_team_member() from public;

grant execute on function public.add_project_member_by_email(uuid, text, text) to authenticated;
grant execute on function public.update_project_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_project_member(uuid, uuid) to authenticated;
