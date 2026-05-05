-- ProdForge - Let project members read project story history through the project filter.
-- Standalone and unfiltered history remain scoped to the authenticated user's own stories.

drop function if exists public.search_user_story_groups(
  uuid,
  text,
  timestamptz,
  text,
  integer,
  integer,
  text,
  uuid
);

create or replace function public.search_user_story_groups(
  p_user_id uuid,
  p_search text default null,
  p_since timestamptz default null,
  p_status text default null,
  p_estimation_status text default null,
  p_limit integer default 10,
  p_offset integer default 0,
  p_project_filter text default 'all',
  p_project_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  story_group_id uuid,
  version_number integer,
  previous_version_id uuid,
  regeneration_instruction text,
  title text,
  created_at timestamptz,
  input_context text,
  input_requirements text,
  objective text,
  user_story text,
  acceptance_criteria text,
  business_rules text,
  gaps text,
  qa_checklist text,
  status text,
  project_id uuid,
  estimation_status text,
  project_name text,
  versions_count bigint,
  total_count bigint
)
language sql
stable
as $$
  with filtered as (
    select
      us.*,
      p.name as project_name,
      coalesce(us.story_group_id, us.id) as group_key
    from public.user_stories us
    left join public.projects p on p.id = us.project_id
    where (
        us.user_id = p_user_id
        or (
          coalesce(nullif(trim(p_project_filter), ''), 'all') = 'project'
          and p_project_id is not null
          and us.project_id = p_project_id
        )
      )
      and (p_since is null or us.created_at >= p_since)
      and (p_status is null or p_status = 'all' or us.status = p_status)
      and (
        p_estimation_status is null
        or p_estimation_status = 'all'
        or us.estimation_status = p_estimation_status
      )
      and (
        coalesce(nullif(trim(p_project_filter), ''), 'all') = 'all'
        or (p_project_filter = 'none' and us.project_id is null)
        or (p_project_filter = 'project' and p_project_id is not null and us.project_id = p_project_id)
      )
      and (
        nullif(trim(coalesce(p_search, '')), '') is null
        or us.title ilike '%' || trim(p_search) || '%'
        or us.input_context ilike '%' || trim(p_search) || '%'
        or us.input_requirements ilike '%' || trim(p_search) || '%'
        or us.user_story ilike '%' || trim(p_search) || '%'
        or coalesce(us.acceptance_criteria, '') ilike '%' || trim(p_search) || '%'
        or coalesce(p.name, '') ilike '%' || trim(p_search) || '%'
      )
  ),
  latest_groups as (
    select distinct on (filtered.group_key)
      filtered.*,
      count(*) over (partition by filtered.group_key) as versions_count
    from filtered
    order by filtered.group_key, filtered.created_at desc, filtered.version_number desc
  ),
  counted as (
    select
      latest_groups.*,
      count(*) over () as total_count
    from latest_groups
    order by latest_groups.created_at desc, latest_groups.version_number desc
  )
  select
    counted.id,
    counted.user_id,
    counted.story_group_id,
    counted.version_number,
    counted.previous_version_id,
    counted.regeneration_instruction,
    counted.title,
    counted.created_at,
    counted.input_context,
    counted.input_requirements,
    counted.objective,
    counted.user_story,
    counted.acceptance_criteria,
    counted.business_rules,
    counted.gaps,
    counted.qa_checklist,
    counted.status,
    counted.project_id,
    counted.estimation_status,
    counted.project_name,
    counted.versions_count,
    counted.total_count
  from counted
  limit greatest(1, least(coalesce(p_limit, 10), 50))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.search_user_story_groups(
  uuid,
  text,
  timestamptz,
  text,
  text,
  integer,
  integer,
  text,
  uuid
) to authenticated;
