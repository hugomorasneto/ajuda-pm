param(
  [string]$EnvFile = '.env.local'
)

. (Join-Path $PSScriptRoot 'supabase-context.ps1')

try {
  [void](Assert-SupabaseProjectContext -EnvFile $EnvFile)

  & supabase functions serve generate-user-story --no-verify-jwt
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
