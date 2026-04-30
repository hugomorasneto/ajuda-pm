param(
  [string]$EnvFile = '.env.local',
  [switch]$SkipTokenCheck
)

. (Join-Path $PSScriptRoot 'supabase-context.ps1')

try {
  $context = Resolve-SupabaseProjectContext -EnvFile $EnvFile
  $result = Test-SupabaseProjectContext -Context $context -RequireToken:(-not $SkipTokenCheck)

  Write-Host 'Supabase project context'
  Write-Host "  Repo root:          $($context.RepoRoot)"
  Write-Host "  Env file:           $($context.EnvFilePath)"
  Write-Host "  Project ref:        $($context.ProjectRef)"
  Write-Host "  Supabase URL:       $($context.SupabaseUrl)"
  Write-Host "  Token env variable: $($context.TokenEnvName)"
  Write-Host "  config.toml ref:    $($context.ConfigProjectRef)"

  foreach ($warning in $result.Warnings) {
    Write-Warning $warning
  }

  if (-not $result.IsValid) {
    foreach ($errorMessage in $result.Errors) {
      Write-Error $errorMessage
    }
    exit 1
  }

  Write-Host 'Supabase project context OK.'
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
