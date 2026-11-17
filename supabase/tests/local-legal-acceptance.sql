select set_config('prodforge.test_legal_hash', :'expected_hash', false);
select set_config('prodforge.test_legal_version', :'expected_version', false);
begin;
do $$
declare
  v_release public.local_legal_releases%rowtype;
  v_first timestamptz;
begin
  select * into strict v_release from public.local_legal_releases where is_current;
  assert v_release.sha256 = current_setting('prodforge.test_legal_hash');
  assert v_release.version = current_setting('prodforge.test_legal_version');
  assert v_release.content::jsonb->'documents'->'pt-BR'->'termsOfUsePage'->>'termsOfUsePage_estes_termos_de_uso_regulam'
    like '%Hugo Cruz da Silva Moraes Neto%';
  assert not has_table_privilege('authenticated', 'public.local_legal_acceptances', 'INSERT');
  assert not has_table_privilege('authenticated', 'public.local_legal_acceptances', 'UPDATE');
  assert not has_table_privilege('authenticated', 'public.local_legal_acceptances', 'SELECT');
  assert not has_function_privilege('authenticated',
    'public.record_local_legal_acceptance(uuid,text,text,text,text)', 'EXECUTE');
  assert not has_function_privilege('anon', 'public.accept_local_legal_terms(text,text,text)', 'EXECUTE');
  insert into auth.users (id, raw_user_meta_data) values
    ('bc000000-0000-0000-0000-000000000001', jsonb_build_object(
      'prodforge_legal_acceptance', jsonb_build_object(
        'version', v_release.version, 'sha256', v_release.sha256, 'language', 'pt-BR'
      )
    )),
    ('bc000000-0000-0000-0000-000000000002', '{}');
  select accepted_at into strict v_first from public.local_legal_acceptances
  where user_id = 'bc000000-0000-0000-0000-000000000001';
  assert v_first between transaction_timestamp() and clock_timestamp();
  assert exists (select 1 from public.profiles where id = 'bc000000-0000-0000-0000-000000000001');
  assert (select source = 'signup' from public.local_legal_acceptances
    where user_id = 'bc000000-0000-0000-0000-000000000001');
  update auth.users set raw_user_meta_data = jsonb_build_object(
    'prodforge_legal_acceptance', jsonb_build_object(
      'version', v_release.version, 'sha256', v_release.sha256, 'language', 'en'
    )
  ) where id = 'bc000000-0000-0000-0000-000000000002';
  assert not exists (select 1 from public.local_legal_acceptances
    where user_id = 'bc000000-0000-0000-0000-000000000002');
  begin
    insert into auth.users (id, raw_user_meta_data) values
      ('bc000000-0000-0000-0000-000000000003', '{"prodforge_legal_acceptance":{"version":"fake"}}');
    raise exception 'Invalid signup acceptance should fail';
  exception when invalid_parameter_value then null;
  end;
  assert not exists (select 1 from auth.users where id = 'bc000000-0000-0000-0000-000000000003');
  assert not exists (select 1 from public.profiles where id = 'bc000000-0000-0000-0000-000000000003');
  begin
    update public.local_legal_releases set content = content || ' ';
    raise exception 'Snapshot mutation should fail';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bc000000-0000-0000-0000-000000000002"}', true);
do $$
declare
  v_status jsonb := public.get_local_legal_status();
  v_receipt jsonb;
  v_replay jsonb;
begin
  assert v_status->>'accepted' = 'false';
  begin
    perform public.accept_local_legal_terms(v_status->>'version', 'fake', 'en');
    raise exception 'Hash mismatch should fail';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.accept_local_legal_terms(v_status->>'version', v_status->>'sha256', 'es');
    raise exception 'Unsupported language should fail';
  exception when invalid_parameter_value then null;
  end;
  assert public.get_local_legal_status()->>'accepted' = 'false';
  v_receipt := public.accept_local_legal_terms(v_status->>'version', v_status->>'sha256', 'en');
  v_replay := public.accept_local_legal_terms(v_status->>'version', v_status->>'sha256', 'pt-BR');
  assert v_receipt = v_replay;
  assert v_receipt->>'language' = 'en';
  assert public.get_local_legal_status()->>'accepted' = 'true';
  begin
    perform 1 from public.local_legal_acceptances;
    raise exception 'Direct cross-account access should fail';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select set_config('request.jwt.claims', '{}', true);
do $$
begin
  begin
    perform public.get_local_legal_status();
    raise exception 'Anonymous status access should fail';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
do $$
declare
  v_original public.local_legal_releases%rowtype;
  v_next_content text;
begin
  select * into strict v_original from public.local_legal_releases where is_current;
  v_next_content := jsonb_set(v_original.content::jsonb, '{version}', '"test-next-release"')::text;
  update public.local_legal_releases set is_current = false;
  insert into public.local_legal_releases (version, content, sha256, is_current)
  values ('test-next-release', v_next_content, encode(digest(v_next_content, 'sha256'), 'hex'), true);
  perform set_config('request.jwt.claims', '{"sub":"bc000000-0000-0000-0000-000000000002"}', true);
  assert public.get_local_legal_status()->>'accepted' = 'false';
  assert public.get_local_legal_release(v_original.version)->>'sha256' = v_original.sha256;
  assert (select count(*) = 1 from public.local_legal_acceptances
    where user_id = 'bc000000-0000-0000-0000-000000000002');
  delete from auth.users where id = 'bc000000-0000-0000-0000-000000000002';
  assert not exists (select 1 from public.local_legal_acceptances
    where user_id = 'bc000000-0000-0000-0000-000000000002');
  assert (select count(*) = 1 from public.local_legal_acceptances
    where user_id = 'bc000000-0000-0000-0000-000000000001');
end;
$$;
rollback;
