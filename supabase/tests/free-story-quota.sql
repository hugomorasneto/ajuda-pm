-- Run with psql -v ON_ERROR_STOP=1 against a disposable local database
-- after applying the quota migration and its prerequisite schema.
begin;

do $$
declare
  account_id uuid := gen_random_uuid();
  second_account_id uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid();
  attempt_id uuid;
  reservation jsonb;
  result jsonb;
  saved_story_id uuid;
  generation_input jsonb := '{"input_context":"Contexto de teste","input_requirements":""}';
  generation_output jsonb := '{"title":"Revisar quota","user_story":"Como cliente, quero revisar a cota."}';
begin
  insert into auth.users (id, email) values
    (account_id, account_id::text || '@example.test'),
    (second_account_id, second_account_id::text || '@example.test');

  assert not has_table_privilege('authenticated', 'public.user_stories', 'INSERT');
  assert not has_table_privilege('authenticated', 'public.user_story_generation_requests', 'SELECT');
  assert not has_function_privilege('authenticated', 'public.reserve_story_generation(uuid,uuid,text,uuid,uuid)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.save_story_generation(uuid,uuid,uuid,jsonb,jsonb)', 'EXECUTE');

  reservation := public.reserve_story_generation(account_id, request_id, 'draft', null, null);
  attempt_id := (reservation->>'attempt_id')::uuid;
  assert reservation->>'code' = 'RESERVED';
  assert public.reserve_story_generation(account_id, request_id, 'draft', null, null)->>'code'
    = 'GENERATION_IN_PROGRESS';

  begin
    perform public.save_story_generation(account_id, request_id, attempt_id, generation_input, '{}');
    raise exception 'Expected the attempted insert to fail';
  exception when not_null_violation then
    null;
  end;
  perform public.release_story_generation(account_id, request_id, attempt_id);
  assert public.story_generation_usage_for(account_id)->>'usage_count' = '0';

  reservation := public.reserve_story_generation(account_id, request_id, 'draft', null, null);
  assert public.save_story_generation(account_id, request_id, attempt_id, generation_input, generation_output)->>'code'
    = 'RESERVATION_EXPIRED';
  attempt_id := (reservation->>'attempt_id')::uuid;
  result := public.save_story_generation(account_id, request_id, attempt_id, generation_input, generation_output);
  assert result->>'code' = 'SAVED';
  saved_story_id := (result->'story'->>'id')::uuid;
  assert public.reserve_story_generation(account_id, request_id, 'other draft', null, null)->>'code'
    = 'REQUEST_CONFLICT';

  for use_number in 2..10 loop
    request_id := gen_random_uuid();
    reservation := public.reserve_story_generation(account_id, request_id, 'refinement', null, saved_story_id);
    result := public.save_story_generation(
      account_id, request_id, (reservation->>'attempt_id')::uuid,
      generation_input || jsonb_build_object('previous_version_id', saved_story_id), generation_output
    );
    assert result->>'code' = 'SAVED';
    assert (result->'story'->>'version_number')::integer = use_number;
    saved_story_id := (result->'story'->>'id')::uuid;
  end loop;

  result := public.reserve_story_generation(account_id, request_id, 'refinement', null, null);
  assert (result->'story'->>'id')::uuid = saved_story_id;
  update public.user_story_generation_requests set completed_at = '2024-01-01' where user_id = account_id;
  update public.user_stories set title = 'Edição manual' where id = saved_story_id;
  delete from public.user_stories where id = saved_story_id;
  assert public.story_generation_usage_for(account_id)->>'usage_count' = '10';
  assert public.reserve_story_generation(account_id, gen_random_uuid(), 'eleventh', null, null)->>'code'
    = 'QUOTA_EXHAUSTED';
  assert public.story_generation_usage_for(second_account_id)->>'usage_count' = '0';

  perform set_config('request.jwt.claims', jsonb_build_object('sub', second_account_id)::text, true);
  assert public.get_story_generation_usage()->>'usage_count' = '0';
  begin
    perform public.admin_get_story_generation_usage(account_id);
    raise exception 'Expected cross-account admin read to fail';
  exception when insufficient_privilege then
    null;
  end;
  update public.profiles set role = 'admin', plan = 'premium' where id = second_account_id;
  assert public.get_story_generation_usage()->>'effective_limit' is null;
  assert public.admin_get_story_generation_usage(account_id) = 10;
  update public.profiles set forge_limit_override = 0 where id = second_account_id;
  assert public.reserve_story_generation(second_account_id, gen_random_uuid(), 'override', null, null)->>'code'
    = 'QUOTA_EXHAUSTED';
end;
$$;

rollback;
