# Disposable local PostgreSQL/PostgREST. Never reads .env or remote credentials.
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Text.UTF8Encoding]::new($false)
$repoRoot = Split-Path -Parent $PSScriptRoot
$suffix = [guid]::NewGuid().ToString('N').Substring(0, 10)
$database = "prodforge-heartbeat-db-$suffix"
$rest = "prodforge-heartbeat-rest-$suffix"
$network = "prodforge-heartbeat-net-$suffix"
$containers = @()
$networkOwned = $false
function Invoke-Docker {
  & docker @args
  if ($LASTEXITCODE -ne 0) { throw "Docker failed ($LASTEXITCODE)" }
}
function Invoke-Sql([string]$Sql) {
  $Sql | & docker exec -i $database psql -X -q -U postgres -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Heartbeat SQL regression failed' }
}
try {
  Invoke-Docker network create $network
  $networkOwned = $true
  Invoke-Docker run -d --name $database --network $network -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17.11-alpine
  $containers += $database
  $ready = $false
  for ($i=0; $i -lt 30; $i++) {
    & docker exec $database pg_isready -U postgres *> $null
    if ($LASTEXITCODE -eq 0) { $ready=$true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Local database not ready' }
  Invoke-Sql @'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit;
grant anon, authenticated, service_role to authenticator;
create table public.techtupa_heartbeat (
  id text primary key, touched_at timestamptz not null default now(),
  source text not null default 'techtupa', meta jsonb not null default '{}'
);
grant all on public.techtupa_heartbeat to public, anon, authenticated, service_role;
insert into public.techtupa_heartbeat values ('main','2026-11-01T00:00:00Z','techtupa-keepalive','{"preserved":true}');
'@
  $migration = Get-Content -Raw -Encoding UTF8 (Join-Path $repoRoot 'supabase/migrations/20261118061130_secure_techtupa_heartbeat.sql')
  Invoke-Sql $migration
  Invoke-Sql $migration # Safe repeated execution; no data or policy changes.
  Invoke-Sql (Get-Content -Raw -Encoding UTF8 (Join-Path $repoRoot 'supabase/tests/heartbeat-rls.sql'))
  Invoke-Docker run -d --name $rest --network $network -p 127.0.0.1::3000 `
    -e "PGRST_DB_URI=postgres://authenticator@$database/postgres" -e PGRST_DB_SCHEMAS=public `
    -e PGRST_DB_ANON_ROLE=anon -e 'PGRST_JWT_SECRET=local-heartbeat-secret-at-least-32-characters' postgrest/postgrest:v14.12
  $containers += $rest
  $port = (& docker port $rest 3000).Trim().Split(':')[-1]
  if ($LASTEXITCODE -ne 0) { throw 'Cannot discover isolated REST port' }
  & node (Join-Path $repoRoot 'scripts/test-heartbeat-rest.mjs') "http://127.0.0.1:$port"
  if ($LASTEXITCODE -ne 0) { throw 'Heartbeat REST integration failed' }
  Write-Output 'PASS: heartbeat SQL and real local REST, public/account isolation, monitor contract'
} finally {
  foreach ($container in $containers) { & docker rm -f $container *> $null }
  if ($networkOwned) { & docker network rm $network *> $null }
}
