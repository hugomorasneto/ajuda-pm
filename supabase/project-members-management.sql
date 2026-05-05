-- ProdForge - Project member management for existing users.
-- MVP scope: add registered users by e-mail, no public invite links yet.

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
