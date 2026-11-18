param([switch]$Production)
$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$repoRoot = Split-Path -Parent $PSScriptRoot
$container = 'prodforge-legal-test-db'
$owned = $false
$jobs = @()
try {
  & docker run -d --name $container -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17.11-alpine
  if ($LASTEXITCODE -ne 0) { throw 'Cannot create isolated legal test database' }
  $owned = $true
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    & docker exec $container pg_isready -U postgres *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Local database did not become ready' }
  $bootstrap = @'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text not null default '',
  raw_user_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable
as $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
'@
  $migration = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repoRoot 'supabase/migrations/20261117190539_local_legal_acceptance.sql')
  if ($Production) {
    $migration += [Environment]::NewLine + (Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repoRoot 'supabase/migrations/20261118022243_publish_legal_release.sql'))
  }
  $schema = @('init', 'auth-rls') | ForEach-Object {
    Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repoRoot "supabase/$_.sql")
  }
  $tests = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repoRoot 'supabase/tests/local-legal-acceptance.sql')
  $manifestPath = if ($Production) { 'src/content/legalRelease.production.json' } else { 'src/content/legalRelease.json' }
  $manifest = Get-Content -Raw -LiteralPath (Join-Path $repoRoot $manifestPath) | ConvertFrom-Json
  @($bootstrap, ($schema -join [Environment]::NewLine), $migration, $tests) -join [Environment]::NewLine |
    & docker exec -i $container psql -X -q -U postgres -v ON_ERROR_STOP=1 -v "expected_hash=$($manifest.sha256)" -v "expected_version=$($manifest.version)"
  if ($LASTEXITCODE -ne 0) { throw 'Legal migration or SQL tests failed' }
  & docker exec $container psql -X -q -U postgres -v ON_ERROR_STOP=1 -c "insert into auth.users (id) values ('bc000000-0000-0000-0000-000000000009');"
  if ($LASTEXITCODE -ne 0) { throw 'Cannot create concurrency fixture' }
  $concurrentSql = @"
begin;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"bc000000-0000-0000-0000-000000000009"}', true);
select public.accept_local_legal_terms('$($manifest.version)', '$($manifest.sha256)', 'en');
select pg_sleep(3);
commit;
"@
  foreach ($attempt in 1..4) {
    $jobs += Start-Job -ScriptBlock {
      param($databaseContainer, $sql)
      $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
      $jobOutput = $sql | & docker exec -i $databaseContainer psql -X -q -U postgres -v ON_ERROR_STOP=1 2>&1
      if ($LASTEXITCODE -ne 0) { throw "Concurrent acceptance failed. $jobOutput" }
    } -ArgumentList $container, $concurrentSql
  }
  $jobs | Wait-Job | Out-Null
  $jobs | Receive-Job -ErrorAction Stop
  if ($jobs.State -contains 'Failed') { throw 'Concurrent acceptance job failed' }
  $count = & docker exec $container psql -X -t -A -U postgres -c "select count(*) from public.local_legal_acceptances where user_id = 'bc000000-0000-0000-0000-000000000009';"
  if ($LASTEXITCODE -ne 0 -or $count.Trim() -ne '1') { throw 'Concurrent acceptance created an invalid receipt count' }
  Write-Output 'PASS: legal snapshots, signup trigger, immutable receipts, account isolation, replay, new release, deletion and four concurrent requests'
}
finally {
  foreach ($job in $jobs) {
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -ErrorAction SilentlyContinue
  }
  if ($owned) { & docker rm -fv $container *> $null }
}
