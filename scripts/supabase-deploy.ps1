param(
  [string]$EnvFile = '.env.local',
  [string[]]$Functions = @('generate-user-story', 'analyze-project', 'contact-message', 'planning-poker-invite')
)

. (Join-Path $PSScriptRoot 'supabase-context.ps1')

try {
  $context = Assert-SupabaseProjectContext -EnvFile $EnvFile -RequireToken
  Use-SupabaseAccessToken -Context $context

  foreach ($functionName in $Functions) {
    $command = @('functions', 'deploy', $functionName, '--project-ref', $context.ProjectRef)
    if ($functionName -eq 'contact-message') {
      $command += '--no-verify-jwt'
    }

    & supabase @command
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
