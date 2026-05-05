-- ProdForge - Keep project access in sync with team membership.
-- A team member must also be able to see the project that owns the team.

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
