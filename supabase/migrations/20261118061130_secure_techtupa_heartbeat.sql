-- Provisioned by the central TechTupa monitor, outside the application schema.
-- The monitor uses service_role: GET main, UPSERT main, GET confirmation.
-- No browser/account access is needed, including product administrators.
begin;
set local lock_timeout = '5s';

-- Fail rather than silently keeping an unexpected existing access policy.
do $$
begin
  if exists (
    select 1 from pg_policy where polrelid = 'public.techtupa_heartbeat'::regclass
  ) then
    raise exception 'Heartbeat policies changed; review the monitoring access model before applying';
  end if;
end;
$$;

alter table public.techtupa_heartbeat enable row level security;
-- RLS alone does not protect TRUNCATE, REFERENCES or TRIGGER privileges.
revoke all privileges on table public.techtupa_heartbeat from public, anon, authenticated;
grant select, insert, update on table public.techtupa_heartbeat to service_role;
-- Preserve existing owner/service grants and the row, defaults and schedule.
-- Intentionally no policies: service_role has BYPASSRLS; clients are denied.
commit;
