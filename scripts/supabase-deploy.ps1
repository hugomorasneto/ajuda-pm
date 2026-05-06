param(
  [string]$EnvFile = '.env.local',
  [string[]]$Functions = @('generate-user-story', 'contact-message')
)

. (Join-Path $PSScriptRoot 'supabase-context.ps1')

try {
  $context = Assert-SupabaseProjectContext -EnvFile $EnvFile -RequireToken
  Use-SupabaseAccessToken -Context $context

  foreach ($functionName in $Functions) {
    & supabase functions deploy $functionName --project-ref $context.ProjectRef
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
