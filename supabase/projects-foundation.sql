-- ProdForge - Optional projects foundation.
-- Adds project organization without making projects mandatory for user story generation.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_not_empty check (nullif(btrim(name), '') is not null)
);

create index if not exists idx_projects_owner_id
  on public.projects (owner_id);

drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id),
  constraint project_members_role_check check (role in ('owner', 'admin', 'member', 'viewer'))
);

create index if not exists idx_project_members_user_id
  on public.project_members (user_id);

create index if not exists idx_project_members_project_role
  on public.project_members (project_id, role);

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  );
$$;

create or replace function public.project_role(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pm.role
  from public.project_members pm
  where pm.project_id = p_project_id
    and pm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_manage_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.project_role(p_project_id) in ('owner', 'admin'), false);
$$;

revoke all on function public.is_project_member(uuid) from public;
revoke all on function public.project_role(uuid) from public;
revoke all on function public.can_manage_project(uuid) from public;

grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.project_role(uuid) to authenticated;
grant execute on function public.can_manage_project(uuid) to authenticated;

create or replace function public.handle_project_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (project_id, user_id) do update
    set role = 'owner';

  return new;
end;
$$;

drop trigger if exists on_project_created_add_owner_member on public.projects;
create trigger on_project_created_add_owner_member
after insert on public.projects
for each row execute function public.handle_project_owner_member();

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;

drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member"
on public.projects
for select
to authenticated
using (
  auth.uid() = owner_id
  or public.is_project_member(id)
);

drop policy if exists "projects_insert_owner" on public.projects;
create policy "projects_insert_owner"
on public.projects
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "projects_update_manager" on public.projects;
create policy "projects_update_manager"
on public.projects
for update
to authenticated
using (public.can_manage_project(id))
with check (public.can_manage_project(id));

drop policy if exists "projects_delete_manager" on public.projects;
create policy "projects_delete_manager"
on public.projects
for delete
to authenticated
using (public.can_manage_project(id));

drop policy if exists "project_members_select_project_member" on public.project_members;
create policy "project_members_select_project_member"
on public.project_members
for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "project_members_insert_project_manager" on public.project_members;
create policy "project_members_insert_project_manager"
on public.project_members
for insert
to authenticated
with check (public.can_manage_project(project_id));

drop policy if exists "project_members_update_project_manager" on public.project_members;
create policy "project_members_update_project_manager"
on public.project_members
for update
to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

drop policy if exists "project_members_delete_project_manager" on public.project_members;
create policy "project_members_delete_project_manager"
on public.project_members
for delete
to authenticated
using (public.can_manage_project(project_id));

create or replace function public.list_project_members(p_project_id uuid)
returns table (
  project_id uuid,
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
  if not public.is_project_member(p_project_id) then
    raise exception 'Acesso negado ao projeto informado.';
  end if;

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
    order by
      case pm.role
        when 'owner' then 1
        when 'admin' then 2
        when 'member' then 3
        else 4
      end,
      p.email;
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

  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, v_user_id, v_role)
  on conflict on constraint project_members_pkey do update
    set role = case
      when public.project_members.role = 'owner' then 'owner'
      else excluded.role
    end;

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

revoke all on function public.list_project_members(uuid) from public;
revoke all on function public.add_project_member_by_email(uuid, text, text) from public;

grant execute on function public.list_project_members(uuid) to authenticated;
grant execute on function public.add_project_member_by_email(uuid, text, text) to authenticated;

alter table public.user_stories
  add column if not exists project_id uuid null references public.projects(id) on delete set null,
  add column if not exists estimation_status text not null default 'created';

update public.user_stories
set estimation_status = 'created'
where estimation_status is null;

alter table public.user_stories
  alter column estimation_status set default 'created',
  alter column estimation_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_stories'::regclass
      and conname = 'user_stories_estimation_status_check'
  ) then
    alter table public.user_stories
      add constraint user_stories_estimation_status_check
      check (estimation_status in ('created', 'refining', 'ready_for_estimation', 'estimated'));
  end if;
end;
$$;

create index if not exists idx_user_stories_project_id
  on public.user_stories (project_id);

create index if not exists idx_user_stories_project_estimation_status
  on public.user_stories (project_id, estimation_status);

create or replace function public.update_user_story_estimation_status(
  p_story_id uuid,
  p_estimation_status text
)
returns setof public.user_stories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_story public.user_stories%rowtype;
  v_status text := coalesce(nullif(trim(p_estimation_status), ''), 'created');
begin
  if v_status not in ('created', 'refining', 'ready_for_estimation', 'estimated') then
    raise exception 'Status de estimativa inválido.';
  end if;

  select * into v_story
  from public.user_stories
  where id = p_story_id;

  if not found then
    raise exception 'História não encontrada.';
  end if;

  if not (
    v_story.user_id = auth.uid()
    or (
      v_story.project_id is not null
      and public.can_manage_project(v_story.project_id)
    )
  ) then
    raise exception 'Apenas quem criou a história ou responsáveis do projeto podem alterar o status de estimativa.';
  end if;

  return query
    update public.user_stories
    set estimation_status = v_status
    where id = p_story_id
    returning *;
end;
$$;

revoke all on function public.update_user_story_estimation_status(uuid, text) from public;
grant execute on function public.update_user_story_estimation_status(uuid, text) to authenticated;

drop policy if exists "user_stories_select_own" on public.user_stories;
create policy "user_stories_select_own"
on public.user_stories
for select
to authenticated
using (
  auth.uid() = user_id
  or (
    project_id is not null
    and public.is_project_member(project_id)
  )
);

drop policy if exists "user_stories_insert_own" on public.user_stories;
create policy "user_stories_insert_own"
on public.user_stories
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    project_id is null
    or public.is_project_member(project_id)
  )
);

drop policy if exists "user_stories_update_own" on public.user_stories;
create policy "user_stories_update_own"
on public.user_stories
for update
to authenticated
using (
  auth.uid() = user_id
  and (
    project_id is null
    or public.is_project_member(project_id)
  )
)
with check (
  auth.uid() = user_id
  and (
    project_id is null
    or public.is_project_member(project_id)
  )
);
