param(
  [ValidateSet('Plan','Apply','Verify','Rollback')][string]$Action = 'Plan',
  [string]$EnvFile = '.env.local',
  [string]$CredentialsModule,
  [string]$Checkpoint,
  [ValidateRange(1,30)][int]$HourlyLimit = 10
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'supabase-context.ps1')
& (Join-Path $PSScriptRoot 'supabase-doctor.ps1') -EnvFile $EnvFile
$context = Assert-SupabaseProjectContext -EnvFile $EnvFile -RequireToken
$arguments = @((Join-Path $PSScriptRoot 'supabase-auth-smtp.mjs'), '--action', $Action, '--project-ref', $context.ProjectRef, '--token-env', $context.TokenEnvName, '--hourly-limit', "$HourlyLimit")
if ($CredentialsModule) { $arguments += @('--credentials-module', $CredentialsModule) }
if ($Checkpoint) { $arguments += @('--checkpoint', $Checkpoint) }
& node @arguments
exit $LASTEXITCODE
