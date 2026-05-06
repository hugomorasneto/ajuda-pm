-- ProdForge - Teams foundation scoped to projects.
-- Teams are an advanced project feature, not a top-level workspace route.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_name_not_empty check (nullif(btrim(name), '') is not null)
);

create index if not exists idx_teams_project_id
  on public.teams (project_id);

create index if not exists idx_teams_owner_id
  on public.teams (owner_id);

drop trigger if exists trg_teams_set_updated_at on public.teams;
create trigger trg_teams_set_updated_at
before update on public.teams
for each row
execute function public.set_updated_at();

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id),
  constraint team_members_role_check check (role in ('owner', 'admin', 'member', 'viewer'))
);

create index if not exists idx_team_members_user_id
  on public.team_members (user_id);

create index if not exists idx_team_members_team_role
  on public.team_members (team_id, role);

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.team_role(p_team_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select tm.role
  from public.team_members tm
  where tm.team_id = p_team_id
    and tm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.team_project_id(p_team_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.project_id
  from public.teams t
  where t.id = p_team_id
  limit 1;
$$;

create or replace function public.can_view_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_team_member(p_team_id)
    or public.is_project_member(public.team_project_id(p_team_id)),
    false
  );
$$;

create or replace function public.can_manage_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.can_manage_project(public.team_project_id(p_team_id))
    or public.team_role(p_team_id) in ('owner', 'admin'),
    false
  );
$$;

revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.team_role(uuid) from public;
revoke all on function public.team_project_id(uuid) from public;
revoke all on function public.can_view_team(uuid) from public;
revoke all on function public.can_manage_team(uuid) from public;

grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.team_role(uuid) to authenticated;
grant execute on function public.team_project_id(uuid) to authenticated;
grant execute on function public.can_view_team(uuid) to authenticated;
grant execute on function public.can_manage_team(uuid) to authenticated;

create or replace function public.handle_team_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (team_id, user_id) do update
    set role = 'owner';

  return new;
end;
$$;

drop trigger if exists on_team_created_add_owner_member on public.teams;
create trigger on_team_created_add_owner_member
after insert on public.teams
for each row execute function public.handle_team_owner_member();

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;

drop policy if exists "teams_select_project_or_team_member" on public.teams;
create policy "teams_select_project_or_team_member"
on public.teams
for select
to authenticated
using (
  public.is_project_member(project_id)
  or public.is_team_member(id)
);

drop policy if exists "teams_insert_project_manager" on public.teams;
create policy "teams_insert_project_manager"
on public.teams
for insert
to authenticated
with check (
  auth.uid() = owner_id
  and public.can_manage_project(project_id)
);

drop policy if exists "teams_update_manager" on public.teams;
create policy "teams_update_manager"
on public.teams
for update
to authenticated
using (public.can_manage_team(id))
with check (public.can_manage_team(id));

drop policy if exists "teams_delete_manager" on public.teams;
create policy "teams_delete_manager"
on public.teams
for delete
to authenticated
using (public.can_manage_team(id));

drop policy if exists "team_members_select_team_viewer" on public.team_members;
create policy "team_members_select_team_viewer"
on public.team_members
for select
to authenticated
using (public.can_view_team(team_id));

drop policy if exists "team_members_insert_team_manager" on public.team_members;
create policy "team_members_insert_team_manager"
on public.team_members
for insert
to authenticated
with check (public.can_manage_team(team_id));

drop policy if exists "team_members_update_team_manager" on public.team_members;
create policy "team_members_update_team_manager"
on public.team_members
for update
to authenticated
using (public.can_manage_team(team_id))
with check (public.can_manage_team(team_id));

drop policy if exists "team_members_delete_team_manager" on public.team_members;
create policy "team_members_delete_team_manager"
on public.team_members
for delete
to authenticated
using (public.can_manage_team(team_id));

create or replace function public.project_role_from_team_role(p_team_role text)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_team_role = 'viewer' then 'viewer'
    else 'member'
  end;
$$;

create or replace function public.merge_project_member_role(
  p_existing_role text,
  p_candidate_role text
)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_existing_role = 'owner' then 'owner'
    when p_existing_role = 'admin' then 'admin'
    when p_existing_role = 'member' then 'member'
    when p_candidate_role = 'member' then 'member'
    else 'viewer'
  end;
$$;

revoke all on function public.project_role_from_team_role(text) from public;
revoke all on function public.merge_project_member_role(text, text) from public;

grant execute on function public.project_role_from_team_role(text) to authenticated;
grant execute on function public.merge_project_member_role(text, text) to authenticated;

create or replace function public.sync_project_member_from_team_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_project_role text;
begin
  select t.project_id into v_project_id
  from public.teams t
  where t.id = new.team_id;

  if v_project_id is null then
    return new;
  end if;

  v_project_role := public.project_role_from_team_role(new.role);

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, new.user_id, v_project_role)
  on conflict (project_id, user_id) do update
    set role = public.merge_project_member_role(
      public.project_members.role,
      excluded.role
    );

  return new;
end;
$$;

drop trigger if exists on_team_member_saved_sync_project_member on public.team_members;
create trigger on_team_member_saved_sync_project_member
after insert or update of role on public.team_members
for each row execute function public.sync_project_member_from_team_member();

with team_project_members as (
  select
    t.project_id,
    tm.user_id,
    case
      when bool_or(public.project_role_from_team_role(tm.role) = 'member') then 'member'
      else 'viewer'
    end as role
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  group by t.project_id, tm.user_id
)
insert into public.project_members (project_id, user_id, role)
select project_id, user_id, role
from team_project_members
on conflict (project_id, user_id) do update
  set role = public.merge_project_member_role(
    public.project_members.role,
    excluded.role
  );

create or replace function public.list_team_members(p_team_id uuid)
returns table (
  team_id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_view_team(p_team_id) then
    raise exception 'Acesso negado ao time informado.';
  end if;

  return query
    select
      tm.team_id,
      tm.user_id,
      p.email,
      tm.role,
      tm.created_at
    from public.team_members tm
    join public.profiles p on p.id = tm.user_id
    where tm.team_id = p_team_id
    order by
      case tm.role
        when 'owner' then 1
        when 'admin' then 2
        when 'member' then 3
        else 4
      end,
      p.email;
end;
$$;

create or replace function public.add_team_member_by_email(
  p_team_id uuid,
  p_email text,
  p_role text default 'member'
)
returns table (
  team_id uuid,
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
  if not public.can_manage_team(p_team_id) then
    raise exception 'Apenas administradores do projeto ou do time podem adicionar membros.';
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

  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, v_user_id, v_role)
  on conflict on constraint team_members_pkey do update
    set role = excluded.role;

  return query
    select
      tm.team_id,
      tm.user_id,
      p.email,
      tm.role,
      tm.created_at
    from public.team_members tm
    join public.profiles p on p.id = tm.user_id
    where tm.team_id = p_team_id
      and tm.user_id = v_user_id;
end;
$$;

revoke all on function public.list_team_members(uuid) from public;
revoke all on function public.add_team_member_by_email(uuid, text, text) from public;

grant execute on function public.list_team_members(uuid) to authenticated;
grant execute on function public.add_team_member_by_email(uuid, text, text) to authenticated;
