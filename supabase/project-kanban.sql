-- ProdForge - Kanban de histórias por projeto.
-- Cria colunas configuráveis por projeto e posições de histórias no quadro.

create table if not exists public.project_kanban_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  status_base text not null default 'created',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_kanban_columns_name_not_empty check (nullif(btrim(name), '') is not null),
  constraint project_kanban_columns_status_base_check check (
    status_base in ('created', 'refining', 'ready_for_estimation', 'estimated')
  )
);

create index if not exists idx_project_kanban_columns_project_position
  on public.project_kanban_columns (project_id, position, created_at);

create unique index if not exists idx_project_kanban_default_status_unique
  on public.project_kanban_columns (project_id, status_base)
  where is_default = true;

drop trigger if exists trg_project_kanban_columns_set_updated_at on public.project_kanban_columns;
create trigger trg_project_kanban_columns_set_updated_at
before update on public.project_kanban_columns
for each row
execute function public.set_updated_at();

create table if not exists public.project_kanban_story_positions (
  project_id uuid not null references public.projects(id) on delete cascade,
  story_group_key uuid not null,
  column_id uuid not null references public.project_kanban_columns(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, story_group_key)
);

create index if not exists idx_project_kanban_story_positions_column_position
  on public.project_kanban_story_positions (column_id, position, updated_at desc);

drop trigger if exists trg_project_kanban_story_positions_set_updated_at on public.project_kanban_story_positions;
create trigger trg_project_kanban_story_positions_set_updated_at
before update on public.project_kanban_story_positions
for each row
execute function public.set_updated_at();

create or replace function public.project_kanban_can_move(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.project_role(p_project_id) in ('owner', 'admin', 'member'), false);
$$;

revoke all on function public.project_kanban_can_move(uuid) from public;
grant execute on function public.project_kanban_can_move(uuid) to authenticated;

create or replace function public.ensure_project_kanban_defaults(p_project_id uuid)
returns setof public.project_kanban_columns
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Acesso negado ao projeto informado.';
  end if;

  insert into public.project_kanban_columns (project_id, name, position, status_base, is_default)
  values
    (p_project_id, 'Criadas', 10, 'created', true),
    (p_project_id, 'Em refinamento', 20, 'refining', true),
    (p_project_id, 'Prontas para estimar', 30, 'ready_for_estimation', true),
    (p_project_id, 'Estimadas', 40, 'estimated', true)
  on conflict (project_id, status_base) where is_default = true do nothing;

  return query
    select *
    from public.project_kanban_columns pkc
    where pkc.project_id = p_project_id
    order by pkc.position, pkc.created_at;
end;
$$;

create or replace function public.list_project_kanban_board(
  p_project_id uuid,
  p_limit integer default 200
)
returns table (
  column_id uuid,
  column_name text,
  column_position integer,
  column_status_base text,
  column_is_default boolean,
  story_id uuid,
  story_group_key uuid,
  story_position integer,
  story_title text,
  story_user_id uuid,
  story_status text,
  story_estimation_status text,
  story_created_at timestamptz,
  story_version_number integer,
  story_input_context text,
  story_user_story text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 200));
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Acesso negado ao projeto informado.';
  end if;

  perform public.ensure_project_kanban_defaults(p_project_id);

  with latest_stories as (
    select *
    from (
      select distinct on (coalesce(us.story_group_id, us.id))
        us.id,
        us.user_id,
        us.project_id,
        coalesce(us.story_group_id, us.id) as story_group_key,
        us.title,
        us.status,
        coalesce(us.estimation_status, 'created') as estimation_status,
        us.created_at,
        us.version_number,
        us.input_context,
        us.user_story
      from public.user_stories us
      where us.project_id = p_project_id
      order by
        coalesce(us.story_group_id, us.id),
        us.version_number desc nulls last,
        us.created_at desc
    ) ranked_stories
    order by ranked_stories.created_at desc
    limit v_limit
  ),
  missing_positions as (
    select
      ls.project_id,
      ls.story_group_key,
      pkc.id as column_id,
      row_number() over (
        partition by pkc.id
        order by ls.created_at desc, ls.id
      )::integer * 1000 as position
    from latest_stories ls
    join public.project_kanban_columns pkc
      on pkc.project_id = ls.project_id
      and pkc.is_default = true
      and pkc.status_base = ls.estimation_status
    left join public.project_kanban_story_positions pksp
      on pksp.project_id = ls.project_id
      and pksp.story_group_key = ls.story_group_key
    where pksp.story_group_key is null
  )
  insert into public.project_kanban_story_positions (project_id, story_group_key, column_id, position)
  select project_id, story_group_key, column_id, position
  from missing_positions
  on conflict (project_id, story_group_key) do nothing;

  return query
    with latest_stories as (
      select *
      from (
        select distinct on (coalesce(us.story_group_id, us.id))
          us.id,
          us.user_id,
          us.project_id,
          coalesce(us.story_group_id, us.id) as story_group_key,
          us.title,
          us.status,
          coalesce(us.estimation_status, 'created') as estimation_status,
          us.created_at,
          us.version_number,
          us.input_context,
          us.user_story
        from public.user_stories us
        where us.project_id = p_project_id
        order by
          coalesce(us.story_group_id, us.id),
          us.version_number desc nulls last,
          us.created_at desc
      ) ranked_stories
      order by ranked_stories.created_at desc
      limit v_limit
    )
    select
      pkc.id as column_id,
      pkc.name as column_name,
      pkc.position as column_position,
      pkc.status_base as column_status_base,
      pkc.is_default as column_is_default,
      ls.id as story_id,
      ls.story_group_key,
      pksp.position as story_position,
      ls.title as story_title,
      ls.user_id as story_user_id,
      ls.status as story_status,
      ls.estimation_status as story_estimation_status,
      ls.created_at as story_created_at,
      ls.version_number as story_version_number,
      ls.input_context as story_input_context,
      ls.user_story as story_user_story
    from public.project_kanban_columns pkc
    left join public.project_kanban_story_positions pksp
      on pksp.column_id = pkc.id
      and pksp.project_id = pkc.project_id
      and exists (
        select 1
        from latest_stories lst
        where lst.project_id = pksp.project_id
          and lst.story_group_key = pksp.story_group_key
      )
    left join latest_stories ls
      on ls.project_id = pksp.project_id
      and ls.story_group_key = pksp.story_group_key
    where pkc.project_id = p_project_id
    order by
      pkc.position,
      pkc.created_at,
      pksp.position nulls last,
      ls.created_at desc nulls last;
end;
$$;

create or replace function public.create_project_kanban_column(
  p_project_id uuid,
  p_name text,
  p_status_base text
)
returns setof public.project_kanban_columns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(btrim(p_name), '');
  v_status_base text := coalesce(nullif(btrim(p_status_base), ''), 'created');
  v_position integer;
begin
  if not public.can_manage_project(p_project_id) then
    raise exception 'Apenas responsáveis e administradores do projeto podem criar colunas.';
  end if;

  if v_name is null then
    raise exception 'Informe um nome para a coluna.';
  end if;

  if v_status_base not in ('created', 'refining', 'ready_for_estimation', 'estimated') then
    raise exception 'Status base da coluna inválido.';
  end if;

  perform public.ensure_project_kanban_defaults(p_project_id);

  select coalesce(max(position), 0) + 10
  into v_position
  from public.project_kanban_columns
  where project_id = p_project_id;

  return query
    insert into public.project_kanban_columns (project_id, name, position, status_base, is_default)
    values (p_project_id, v_name, v_position, v_status_base, false)
    returning *;
end;
$$;

create or replace function public.update_project_kanban_column(
  p_column_id uuid,
  p_name text,
  p_status_base text
)
returns setof public.project_kanban_columns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_column public.project_kanban_columns%rowtype;
  v_name text := nullif(btrim(p_name), '');
  v_status_base text := coalesce(nullif(btrim(p_status_base), ''), 'created');
begin
  select * into v_column
  from public.project_kanban_columns
  where id = p_column_id;

  if not found then
    raise exception 'Coluna não encontrada.';
  end if;

  if not public.can_manage_project(v_column.project_id) then
    raise exception 'Apenas responsáveis e administradores do projeto podem editar colunas.';
  end if;

  if v_name is null then
    raise exception 'Informe um nome para a coluna.';
  end if;

  if v_status_base not in ('created', 'refining', 'ready_for_estimation', 'estimated') then
    raise exception 'Status base da coluna inválido.';
  end if;

  update public.project_kanban_columns
  set name = v_name,
      status_base = v_status_base
  where id = p_column_id;

  update public.user_stories us
  set estimation_status = v_status_base
  from public.project_kanban_story_positions pksp
  where pksp.project_id = v_column.project_id
    and pksp.column_id = p_column_id
    and coalesce(us.story_group_id, us.id) = pksp.story_group_key
    and us.id = (
      select latest.id
      from public.user_stories latest
      where latest.project_id = v_column.project_id
        and coalesce(latest.story_group_id, latest.id) = pksp.story_group_key
      order by latest.version_number desc nulls last, latest.created_at desc
      limit 1
    );

  return query
    select *
    from public.project_kanban_columns
    where id = p_column_id;
end;
$$;

create or replace function public.reorder_project_kanban_column(
  p_column_id uuid,
  p_direction text
)
returns setof public.project_kanban_columns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_column public.project_kanban_columns%rowtype;
  v_target public.project_kanban_columns%rowtype;
  v_direction text := lower(coalesce(p_direction, ''));
  v_position integer;
begin
  select * into v_column
  from public.project_kanban_columns
  where id = p_column_id;

  if not found then
    raise exception 'Coluna não encontrada.';
  end if;

  if not public.can_manage_project(v_column.project_id) then
    raise exception 'Apenas responsáveis e administradores do projeto podem reordenar colunas.';
  end if;

  if v_direction = 'left' then
    select * into v_target
    from public.project_kanban_columns
    where project_id = v_column.project_id
      and position < v_column.position
    order by position desc, created_at desc
    limit 1;
  elsif v_direction = 'right' then
    select * into v_target
    from public.project_kanban_columns
    where project_id = v_column.project_id
      and position > v_column.position
    order by position asc, created_at asc
    limit 1;
  else
    raise exception 'Direção inválida para reordenação.';
  end if;

  if v_target.id is null then
    return query
      select *
      from public.project_kanban_columns
      where project_id = v_column.project_id
      order by position, created_at;
    return;
  end if;

  v_position := v_column.position;

  update public.project_kanban_columns
  set position = v_target.position
  where id = v_column.id;

  update public.project_kanban_columns
  set position = v_position
  where id = v_target.id;

  return query
    select *
    from public.project_kanban_columns
    where project_id = v_column.project_id
    order by position, created_at;
end;
$$;

create or replace function public.move_project_kanban_story(
  p_project_id uuid,
  p_story_id uuid,
  p_column_id uuid,
  p_position integer default null
)
returns setof public.user_stories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_column public.project_kanban_columns%rowtype;
  v_story public.user_stories%rowtype;
  v_latest_story public.user_stories%rowtype;
  v_story_group_key uuid;
  v_position integer := coalesce(p_position, 0);
begin
  if not public.project_kanban_can_move(p_project_id) then
    raise exception 'Apenas membros ativos do projeto podem mover histórias no Kanban.';
  end if;

  select * into v_column
  from public.project_kanban_columns
  where id = p_column_id
    and project_id = p_project_id;

  if not found then
    raise exception 'Coluna não encontrada neste projeto.';
  end if;

  select * into v_story
  from public.user_stories
  where id = p_story_id
    and project_id = p_project_id;

  if not found then
    raise exception 'História não encontrada neste projeto.';
  end if;

  v_story_group_key := coalesce(v_story.story_group_id, v_story.id);

  select * into v_latest_story
  from public.user_stories us
  where us.project_id = p_project_id
    and coalesce(us.story_group_id, us.id) = v_story_group_key
  order by us.version_number desc nulls last, us.created_at desc
  limit 1;

  insert into public.project_kanban_story_positions (project_id, story_group_key, column_id, position)
  values (p_project_id, v_story_group_key, p_column_id, v_position)
  on conflict (project_id, story_group_key) do update
    set column_id = excluded.column_id,
        position = excluded.position;

  return query
    update public.user_stories
    set estimation_status = v_column.status_base
    where id = v_latest_story.id
    returning *;
end;
$$;

revoke all on function public.ensure_project_kanban_defaults(uuid) from public;
revoke all on function public.list_project_kanban_board(uuid, integer) from public;
revoke all on function public.create_project_kanban_column(uuid, text, text) from public;
revoke all on function public.update_project_kanban_column(uuid, text, text) from public;
revoke all on function public.reorder_project_kanban_column(uuid, text) from public;
revoke all on function public.move_project_kanban_story(uuid, uuid, uuid, integer) from public;

grant execute on function public.ensure_project_kanban_defaults(uuid) to authenticated;
grant execute on function public.list_project_kanban_board(uuid, integer) to authenticated;
grant execute on function public.create_project_kanban_column(uuid, text, text) to authenticated;
grant execute on function public.update_project_kanban_column(uuid, text, text) to authenticated;
grant execute on function public.reorder_project_kanban_column(uuid, text) to authenticated;
grant execute on function public.move_project_kanban_story(uuid, uuid, uuid, integer) to authenticated;

alter table public.project_kanban_columns enable row level security;
alter table public.project_kanban_story_positions enable row level security;

grant select, insert, update, delete on public.project_kanban_columns to authenticated;
grant select, insert, update, delete on public.project_kanban_story_positions to authenticated;

drop policy if exists "project_kanban_columns_select_member" on public.project_kanban_columns;
create policy "project_kanban_columns_select_member"
on public.project_kanban_columns
for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "project_kanban_columns_insert_manager" on public.project_kanban_columns;
create policy "project_kanban_columns_insert_manager"
on public.project_kanban_columns
for insert
to authenticated
with check (public.can_manage_project(project_id));

drop policy if exists "project_kanban_columns_update_manager" on public.project_kanban_columns;
create policy "project_kanban_columns_update_manager"
on public.project_kanban_columns
for update
to authenticated
using (public.can_manage_project(project_id))
with check (public.can_manage_project(project_id));

drop policy if exists "project_kanban_columns_delete_manager" on public.project_kanban_columns;
create policy "project_kanban_columns_delete_manager"
on public.project_kanban_columns
for delete
to authenticated
using (public.can_manage_project(project_id));

drop policy if exists "project_kanban_story_positions_select_member" on public.project_kanban_story_positions;
create policy "project_kanban_story_positions_select_member"
on public.project_kanban_story_positions
for select
to authenticated
using (public.is_project_member(project_id));

drop policy if exists "project_kanban_story_positions_insert_mover" on public.project_kanban_story_positions;
create policy "project_kanban_story_positions_insert_mover"
on public.project_kanban_story_positions
for insert
to authenticated
with check (public.project_kanban_can_move(project_id));

drop policy if exists "project_kanban_story_positions_update_mover" on public.project_kanban_story_positions;
create policy "project_kanban_story_positions_update_mover"
on public.project_kanban_story_positions
for update
to authenticated
using (public.project_kanban_can_move(project_id))
with check (public.project_kanban_can_move(project_id));

drop policy if exists "project_kanban_story_positions_delete_manager" on public.project_kanban_story_positions;
create policy "project_kanban_story_positions_delete_manager"
on public.project_kanban_story_positions
for delete
to authenticated
using (public.can_manage_project(project_id));
