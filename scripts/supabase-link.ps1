param(
  [string]$EnvFile = '.env.local'
)

. (Join-Path $PSScriptRoot 'supabase-context.ps1')

try {
  $context = Assert-SupabaseProjectContext -EnvFile $EnvFile -RequireToken
  Use-SupabaseAccessToken -Context $context

  & supabase link --project-ref $context.ProjectRef
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
