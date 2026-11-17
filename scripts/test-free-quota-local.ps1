# Uses disposable Docker containers, fictional accounts and a simulated Gemini.
# No repository environment file, remote backend or provider credential is read.
$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$repoRoot = Split-Path -Parent $PSScriptRoot
$network = 'prodforge-quota-test-network'
$database = 'prodforge-quota-test-db'
$rest = 'prodforge-quota-test-rest'
$ownedContainers = @()
$ownsNetwork = $false

function Invoke-Docker {
  & docker @args
  if ($LASTEXITCODE -ne 0) { throw "Docker command failed with exit code $LASTEXITCODE" }
}

try {
  # Creation fails if these names are already in use. Existing resources are
  # preserved, including resources belonging to another validation session.
  Invoke-Docker network create $network
  $ownsNetwork = $true
  Invoke-Docker run -d --name $database --network $network -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17.11-alpine
  $ownedContainers += $database

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    & docker exec $database pg_isready -U postgres *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Local PostgreSQL did not become ready' }

  $bootstrap = @'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit;
grant anon, authenticated, service_role to authenticator;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable
as $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid $$;
create function auth.role() returns text language sql stable
as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role' $$;
grant usage on schema auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
'@
  $prerequisites = 'init', 'auth-rls', 'learning-progress', 'analytics-admin', 'admin-readonly', 'admin-user-access', 'projects-foundation'
  $schema = ($prerequisites | ForEach-Object {
    Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repoRoot "supabase/$_.sql")
  }) -join "`n"
  $fixtures = @'
insert into auth.users values
('aa000000-0000-0000-0000-000000000001', 'free@example.test'),
('aa000000-0000-0000-0000-000000000002', 'other@example.test'),
('aa000000-0000-0000-0000-000000000003', 'pro@example.test');
insert into public.user_stories (user_id, input_context, input_requirements, title, user_story, created_at, status)
select 'aa000000-0000-0000-0000-000000000001', 'Contexto', '', 'História existente', 'História', '2024-01-01', 'reviewed'
from generate_series(1, 9);
update public.profiles set plan = 'premium' where email = 'pro@example.test';
insert into public.projects (id, owner_id, name)
values ('ab000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000002', 'Quota test project');
create function public.quota_test_reject_save() returns trigger language plpgsql as $$
begin
  if new.input_context = 'FAIL_DB' then raise exception 'Expected local fixture failure'; end if;
  return new;
end;
$$;
create trigger quota_test_reject_save before insert on public.user_stories
for each row execute function public.quota_test_reject_save();
'@
  $migration = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repoRoot 'supabase/migrations/20261117171616_free_lifetime_story_generation_quota.sql')
  $sqlTests = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repoRoot 'supabase/tests/free-story-quota.sql')
  @($bootstrap, $schema, $fixtures, $migration, $sqlTests) -join "`n" |
    & docker exec -i $database psql -X -q -U postgres -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Local schema or SQL regression tests failed' }

  Invoke-Docker run -d --name $rest --network $network `
    -e "PGRST_DB_URI=postgres://authenticator@${database}:5432/postgres" `
    -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon `
    -e PGRST_JWT_SECRET=prodforge-quota-test-only-jwt-secret-2026 public.ecr.aws/supabase/postgrest:v16.5
  $ownedContainers += $rest
  Invoke-Docker run --rm --network $network --volume "${repoRoot}:/workspace:ro" denoland/deno:2.6.9 `
    deno check /workspace/supabase/functions/generate-user-story/index.ts
  Invoke-Docker run --rm --network $network --volume "${repoRoot}:/workspace:ro" denoland/deno:2.6.9 `
    deno run --allow-env --allow-net="${rest}:3000" /workspace/supabase/tests/free-story-quota.integration.mjs
  Write-Output 'PASS: local quota migration, SQL regressions and Edge/PostgREST integration'
}
finally {
  foreach ($container in $ownedContainers) {
    & docker rm -f $container *> $null
  }
  if ($ownsNetwork) { & docker network rm $network *> $null }
}
