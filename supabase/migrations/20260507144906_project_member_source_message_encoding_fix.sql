-- ProdForge - Corrige ambiguidade de project_id em RPCs de membros de projeto.
-- Aplicar no Supabase quando o convite por e-mail retornar:
-- "column reference \"project_id\" is ambiguous".

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
  on conflict on constraint project_members_pkey do update
    set role = excluded.role;

  return v_role;
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
  on conflict on constraint project_member_sources_pkey do update
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
  on conflict on constraint project_member_sources_pkey do update
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

revoke all on function public.refresh_project_member_from_sources(uuid, uuid) from public;
revoke all on function public.add_project_member_by_email(uuid, text, text) from public;
revoke all on function public.update_project_member_role(uuid, uuid, text) from public;

grant execute on function public.add_project_member_by_email(uuid, text, text) to authenticated;
grant execute on function public.update_project_member_role(uuid, uuid, text) to authenticated;
