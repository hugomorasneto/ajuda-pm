-- ProdForge - Roda da Fogueira timer hardening.
-- Blocks votes after the configured timer ends and allows reveal when time expires.

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
      and (ppr.ends_at is null or now() < ppr.ends_at)
      and ppp.status = 'joined'
      and ppp.role in ('facilitator', 'participant')
  );
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

  if v_round.ends_at is not null and now() >= v_round.ends_at then
    raise exception 'Tempo de votação encerrado.';
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

  if v_session.reveal_votes_after_all and (v_round.ends_at is null or now() < v_round.ends_at) then
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

revoke all on function public.can_vote_planning_round(uuid) from public;
revoke all on function public.cast_planning_poker_vote(uuid, text, text) from public;
revoke all on function public.reveal_planning_poker_round(uuid) from public;

grant execute on function public.can_vote_planning_round(uuid) to authenticated;
grant execute on function public.cast_planning_poker_vote(uuid, text, text) to authenticated;
grant execute on function public.reveal_planning_poker_round(uuid) to authenticated;
