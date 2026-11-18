\set ON_ERROR_STOP on
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.techtupa_heartbeat'::regclass) then
    raise exception 'RLS must be enabled';
  end if;
  if exists (select 1 from pg_policy where polrelid = 'public.techtupa_heartbeat'::regclass) then
    raise exception 'No browser policies may expose the monitor';
  end if;
  if (select count(*) from public.techtupa_heartbeat) <> 1 or not exists (
    select 1 from public.techtupa_heartbeat where id = 'main'
      and touched_at = '2026-11-01T00:00:00Z' and source = 'techtupa-keepalive'
      and meta = '{"preserved":true}'::jsonb
  ) then raise exception 'Migration modified the existing heartbeat'; end if;
end;
$$;

-- Exercise both public/account roles, including an account claiming admin in
-- editable metadata. This global infrastructure table has no tenant ownership.
do $$
declare role_name text; operation text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    foreach operation in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      if has_table_privilege(role_name, 'public.techtupa_heartbeat', operation) then
        raise exception '% still has % access', role_name, operation;
      end if;
    end loop;
    if has_any_column_privilege(role_name, 'public.techtupa_heartbeat', 'SELECT,INSERT,UPDATE,REFERENCES') then
      raise exception '% has a column grant bypass', role_name;
    end if;
    execute format('set local role %I', role_name);
    perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"aa000000-0000-0000-0000-000000000001","user_metadata":{"admin":true}}', true);
    foreach operation in array array[
      'select * from public.techtupa_heartbeat',
      'insert into public.techtupa_heartbeat(id) values (''intruder'')',
      'update public.techtupa_heartbeat set source = ''intruder'' where id = ''main''',
      'delete from public.techtupa_heartbeat where id = ''main''',
      'truncate public.techtupa_heartbeat'
    ] loop
      begin
        execute operation;
        raise exception 'Client operation unexpectedly succeeded: %', operation;
      exception when insufficient_privilege then null;
      end;
    end loop;
    reset role;
  end loop;
end;
$$;

-- Prove RLS itself also denies clients if a future grant restores CRUD.
begin;
grant select, insert, update, delete on public.techtupa_heartbeat to anon, authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-0000-0000-000000000002"}', true);
do $$
declare affected integer;
begin
  if exists(select 1 from public.techtupa_heartbeat) then raise exception 'RLS leaked monitoring data'; end if;
  begin
    insert into public.techtupa_heartbeat(id) values ('forbidden');
    raise exception 'RLS allowed insertion';
  exception when insufficient_privilege then null;
  end;
  update public.techtupa_heartbeat set source='forbidden';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS allowed updates'; end if;
  delete from public.techtupa_heartbeat;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS allowed deletion'; end if;
end;
$$;
rollback;

-- Existing backend contract, including ON CONFLICT UPDATE and RETURNING.
set role service_role;
insert into public.techtupa_heartbeat(id,touched_at,source,meta)
values ('main',now(),'techtupa-keepalive','{"run_id":"local-fixture"}')
on conflict(id) do update set touched_at=excluded.touched_at, source=excluded.source, meta=excluded.meta
returning id;
do $$
begin
  if not exists(select 1 from public.techtupa_heartbeat where id='main' and meta->>'run_id'='local-fixture') then
    raise exception 'Service monitor cannot confirm its write';
  end if;
end;
$$;
reset role;
select 'PASS: preserved row, denied clients, RLS defense, service upsert and confirmation' as result;
