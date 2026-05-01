param(
  [string]$EnvFile = '.env.local',
  [switch]$SkipJwtVerification
)

. (Join-Path $PSScriptRoot 'supabase-context.ps1')

try {
  [void](Assert-SupabaseProjectContext -EnvFile $EnvFile)

  $command = @('functions', 'serve', 'generate-user-story')
  if ($SkipJwtVerification) {
    $command += '--no-verify-jwt'
  }

  & supabase @command
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
