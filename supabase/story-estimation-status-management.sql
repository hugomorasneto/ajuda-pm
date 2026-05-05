-- ProdForge - Manage estimation readiness for user stories.
-- A story owner or a project manager can change the estimation status.

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
