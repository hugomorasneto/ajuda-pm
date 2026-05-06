-- ProdForge - Harden team member role management.
-- Keeps team member updates/removals behind RPCs and blocks owner/self changes at the database layer.

revoke all privileges on public.team_members from authenticated;
grant select on public.team_members to authenticated;

drop policy if exists "team_members_insert_team_manager" on public.team_members;
create policy "team_members_insert_team_manager"
on public.team_members
for insert
to authenticated
with check (
  public.can_manage_team(team_id)
  and role in ('admin', 'member', 'viewer')
  and user_id <> auth.uid()
);

drop policy if exists "team_members_update_team_manager" on public.team_members;
create policy "team_members_update_team_manager"
on public.team_members
for update
to authenticated
using (
  public.can_manage_team(team_id)
  and role <> 'owner'
  and user_id <> auth.uid()
)
with check (
  public.can_manage_team(team_id)
  and role in ('admin', 'member', 'viewer')
  and user_id <> auth.uid()
);

drop policy if exists "team_members_delete_team_manager" on public.team_members;
create policy "team_members_delete_team_manager"
on public.team_members
for delete
to authenticated
using (
  public.can_manage_team(team_id)
  and role <> 'owner'
  and user_id <> auth.uid()
);

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

  if v_user_id = auth.uid() then
    raise exception 'Você não pode alterar seu próprio papel por aqui.';
  end if;

  if exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = v_user_id
      and tm.role = 'owner'
  ) then
    raise exception 'O owner do time não pode ter o papel alterado por aqui.';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, v_user_id, v_role)
  on conflict (team_id, user_id) do update
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

create or replace function public.update_team_member_role(
  p_team_id uuid,
  p_member_user_id uuid,
  p_role text
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
  v_current_role text;
  v_role text := coalesce(nullif(trim(p_role), ''), 'member');
begin
  if not public.can_manage_team(p_team_id) then
    raise exception 'Apenas administradores do projeto ou do time podem alterar papéis.';
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

  select tm.role into v_current_role
  from public.team_members tm
  where tm.team_id = p_team_id
    and tm.user_id = p_member_user_id;

  if v_current_role is null then
    raise exception 'Membro não encontrado neste time.';
  end if;

  if v_current_role = 'owner' then
    raise exception 'O owner do time não pode ter o papel alterado por aqui.';
  end if;

  update public.team_members tm
  set role = v_role
  where tm.team_id = p_team_id
    and tm.user_id = p_member_user_id;

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
      and tm.user_id = p_member_user_id;
end;
$$;

create or replace function public.remove_team_member(
  p_team_id uuid,
  p_member_user_id uuid
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
  v_current_role text;
  v_email text;
  v_created_at timestamptz;
begin
  if not public.can_manage_team(p_team_id) then
    raise exception 'Apenas administradores do projeto ou do time podem remover membros.';
  end if;

  if p_member_user_id is null then
    raise exception 'Membro não informado.';
  end if;

  if p_member_user_id = auth.uid() then
    raise exception 'Você não pode remover seu próprio acesso por aqui.';
  end if;

  select tm.role, p.email, tm.created_at
    into v_current_role, v_email, v_created_at
  from public.team_members tm
  join public.profiles p on p.id = tm.user_id
  where tm.team_id = p_team_id
    and tm.user_id = p_member_user_id;

  if v_current_role is null then
    raise exception 'Membro não encontrado neste time.';
  end if;

  if v_current_role = 'owner' then
    raise exception 'O owner do time não pode ser removido por aqui.';
  end if;

  delete from public.team_members tm
  where tm.team_id = p_team_id
    and tm.user_id = p_member_user_id;

  return query
    select
      p_team_id,
      p_member_user_id,
      v_email,
      v_current_role,
      v_created_at;
end;
$$;

revoke all on function public.add_team_member_by_email(uuid, text, text) from public;
revoke all on function public.update_team_member_role(uuid, uuid, text) from public;
revoke all on function public.remove_team_member(uuid, uuid) from public;

grant execute on function public.add_team_member_by_email(uuid, text, text) to authenticated;
grant execute on function public.update_team_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;
