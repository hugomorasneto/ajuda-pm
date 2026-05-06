-- ProdForge - Roda da Fogueira foundation.
-- Creates the Planning Poker persistence, secure voting flow and realtime-ready tables.

create table if not exists public.planning_poker_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  team_id uuid null references public.teams(id) on delete set null,
  facilitator_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  scoring_scale text not null default 'fibonacci',
  scoring_values jsonb not null default '["0", "1", "2", "3", "5", "8", "13", "21", "?"]'::jsonb,
  vote_time_limit_seconds integer null default 300,
  allow_revote boolean not null default true,
  reveal_votes_after_all boolean not null default false,
  allow_abstention boolean not null default true,
  allow_observers boolean not null default true,
  allow_guest_participants boolean not null default false,
  save_history boolean not null default true,
  invite_code text not null,
  invite_expires_at timestamptz null,
  started_at timestamptz null,
  completed_at timestamptz null,
  canceled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planning_poker_sessions_name_not_empty check (nullif(btrim(name), '') is not null),
  constraint planning_poker_sessions_status_check check (
    status in ('draft', 'active', 'voting', 'revealed', 'completed', 'canceled')
  ),
  constraint planning_poker_sessions_scoring_scale_check check (
    scoring_scale in ('fibonacci', 'tshirt', 'custom')
  ),
  constraint planning_poker_sessions_scoring_values_array_check check (
    jsonb_typeof(scoring_values) = 'array'
  ),
  constraint planning_poker_sessions_vote_time_limit_check check (
    vote_time_limit_seconds is null
    or vote_time_limit_seconds between 15 and 3600
  ),
  constraint planning_poker_sessions_invite_code_not_empty check (
    nullif(btrim(invite_code), '') is not null
  )
);

create unique index if not exists idx_planning_poker_sessions_invite_code
  on public.planning_poker_sessions (invite_code);

create index if not exists idx_planning_poker_sessions_project_status
  on public.planning_poker_sessions (project_id, status, created_at desc);

create index if not exists idx_planning_poker_sessions_team_id
  on public.planning_poker_sessions (team_id);

create index if not exists idx_planning_poker_sessions_facilitator_id
  on public.planning_poker_sessions (facilitator_id);

drop trigger if exists trg_planning_poker_sessions_set_updated_at on public.planning_poker_sessions;
create trigger trg_planning_poker_sessions_set_updated_at
before update on public.planning_poker_sessions
for each row execute function public.set_updated_at();

create table if not exists public.planning_poker_session_stories (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.planning_poker_sessions(id) on delete cascade,
  user_story_id uuid not null references public.user_stories(id) on delete cascade,
  position integer not null default 1,
  status text not null default 'pending',
  final_estimate text null,
  final_estimate_numeric numeric null,
  estimated_by uuid null references auth.users(id) on delete set null,
  estimated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planning_poker_session_stories_status_check check (
    status in ('pending', 'voting', 'estimated', 'skipped')
  ),
  constraint planning_poker_session_stories_position_positive check (position > 0)
);

create unique index if not exists idx_planning_poker_session_stories_story
  on public.planning_poker_session_stories (session_id, user_story_id);

create unique index if not exists idx_planning_poker_session_stories_position
  on public.planning_poker_session_stories (session_id, position);

create index if not exists idx_planning_poker_session_stories_status
  on public.planning_poker_session_stories (session_id, status, position);

create index if not exists idx_planning_poker_session_stories_user_story_id
  on public.planning_poker_session_stories (user_story_id);

drop trigger if exists trg_planning_poker_session_stories_set_updated_at on public.planning_poker_session_stories;
create trigger trg_planning_poker_session_stories_set_updated_at
before update on public.planning_poker_session_stories
for each row execute function public.set_updated_at();

create table if not exists public.planning_poker_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.planning_poker_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text null,
  role text not null default 'participant',
  status text not null default 'joined',
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planning_poker_participants_role_check check (
    role in ('facilitator', 'participant', 'observer')
  ),
  constraint planning_poker_participants_status_check check (
    status in ('joined', 'left', 'removed')
  )
);

create unique index if not exists idx_planning_poker_participants_user
  on public.planning_poker_participants (session_id, user_id);

create index if not exists idx_planning_poker_participants_session_role
  on public.planning_poker_participants (session_id, role, status);

create index if not exists idx_planning_poker_participants_user_id
  on public.planning_poker_participants (user_id);

drop trigger if exists trg_planning_poker_participants_set_updated_at on public.planning_poker_participants;
create trigger trg_planning_poker_participants_set_updated_at
before update on public.planning_poker_participants
for each row execute function public.set_updated_at();

create table if not exists public.planning_poker_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.planning_poker_sessions(id) on delete cascade,
  session_story_id uuid not null references public.planning_poker_session_stories(id) on delete cascade,
  round_number integer not null,
  status text not null default 'voting',
  started_by uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz null,
  revealed_at timestamptz null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planning_poker_rounds_status_check check (
    status in ('voting', 'revealed', 'closed', 'canceled')
  ),
  constraint planning_poker_rounds_number_positive check (round_number > 0)
);

create unique index if not exists idx_planning_poker_rounds_story_number
  on public.planning_poker_rounds (session_story_id, round_number);

create index if not exists idx_planning_poker_rounds_session_status
  on public.planning_poker_rounds (session_id, status, created_at desc);

create index if not exists idx_planning_poker_rounds_story_status
  on public.planning_poker_rounds (session_story_id, status, round_number desc);

drop trigger if exists trg_planning_poker_rounds_set_updated_at on public.planning_poker_rounds;
create trigger trg_planning_poker_rounds_set_updated_at
before update on public.planning_poker_rounds
for each row execute function public.set_updated_at();

create table if not exists public.planning_poker_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.planning_poker_sessions(id) on delete cascade,
  session_story_id uuid not null references public.planning_poker_session_stories(id) on delete cascade,
  round_id uuid not null references public.planning_poker_rounds(id) on delete cascade,
  participant_id uuid not null references public.planning_poker_participants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote_value text not null,
  vote_numeric numeric null,
  vote_kind text not null default 'estimate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planning_poker_votes_kind_check check (
    vote_kind in ('estimate', 'abstain', 'unknown')
  ),
  constraint planning_poker_votes_value_not_empty check (nullif(btrim(vote_value), '') is not null)
);

create unique index if not exists idx_planning_poker_votes_round_participant
  on public.planning_poker_votes (round_id, participant_id);

create index if not exists idx_planning_poker_votes_session_round
  on public.planning_poker_votes (session_id, round_id);

create index if not exists idx_planning_poker_votes_user_id
  on public.planning_poker_votes (user_id);

drop trigger if exists trg_planning_poker_votes_set_updated_at on public.planning_poker_votes;
create trigger trg_planning_poker_votes_set_updated_at
before update on public.planning_poker_votes
for each row execute function public.set_updated_at();

create table if not exists public.planning_poker_vote_status (
  round_id uuid not null references public.planning_poker_rounds(id) on delete cascade,
  session_id uuid not null references public.planning_poker_sessions(id) on delete cascade,
  session_story_id uuid not null references public.planning_poker_session_stories(id) on delete cascade,
  participant_id uuid not null references public.planning_poker_participants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  has_voted boolean not null default true,
  voted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (round_id, participant_id)
);

create index if not exists idx_planning_poker_vote_status_session_round
  on public.planning_poker_vote_status (session_id, round_id);

create index if not exists idx_planning_poker_vote_status_user_id
  on public.planning_poker_vote_status (user_id);

drop trigger if exists trg_planning_poker_vote_status_set_updated_at on public.planning_poker_vote_status;
create trigger trg_planning_poker_vote_status_set_updated_at
before update on public.planning_poker_vote_status
for each row execute function public.set_updated_at();

create table if not exists public.planning_poker_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.planning_poker_sessions(id) on delete cascade,
  session_story_id uuid not null references public.planning_poker_session_stories(id) on delete cascade,
  final_round_id uuid not null references public.planning_poker_rounds(id) on delete restrict,
  final_estimate text not null,
  final_estimate_numeric numeric null,
  average numeric null,
  median numeric null,
  lowest_vote numeric null,
  highest_vote numeric null,
  divergence numeric null,
  vote_count integer not null default 0,
  abstention_count integer not null default 0,
  unknown_count integer not null default 0,
  accepted_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planning_poker_results_final_estimate_not_empty check (
    nullif(btrim(final_estimate), '') is not null
  ),
  constraint planning_poker_results_counts_check check (
    vote_count >= 0
    and abstention_count >= 0
    and unknown_count >= 0
  )
);

create unique index if not exists idx_planning_poker_results_story
  on public.planning_poker_results (session_story_id);

create index if not exists idx_planning_poker_results_session
  on public.planning_poker_results (session_id, created_at desc);

drop trigger if exists trg_planning_poker_results_set_updated_at on public.planning_poker_results;
create trigger trg_planning_poker_results_set_updated_at
before update on public.planning_poker_results
for each row execute function public.set_updated_at();

create or replace function public.planning_poker_default_scale_values(p_scoring_scale text)
returns jsonb
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when coalesce(nullif(trim(p_scoring_scale), ''), 'fibonacci') = 'tshirt' then
      '["XS", "S", "M", "L", "XL"]'::jsonb
    else
      '["0", "1", "2", "3", "5", "8", "13", "21", "?"]'::jsonb
  end;
$$;

create or replace function public.planning_poker_normalize_scale_values(
  p_scoring_scale text,
  p_scoring_values jsonb default null
)
returns jsonb
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_scoring_values is not null and jsonb_typeof(p_scoring_values) = 'array' then
      p_scoring_values
    else
      public.planning_poker_default_scale_values(p_scoring_scale)
  end;
$$;

create or replace function public.create_planning_poker_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    exit when not exists (
      select 1
      from public.planning_poker_sessions pps
      where pps.invite_code = v_code
    );
  end loop;

  return v_code;
end;
$$;

create or replace function public.planning_poker_team_matches_project(
  p_team_id uuid,
  p_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    p_team_id is null
    or exists (
      select 1
      from public.teams t
      where t.id = p_team_id
        and t.project_id = p_project_id
    ),
    false
  );
$$;

create or replace function public.can_view_planning_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planning_poker_sessions pps
    where pps.id = p_session_id
      and (
        pps.facilitator_id = auth.uid()
        or public.is_project_member(pps.project_id)
        or exists (
          select 1
          from public.planning_poker_participants ppp
          where ppp.session_id = pps.id
            and ppp.user_id = auth.uid()
            and ppp.status = 'joined'
        )
      )
  );
$$;

create or replace function public.can_facilitate_planning_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planning_poker_sessions pps
    where pps.id = p_session_id
      and pps.status not in ('completed', 'canceled')
      and (
        pps.facilitator_id = auth.uid()
        or public.can_manage_project(pps.project_id)
        or exists (
          select 1
          from public.planning_poker_participants ppp
          where ppp.session_id = pps.id
            and ppp.user_id = auth.uid()
            and ppp.role = 'facilitator'
            and ppp.status = 'joined'
        )
      )
  );
$$;

create or replace function public.planning_poker_round_is_revealed(p_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planning_poker_rounds ppr
    where ppr.id = p_round_id
      and ppr.status in ('revealed', 'closed')
  );
$$;

create or replace function public.can_vote_planning_round(p_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.planning_poker_rounds ppr
    join public.planning_poker_participants ppp
      on ppp.session_id = ppr.session_id
     and ppp.user_id = auth.uid()
    join public.planning_poker_sessions pps
      on pps.id = ppr.session_id
    where ppr.id = p_round_id
      and ppr.status = 'voting'
      and pps.status = 'voting'
      and ppp.status = 'joined'
      and ppp.role in ('facilitator', 'participant')
  );
$$;

create or replace function public.planning_poker_format_numeric(p_value numeric)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when p_value is null then null
    when p_value = trunc(p_value) then trim(to_char(p_value, 'FM999999999999999990'))
    else trim(to_char(p_value, 'FM999999999999999990.99'))
  end;
$$;

revoke all on function public.planning_poker_default_scale_values(text) from public;
revoke all on function public.planning_poker_normalize_scale_values(text, jsonb) from public;
revoke all on function public.create_planning_poker_invite_code() from public;
revoke all on function public.planning_poker_team_matches_project(uuid, uuid) from public;
revoke all on function public.can_view_planning_session(uuid) from public;
revoke all on function public.can_facilitate_planning_session(uuid) from public;
revoke all on function public.planning_poker_round_is_revealed(uuid) from public;
revoke all on function public.can_vote_planning_round(uuid) from public;
revoke all on function public.planning_poker_format_numeric(numeric) from public;

grant execute on function public.can_view_planning_session(uuid) to authenticated;
grant execute on function public.can_facilitate_planning_session(uuid) to authenticated;
grant execute on function public.can_vote_planning_round(uuid) to authenticated;

create or replace function public.sync_planning_poker_vote_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.planning_poker_vote_status ppvs
    where ppvs.round_id = old.round_id
      and ppvs.participant_id = old.participant_id;

    return old;
  end if;

  insert into public.planning_poker_vote_status (
    round_id,
    session_id,
    session_story_id,
    participant_id,
    user_id,
    has_voted,
    voted_at
  )
  values (
    new.round_id,
    new.session_id,
    new.session_story_id,
    new.participant_id,
    new.user_id,
    true,
    now()
  )
  on conflict (round_id, participant_id) do update
    set
      has_voted = true,
      voted_at = excluded.voted_at,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_planning_poker_vote_saved_sync_status on public.planning_poker_votes;
drop trigger if exists on_planning_poker_vote_deleted_sync_status on public.planning_poker_votes;
create trigger on_planning_poker_vote_saved_sync_status
after insert or update on public.planning_poker_votes
for each row execute function public.sync_planning_poker_vote_status();

create trigger on_planning_poker_vote_deleted_sync_status
after delete on public.planning_poker_votes
for each row execute function public.sync_planning_poker_vote_status();

create or replace function public.create_planning_poker_session(
  p_project_id uuid,
  p_name text,
  p_user_story_ids uuid[],
  p_team_id uuid default null,
  p_scoring_scale text default 'fibonacci',
  p_scoring_values jsonb default null,
  p_vote_time_limit_seconds integer default 300,
  p_allow_revote boolean default true,
  p_reveal_votes_after_all boolean default false,
  p_allow_abstention boolean default true,
  p_allow_observers boolean default true
)
returns setof public.planning_poker_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.planning_poker_sessions%rowtype;
  v_name text := trim(coalesce(p_name, ''));
  v_scoring_scale text := coalesce(nullif(trim(p_scoring_scale), ''), 'fibonacci');
  v_story_count integer;
  v_valid_story_count integer;
begin
  if not public.can_manage_project(p_project_id) then
    raise exception 'Apenas responsáveis e administradores do projeto podem criar uma Roda da Fogueira.';
  end if;

  if v_name = '' then
    raise exception 'Informe um nome para a sessão.';
  end if;

  if v_scoring_scale not in ('fibonacci', 'tshirt', 'custom') then
    raise exception 'Escala de votação inválida.';
  end if;

  if p_vote_time_limit_seconds is not null and p_vote_time_limit_seconds not between 15 and 3600 then
    raise exception 'O tempo de votação deve ficar entre 15 segundos e 60 minutos.';
  end if;

  if p_team_id is not null and not public.planning_poker_team_matches_project(p_team_id, p_project_id) then
    raise exception 'O time informado não pertence ao projeto.';
  end if;

  select count(*) into v_story_count
  from unnest(coalesce(p_user_story_ids, array[]::uuid[])) as story_id;

  if v_story_count = 0 then
    raise exception 'Selecione ao menos uma história para estimar.';
  end if;

  select count(*) into v_valid_story_count
  from public.user_stories us
  where us.id = any(p_user_story_ids)
    and us.project_id = p_project_id;

  if v_valid_story_count <> v_story_count then
    raise exception 'Todas as histórias da sessão precisam pertencer ao projeto.';
  end if;

  insert into public.planning_poker_sessions (
    project_id,
    team_id,
    facilitator_id,
    name,
    status,
    scoring_scale,
    scoring_values,
    vote_time_limit_seconds,
    allow_revote,
    reveal_votes_after_all,
    allow_abstention,
    allow_observers,
    allow_guest_participants,
    save_history,
    invite_code
  )
  values (
    p_project_id,
    p_team_id,
    auth.uid(),
    v_name,
    'draft',
    v_scoring_scale,
    public.planning_poker_normalize_scale_values(v_scoring_scale, p_scoring_values),
    p_vote_time_limit_seconds,
    coalesce(p_allow_revote, true),
    coalesce(p_reveal_votes_after_all, false),
    coalesce(p_allow_abstention, true),
    coalesce(p_allow_observers, true),
    false,
    true,
    public.create_planning_poker_invite_code()
  )
  returning * into v_session;

  insert into public.planning_poker_session_stories (
    session_id,
    user_story_id,
    position
  )
  select
    v_session.id,
    ordered_stories.story_id,
    ordered_stories.position::integer
  from unnest(p_user_story_ids) with ordinality as ordered_stories(story_id, position);

  insert into public.planning_poker_participants (
    session_id,
    user_id,
    display_name,
    role,
    status
  )
  values (
    v_session.id,
    auth.uid(),
    null,
    'facilitator',
    'joined'
  )
  on conflict (session_id, user_id) do update
    set
      role = 'facilitator',
      status = 'joined',
      last_seen_at = now();

  return query
    select *
    from public.planning_poker_sessions pps
    where pps.id = v_session.id;
end;
$$;

create or replace function public.join_planning_poker_session(
  p_session_id uuid,
  p_display_name text default null,
  p_role text default 'participant'
)
returns setof public.planning_poker_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.planning_poker_sessions%rowtype;
  v_role text := coalesce(nullif(trim(p_role), ''), 'participant');
  v_participant public.planning_poker_participants%rowtype;
begin
  select * into v_session
  from public.planning_poker_sessions pps
  where pps.id = p_session_id;

  if not found then
    raise exception 'Sessão da Roda da Fogueira não encontrada.';
  end if;

  if v_session.status in ('completed', 'canceled') then
    raise exception 'Esta sessão já foi encerrada.';
  end if;

  if not public.is_project_member(v_session.project_id) then
    raise exception 'Apenas membros do projeto podem entrar nesta sessão.';
  end if;

  if v_role not in ('participant', 'observer') then
    raise exception 'Papel inválido para entrada na sessão.';
  end if;

  if v_role = 'observer' and not v_session.allow_observers then
    raise exception 'Esta sessão não permite observadores.';
  end if;

  insert into public.planning_poker_participants (
    session_id,
    user_id,
    display_name,
    role,
    status,
    last_seen_at
  )
  values (
    p_session_id,
    auth.uid(),
    nullif(trim(coalesce(p_display_name, '')), ''),
    v_role,
    'joined',
    now()
  )
  on conflict (session_id, user_id) do update
    set
      display_name = coalesce(excluded.display_name, public.planning_poker_participants.display_name),
      status = 'joined',
      last_seen_at = now()
  returning * into v_participant;

  return query
    select *
    from public.planning_poker_participants ppp
    where ppp.id = v_participant.id;
end;
$$;

create or replace function public.start_planning_poker_round(
  p_session_story_id uuid,
  p_vote_time_limit_seconds integer default null
)
returns setof public.planning_poker_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_story public.planning_poker_session_stories%rowtype;
  v_session public.planning_poker_sessions%rowtype;
  v_round public.planning_poker_rounds%rowtype;
  v_round_number integer;
  v_limit_seconds integer;
begin
  select * into v_session_story
  from public.planning_poker_session_stories ppss
  where ppss.id = p_session_story_id;

  if not found then
    raise exception 'História da sessão não encontrada.';
  end if;

  select * into v_session
  from public.planning_poker_sessions pps
  where pps.id = v_session_story.session_id;

  if not public.can_facilitate_planning_session(v_session.id) then
    raise exception 'Apenas o facilitador pode iniciar uma rodada.';
  end if;

  if v_session_story.status = 'estimated' then
    raise exception 'Esta história já foi estimada.';
  end if;

  select coalesce(max(ppr.round_number), 0) + 1 into v_round_number
  from public.planning_poker_rounds ppr
  where ppr.session_story_id = p_session_story_id;

  v_limit_seconds := coalesce(p_vote_time_limit_seconds, v_session.vote_time_limit_seconds);

  if v_limit_seconds is not null and v_limit_seconds not between 15 and 3600 then
    raise exception 'O tempo de votação deve ficar entre 15 segundos e 60 minutos.';
  end if;

  update public.planning_poker_rounds ppr
  set status = case when ppr.status = 'voting' then 'closed' else ppr.status end,
      closed_at = case when ppr.status = 'voting' then now() else ppr.closed_at end
  where ppr.session_id = v_session.id
    and ppr.status = 'voting';

  insert into public.planning_poker_rounds (
    session_id,
    session_story_id,
    round_number,
    status,
    started_by,
    started_at,
    ends_at
  )
  values (
    v_session.id,
    p_session_story_id,
    v_round_number,
    'voting',
    auth.uid(),
    now(),
    case
      when v_limit_seconds is null then null
      else now() + make_interval(secs => v_limit_seconds)
    end
  )
  returning * into v_round;

  update public.planning_poker_session_stories ppss
  set status = 'voting'
  where ppss.id = p_session_story_id;

  update public.planning_poker_sessions pps
  set
    status = 'voting',
    started_at = coalesce(pps.started_at, now())
  where pps.id = v_session.id;

  return query
    select *
    from public.planning_poker_rounds ppr
    where ppr.id = v_round.id;
end;
$$;

create or replace function public.cast_planning_poker_vote(
  p_round_id uuid,
  p_vote_value text,
  p_vote_kind text default 'estimate'
)
returns setof public.planning_poker_vote_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.planning_poker_rounds%rowtype;
  v_session public.planning_poker_sessions%rowtype;
  v_participant public.planning_poker_participants%rowtype;
  v_vote_kind text := coalesce(nullif(trim(p_vote_kind), ''), 'estimate');
  v_vote_value text := trim(coalesce(p_vote_value, ''));
  v_vote_numeric numeric;
  v_existing_vote_id uuid;
begin
  select * into v_round
  from public.planning_poker_rounds ppr
  where ppr.id = p_round_id;

  if not found then
    raise exception 'Rodada de votação não encontrada.';
  end if;

  select * into v_session
  from public.planning_poker_sessions pps
  where pps.id = v_round.session_id;

  if v_session.status <> 'voting' or v_round.status <> 'voting' then
    raise exception 'Esta rodada não está aberta para votação.';
  end if;

  if not public.is_project_member(v_session.project_id) then
    raise exception 'Apenas membros do projeto podem votar nesta sessão.';
  end if;

  select * into v_participant
  from public.planning_poker_participants ppp
  where ppp.session_id = v_session.id
    and ppp.user_id = auth.uid();

  if not found then
    insert into public.planning_poker_participants (
      session_id,
      user_id,
      role,
      status,
      last_seen_at
    )
    values (
      v_session.id,
      auth.uid(),
      'participant',
      'joined',
      now()
    )
    returning * into v_participant;
  end if;

  if v_participant.status <> 'joined' or v_participant.role = 'observer' then
    raise exception 'Observadores não podem votar.';
  end if;

  if v_vote_kind not in ('estimate', 'abstain', 'unknown') then
    raise exception 'Tipo de voto inválido.';
  end if;

  if v_vote_kind = 'abstain' then
    if not v_session.allow_abstention then
      raise exception 'Esta sessão não permite abstenção.';
    end if;

    v_vote_value := 'Abster-se';
    v_vote_numeric := null;
  elsif v_vote_kind = 'unknown' or v_vote_value = '?' then
    v_vote_kind := 'unknown';
    v_vote_value := '?';
    v_vote_numeric := null;
  else
    if v_vote_value = '' then
      raise exception 'Selecione uma carta para votar.';
    end if;

    if not exists (
      select 1
      from jsonb_array_elements_text(v_session.scoring_values) as scale(value)
      where scale.value = v_vote_value
    ) then
      raise exception 'Carta inválida para a escala desta sessão.';
    end if;

    if v_vote_value ~ '^[0-9]+(\.[0-9]+)?$' then
      v_vote_numeric := v_vote_value::numeric;
    else
      v_vote_numeric := null;
    end if;
  end if;

  select ppv.id into v_existing_vote_id
  from public.planning_poker_votes ppv
  where ppv.round_id = p_round_id
    and ppv.participant_id = v_participant.id;

  if v_existing_vote_id is not null and not v_session.allow_revote then
    raise exception 'Esta sessão não permite alterar o voto.';
  end if;

  insert into public.planning_poker_votes (
    session_id,
    session_story_id,
    round_id,
    participant_id,
    user_id,
    vote_value,
    vote_numeric,
    vote_kind
  )
  values (
    v_round.session_id,
    v_round.session_story_id,
    v_round.id,
    v_participant.id,
    auth.uid(),
    v_vote_value,
    v_vote_numeric,
    v_vote_kind
  )
  on conflict (round_id, participant_id) do update
    set
      vote_value = excluded.vote_value,
      vote_numeric = excluded.vote_numeric,
      vote_kind = excluded.vote_kind;

  update public.planning_poker_participants ppp
  set last_seen_at = now()
  where ppp.id = v_participant.id;

  return query
    select *
    from public.planning_poker_vote_status ppvs
    where ppvs.round_id = p_round_id
      and ppvs.participant_id = v_participant.id;
end;
$$;

create or replace function public.reveal_planning_poker_round(p_round_id uuid)
returns setof public.planning_poker_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.planning_poker_rounds%rowtype;
  v_session public.planning_poker_sessions%rowtype;
  v_expected_votes integer;
  v_submitted_votes integer;
begin
  select * into v_round
  from public.planning_poker_rounds ppr
  where ppr.id = p_round_id;

  if not found then
    raise exception 'Rodada de votação não encontrada.';
  end if;

  if not public.can_facilitate_planning_session(v_round.session_id) then
    raise exception 'Apenas o facilitador pode revelar os votos.';
  end if;

  select * into v_session
  from public.planning_poker_sessions pps
  where pps.id = v_round.session_id;

  if v_round.status <> 'voting' then
    raise exception 'Apenas rodadas em votação podem ser reveladas.';
  end if;

  if v_session.reveal_votes_after_all then
    select count(*)::integer into v_expected_votes
    from public.planning_poker_participants ppp
    where ppp.session_id = v_round.session_id
      and ppp.status = 'joined'
      and ppp.role in ('facilitator', 'participant');

    select count(*)::integer into v_submitted_votes
    from public.planning_poker_vote_status ppvs
    where ppvs.round_id = v_round.id
      and ppvs.has_voted;

    if v_submitted_votes < v_expected_votes then
      raise exception 'A revelação está configurada para acontecer somente após todos votarem.';
    end if;
  end if;

  update public.planning_poker_rounds ppr
  set
    status = 'revealed',
    revealed_at = now()
  where ppr.id = p_round_id;

  update public.planning_poker_sessions pps
  set status = 'revealed'
  where pps.id = v_round.session_id;

  return query
    select *
    from public.planning_poker_rounds ppr
    where ppr.id = p_round_id;
end;
$$;

create or replace function public.seal_planning_poker_estimate(
  p_session_story_id uuid,
  p_final_estimate text default null
)
returns setof public.planning_poker_results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_story public.planning_poker_session_stories%rowtype;
  v_round public.planning_poker_rounds%rowtype;
  v_final_estimate text := nullif(trim(coalesce(p_final_estimate, '')), '');
  v_final_estimate_numeric numeric;
  v_average numeric;
  v_median numeric;
  v_lowest numeric;
  v_highest numeric;
  v_divergence numeric;
  v_vote_count integer;
  v_abstention_count integer;
  v_unknown_count integer;
  v_mode_vote text;
  v_result public.planning_poker_results%rowtype;
begin
  select * into v_session_story
  from public.planning_poker_session_stories ppss
  where ppss.id = p_session_story_id;

  if not found then
    raise exception 'História da sessão não encontrada.';
  end if;

  if not public.can_facilitate_planning_session(v_session_story.session_id) then
    raise exception 'Apenas o facilitador pode selar a estimativa.';
  end if;

  select * into v_round
  from public.planning_poker_rounds ppr
  where ppr.session_story_id = p_session_story_id
    and ppr.status = 'revealed'
  order by ppr.round_number desc
  limit 1;

  if not found then
    raise exception 'Revele uma rodada antes de selar a estimativa.';
  end if;

  select
    avg(ppv.vote_numeric),
    (percentile_cont(0.5) within group (order by ppv.vote_numeric))::numeric,
    min(ppv.vote_numeric),
    max(ppv.vote_numeric),
    (count(*) filter (where ppv.vote_kind = 'estimate'))::integer,
    (count(*) filter (where ppv.vote_kind = 'abstain'))::integer,
    (count(*) filter (where ppv.vote_kind = 'unknown'))::integer
    into
      v_average,
      v_median,
      v_lowest,
      v_highest,
      v_vote_count,
      v_abstention_count,
      v_unknown_count
  from public.planning_poker_votes ppv
  where ppv.round_id = v_round.id;

  select ppv.vote_value into v_mode_vote
  from public.planning_poker_votes ppv
  where ppv.round_id = v_round.id
    and ppv.vote_kind = 'estimate'
  group by ppv.vote_value
  order by count(*) desc, ppv.vote_value
  limit 1;

  v_divergence := case
    when v_lowest is null or v_highest is null then null
    else v_highest - v_lowest
  end;

  if v_final_estimate is null then
    v_final_estimate := coalesce(
      public.planning_poker_format_numeric(v_median),
      v_mode_vote,
      '?'
    );
  end if;

  if v_final_estimate ~ '^[0-9]+(\.[0-9]+)?$' then
    v_final_estimate_numeric := v_final_estimate::numeric;
  else
    v_final_estimate_numeric := null;
  end if;

  insert into public.planning_poker_results (
    session_id,
    session_story_id,
    final_round_id,
    final_estimate,
    final_estimate_numeric,
    average,
    median,
    lowest_vote,
    highest_vote,
    divergence,
    vote_count,
    abstention_count,
    unknown_count,
    accepted_by
  )
  values (
    v_round.session_id,
    p_session_story_id,
    v_round.id,
    v_final_estimate,
    v_final_estimate_numeric,
    v_average,
    v_median,
    v_lowest,
    v_highest,
    v_divergence,
    coalesce(v_vote_count, 0),
    coalesce(v_abstention_count, 0),
    coalesce(v_unknown_count, 0),
    auth.uid()
  )
  on conflict (session_story_id) do update
    set
      final_round_id = excluded.final_round_id,
      final_estimate = excluded.final_estimate,
      final_estimate_numeric = excluded.final_estimate_numeric,
      average = excluded.average,
      median = excluded.median,
      lowest_vote = excluded.lowest_vote,
      highest_vote = excluded.highest_vote,
      divergence = excluded.divergence,
      vote_count = excluded.vote_count,
      abstention_count = excluded.abstention_count,
      unknown_count = excluded.unknown_count,
      accepted_by = excluded.accepted_by
  returning * into v_result;

  update public.planning_poker_session_stories ppss
  set
    status = 'estimated',
    final_estimate = v_final_estimate,
    final_estimate_numeric = v_final_estimate_numeric,
    estimated_by = auth.uid(),
    estimated_at = now()
  where ppss.id = p_session_story_id;

  update public.user_stories us
  set estimation_status = 'estimated'
  where us.id = v_session_story.user_story_id;

  update public.planning_poker_rounds ppr
  set
    status = 'closed',
    closed_at = now()
  where ppr.id = v_round.id;

  update public.planning_poker_sessions pps
  set status = case
    when exists (
      select 1
      from public.planning_poker_session_stories ppss
      where ppss.session_id = pps.id
        and ppss.status in ('pending', 'voting')
    ) then 'active'
    else 'completed'
  end,
  completed_at = case
    when exists (
      select 1
      from public.planning_poker_session_stories ppss
      where ppss.session_id = pps.id
        and ppss.status in ('pending', 'voting')
    ) then pps.completed_at
    else now()
  end
  where pps.id = v_round.session_id;

  return query
    select *
    from public.planning_poker_results ppr
    where ppr.id = v_result.id;
end;
$$;

create or replace function public.skip_planning_poker_story(p_session_story_id uuid)
returns setof public.planning_poker_session_stories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_story public.planning_poker_session_stories%rowtype;
begin
  select * into v_session_story
  from public.planning_poker_session_stories ppss
  where ppss.id = p_session_story_id;

  if not found then
    raise exception 'História da sessão não encontrada.';
  end if;

  if not public.can_facilitate_planning_session(v_session_story.session_id) then
    raise exception 'Apenas o facilitador pode pular uma história.';
  end if;

  update public.planning_poker_rounds ppr
  set
    status = case when ppr.status = 'voting' then 'canceled' else ppr.status end,
    closed_at = case when ppr.status = 'voting' then now() else ppr.closed_at end
  where ppr.session_story_id = p_session_story_id
    and ppr.status = 'voting';

  update public.planning_poker_session_stories ppss
  set status = 'skipped'
  where ppss.id = p_session_story_id;

  update public.planning_poker_sessions pps
  set status = case
    when exists (
      select 1
      from public.planning_poker_session_stories pending_story
      where pending_story.session_id = pps.id
        and pending_story.status in ('pending', 'voting')
    ) then 'active'
    else 'completed'
  end,
  completed_at = case
    when exists (
      select 1
      from public.planning_poker_session_stories pending_story
      where pending_story.session_id = pps.id
        and pending_story.status in ('pending', 'voting')
    ) then pps.completed_at
    else now()
  end
  where pps.id = v_session_story.session_id;

  return query
    select *
    from public.planning_poker_session_stories ppss
    where ppss.id = p_session_story_id;
end;
$$;

create or replace function public.complete_planning_poker_session(p_session_id uuid)
returns setof public.planning_poker_sessions
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_facilitate_planning_session(p_session_id) then
    raise exception 'Apenas o facilitador pode finalizar a sessão.';
  end if;

  update public.planning_poker_rounds ppr
  set
    status = case when ppr.status = 'voting' then 'canceled' else ppr.status end,
    closed_at = case when ppr.status = 'voting' then now() else ppr.closed_at end
  where ppr.session_id = p_session_id
    and ppr.status = 'voting';

  update public.planning_poker_sessions pps
  set
    status = 'completed',
    completed_at = now()
  where pps.id = p_session_id;

  return query
    select *
    from public.planning_poker_sessions pps
    where pps.id = p_session_id;
end;
$$;

revoke all on function public.sync_planning_poker_vote_status() from public;
revoke all on function public.create_planning_poker_session(uuid, text, uuid[], uuid, text, jsonb, integer, boolean, boolean, boolean, boolean) from public;
revoke all on function public.join_planning_poker_session(uuid, text, text) from public;
revoke all on function public.start_planning_poker_round(uuid, integer) from public;
revoke all on function public.cast_planning_poker_vote(uuid, text, text) from public;
revoke all on function public.reveal_planning_poker_round(uuid) from public;
revoke all on function public.seal_planning_poker_estimate(uuid, text) from public;
revoke all on function public.skip_planning_poker_story(uuid) from public;
revoke all on function public.complete_planning_poker_session(uuid) from public;

grant execute on function public.create_planning_poker_session(uuid, text, uuid[], uuid, text, jsonb, integer, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.join_planning_poker_session(uuid, text, text) to authenticated;
grant execute on function public.start_planning_poker_round(uuid, integer) to authenticated;
grant execute on function public.cast_planning_poker_vote(uuid, text, text) to authenticated;
grant execute on function public.reveal_planning_poker_round(uuid) to authenticated;
grant execute on function public.seal_planning_poker_estimate(uuid, text) to authenticated;
grant execute on function public.skip_planning_poker_story(uuid) to authenticated;
grant execute on function public.complete_planning_poker_session(uuid) to authenticated;

alter table public.planning_poker_sessions enable row level security;
alter table public.planning_poker_session_stories enable row level security;
alter table public.planning_poker_participants enable row level security;
alter table public.planning_poker_rounds enable row level security;
alter table public.planning_poker_votes enable row level security;
alter table public.planning_poker_vote_status enable row level security;
alter table public.planning_poker_results enable row level security;

revoke all privileges on public.planning_poker_sessions from authenticated;
revoke all privileges on public.planning_poker_session_stories from authenticated;
revoke all privileges on public.planning_poker_participants from authenticated;
revoke all privileges on public.planning_poker_rounds from authenticated;
revoke all privileges on public.planning_poker_votes from authenticated;
revoke all privileges on public.planning_poker_vote_status from authenticated;
revoke all privileges on public.planning_poker_results from authenticated;

grant select on public.planning_poker_sessions to authenticated;
grant select on public.planning_poker_session_stories to authenticated;
grant select on public.planning_poker_participants to authenticated;
grant select on public.planning_poker_rounds to authenticated;
grant select on public.planning_poker_votes to authenticated;
grant select on public.planning_poker_vote_status to authenticated;
grant select on public.planning_poker_results to authenticated;

drop policy if exists "planning_poker_sessions_select_viewer" on public.planning_poker_sessions;
create policy "planning_poker_sessions_select_viewer"
on public.planning_poker_sessions
for select
to authenticated
using (public.can_view_planning_session(id));

drop policy if exists "planning_poker_session_stories_select_viewer" on public.planning_poker_session_stories;
create policy "planning_poker_session_stories_select_viewer"
on public.planning_poker_session_stories
for select
to authenticated
using (public.can_view_planning_session(session_id));

drop policy if exists "planning_poker_participants_select_viewer" on public.planning_poker_participants;
create policy "planning_poker_participants_select_viewer"
on public.planning_poker_participants
for select
to authenticated
using (public.can_view_planning_session(session_id));

drop policy if exists "planning_poker_rounds_select_viewer" on public.planning_poker_rounds;
create policy "planning_poker_rounds_select_viewer"
on public.planning_poker_rounds
for select
to authenticated
using (public.can_view_planning_session(session_id));

drop policy if exists "planning_poker_votes_select_visible" on public.planning_poker_votes;
create policy "planning_poker_votes_select_visible"
on public.planning_poker_votes
for select
to authenticated
using (
  public.can_view_planning_session(session_id)
  and public.planning_poker_round_is_revealed(round_id)
);

drop policy if exists "planning_poker_vote_status_select_viewer" on public.planning_poker_vote_status;
create policy "planning_poker_vote_status_select_viewer"
on public.planning_poker_vote_status
for select
to authenticated
using (public.can_view_planning_session(session_id));

drop policy if exists "planning_poker_results_select_viewer" on public.planning_poker_results;
create policy "planning_poker_results_select_viewer"
on public.planning_poker_results
for select
to authenticated
using (public.can_view_planning_session(session_id));

alter table public.planning_poker_sessions replica identity full;
alter table public.planning_poker_session_stories replica identity full;
alter table public.planning_poker_participants replica identity full;
alter table public.planning_poker_rounds replica identity full;
alter table public.planning_poker_votes replica identity full;
alter table public.planning_poker_vote_status replica identity full;
alter table public.planning_poker_results replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'planning_poker_sessions'
    ) then
      alter publication supabase_realtime add table public.planning_poker_sessions;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'planning_poker_session_stories'
    ) then
      alter publication supabase_realtime add table public.planning_poker_session_stories;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'planning_poker_participants'
    ) then
      alter publication supabase_realtime add table public.planning_poker_participants;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'planning_poker_rounds'
    ) then
      alter publication supabase_realtime add table public.planning_poker_rounds;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'planning_poker_vote_status'
    ) then
      alter publication supabase_realtime add table public.planning_poker_vote_status;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'planning_poker_results'
    ) then
      alter publication supabase_realtime add table public.planning_poker_results;
    end if;
  end if;
end;
$$;
