begin;

-- Freeze legacy inserts until all previously saved versions have been counted.
lock table public.user_stories in share row exclusive mode;
revoke insert on public.user_stories from public, anon, authenticated;

create table public.user_story_generation_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  fingerprint text,
  attempt_id uuid,
  lease_until timestamptz,
  story_id uuid,
  completed_at timestamptz,
  generation_meta jsonb,
  primary key (user_id, request_id),
  check (
    (completed_at is null and story_id is null and fingerprint is not null
      and attempt_id is not null and lease_until is not null)
    or (completed_at is not null and story_id is not null
      and attempt_id is null and lease_until is null)
  )
);

alter table public.user_story_generation_requests enable row level security;
create index user_story_generation_pending_by_user
on public.user_story_generation_requests (user_id)
where completed_at is null;
revoke all on public.user_story_generation_requests from public, anon, authenticated;
grant select, insert, update, delete on public.user_story_generation_requests to service_role;
grant select, insert on public.user_stories to service_role;
grant select on public.profiles, public.project_members to service_role;

-- Keep charges after story deletion. Before this migration the saved versions
-- were the only usage record, so only versions still present can be backfilled.
insert into public.user_story_generation_requests (user_id, request_id, story_id, completed_at)
select stories.user_id, gen_random_uuid(), stories.id, stories.created_at
from public.user_stories stories
join auth.users accounts on accounts.id = stories.user_id;

create function public.story_generation_usage_for(p_user_id uuid)
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'usage_count', (
      select count(*) from public.user_story_generation_requests
      where user_id = p_user_id and completed_at is not null
    ),
    'plan', coalesce(profile.plan, 'free'),
    'forge_limit_override', profile.forge_limit_override,
    'effective_limit', coalesce(profile.forge_limit_override,
      case when profile.plan = 'premium' then null else 10 end)
  )
  from (select p_user_id as id) account
  left join public.profiles profile using (id);
$$;

create function public.get_story_generation_usage()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select public.story_generation_usage_for(auth.uid())
  where auth.uid() is not null;
$$;

create function public.admin_get_story_generation_usage(p_user_id uuid)
returns bigint
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  return (public.story_generation_usage_for(p_user_id)->>'usage_count')::bigint;
end;
$$;

-- As with the previous story insert policy, a project must contain the
-- requester. A predecessor must also belong to that requester and project.
create function public.can_generate_story_for(
  p_user_id uuid, p_project_id uuid, p_previous_version_id uuid
)
returns boolean
language sql stable
set search_path = ''
as $$
  select (
    p_project_id is null or exists (
      select 1 from public.project_members
      where project_id = p_project_id and user_id = p_user_id
    )
  ) and (
    p_previous_version_id is null or exists (
      select 1 from public.user_stories
      where id = p_previous_version_id and user_id = p_user_id
        and project_id is not distinct from p_project_id
    )
  );
$$;

create function public.reserve_story_generation(
  p_user_id uuid, p_request_id uuid, p_fingerprint text,
  p_project_id uuid, p_previous_version_id uuid
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_request public.user_story_generation_requests%rowtype;
  v_story public.user_stories%rowtype;
  v_usage jsonb;
  v_attempt_id uuid := gen_random_uuid();
begin
  perform pg_advisory_xact_lock(hashtextextended('story_generation:' || p_user_id::text, 0));

  -- Remove abandoned reservations before looking up the request.
  delete from public.user_story_generation_requests
  where user_id = p_user_id and completed_at is null and lease_until <= clock_timestamp();

  select * into v_request from public.user_story_generation_requests
  where user_id = p_user_id and request_id = p_request_id;
  if found then
    if v_request.fingerprint is distinct from p_fingerprint then
      return jsonb_build_object('code', 'REQUEST_CONFLICT');
    end if;
    if v_request.completed_at is not null then
      select * into v_story from public.user_stories
      where id = v_request.story_id and user_id = p_user_id;
      if not found then
        return jsonb_build_object('code', 'STORY_REMOVED');
      end if;
      return jsonb_build_object('code', 'SAVED', 'story', to_jsonb(v_story),
        'generation_meta', v_request.generation_meta);
    end if;
    return jsonb_build_object('code', 'GENERATION_IN_PROGRESS');
  end if;

  v_usage := public.story_generation_usage_for(p_user_id);
  if (v_usage->>'usage_count')::bigint >= (v_usage->>'effective_limit')::integer then
    return jsonb_build_object('code', 'QUOTA_EXHAUSTED', 'usage', v_usage);
  end if;
  if not public.can_generate_story_for(p_user_id, p_project_id, p_previous_version_id) then
    return jsonb_build_object('code', 'TARGET_UNAVAILABLE');
  end if;
  -- Pending generations reserve capacity without consuming successful usage.
  -- Pro accounts without an override can run independent requests concurrently.
  if (v_usage->>'effective_limit')::integer is not null and
    (v_usage->>'usage_count')::bigint + (
      select count(*) from public.user_story_generation_requests
      where user_id = p_user_id and completed_at is null
    ) >= (v_usage->>'effective_limit')::integer then
    return jsonb_build_object('code', 'GENERATION_IN_PROGRESS');
  end if;

  insert into public.user_story_generation_requests
    (user_id, request_id, fingerprint, attempt_id, lease_until)
  values (p_user_id, p_request_id, p_fingerprint, v_attempt_id,
    clock_timestamp() + interval '2 minutes');
  return jsonb_build_object('code', 'RESERVED', 'attempt_id', v_attempt_id);
end;
$$;

create function public.save_story_generation(
  p_user_id uuid, p_request_id uuid, p_attempt_id uuid, p_input jsonb, p_output jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_project_id uuid := (p_input->>'project_id')::uuid;
  v_previous_version_id uuid := (p_input->>'previous_version_id')::uuid;
  v_group_id uuid;
  v_version integer := 1;
  v_story public.user_stories%rowtype;
  v_usage jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('story_generation:' || p_user_id::text, 0));

  -- Lock the reservation through the insert so a concurrent release cannot
  -- remove it between checking the lease and committing the charge.
  perform 1 from public.user_story_generation_requests
  where user_id = p_user_id and request_id = p_request_id and attempt_id = p_attempt_id
    and completed_at is null and lease_until > clock_timestamp()
  for update;
  if not found then
    return jsonb_build_object('code', 'RESERVATION_EXPIRED');
  end if;

  -- Serialize with administrative changes to the account's limit.
  perform 1 from public.profiles where id = p_user_id for share;
  v_usage := public.story_generation_usage_for(p_user_id);
  if (v_usage->>'usage_count')::bigint >= (v_usage->>'effective_limit')::integer then
    return jsonb_build_object('code', 'QUOTA_EXHAUSTED', 'usage', v_usage);
  end if;

  if v_project_id is not null then
    perform 1 from public.project_members
    where project_id = v_project_id and user_id = p_user_id
    for key share;
    if not found then
      return jsonb_build_object('code', 'TARGET_UNAVAILABLE');
    end if;
  end if;
  if v_previous_version_id is not null then
    select story_group_id into v_group_id from public.user_stories
    where id = v_previous_version_id and user_id = p_user_id
      and project_id is not distinct from v_project_id
    for share;
    if not found then
      return jsonb_build_object('code', 'TARGET_UNAVAILABLE');
    end if;
    select max(version_number) + 1 into v_version from public.user_stories
    where story_group_id = v_group_id and user_id = p_user_id;
  end if;

  insert into public.user_stories (
    user_id, project_id, story_group_id, version_number, previous_version_id,
    regeneration_instruction, input_context, input_requirements, title, objective,
    user_story, acceptance_criteria, business_rules, gaps, qa_checklist
  ) values (
    p_user_id, v_project_id, coalesce(v_group_id, gen_random_uuid()), v_version,
    v_previous_version_id, p_input->>'regeneration_instruction', p_input->>'input_context',
    p_input->>'input_requirements', p_output->>'title', p_output->>'objective',
    p_output->>'user_story', p_output->>'acceptance_criteria', p_output->>'business_rules',
    p_output->>'gaps', p_output->>'qa_checklist'
  ) returning * into v_story;

  update public.user_story_generation_requests
  set story_id = v_story.id, completed_at = v_story.created_at, attempt_id = null,
      lease_until = null, generation_meta = p_output->'generation_meta'
  where user_id = p_user_id and request_id = p_request_id;
  return jsonb_build_object('code', 'SAVED', 'story', to_jsonb(v_story));
end;
$$;

create function public.release_story_generation(
  p_user_id uuid, p_request_id uuid, p_attempt_id uuid
)
returns void
language sql
set search_path = ''
as $$
  delete from public.user_story_generation_requests
  where user_id = p_user_id and request_id = p_request_id and attempt_id = p_attempt_id
    and completed_at is null;
$$;

revoke all on function
  public.story_generation_usage_for(uuid),
  public.can_generate_story_for(uuid, uuid, uuid),
  public.reserve_story_generation(uuid, uuid, text, uuid, uuid),
  public.save_story_generation(uuid, uuid, uuid, jsonb, jsonb),
  public.release_story_generation(uuid, uuid, uuid)
from public, anon, authenticated;

grant execute on function
  public.story_generation_usage_for(uuid),
  public.can_generate_story_for(uuid, uuid, uuid),
  public.reserve_story_generation(uuid, uuid, text, uuid, uuid),
  public.save_story_generation(uuid, uuid, uuid, jsonb, jsonb),
  public.release_story_generation(uuid, uuid, uuid)
to service_role;

revoke all on function
  public.get_story_generation_usage(),
  public.admin_get_story_generation_usage(uuid)
from public, anon;
grant execute on function
  public.get_story_generation_usage(),
  public.admin_get_story_generation_usage(uuid)
to authenticated;

commit;
