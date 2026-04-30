param(
  [string]$EnvFile = '.env.local',

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$SupabaseArgs
)

. (Join-Path $PSScriptRoot 'supabase-context.ps1')

try {
  if (-not $SupabaseArgs -or $SupabaseArgs.Count -eq 0) {
    throw 'Pass the secrets as additional arguments, for example: npm run supabase:secrets:set -- GEMINI_API_KEY=...'
  }

  $context = Assert-SupabaseProjectContext -EnvFile $EnvFile -RequireToken
  Use-SupabaseAccessToken -Context $context

  & supabase secrets set --project-ref $context.ProjectRef @SupabaseArgs
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
