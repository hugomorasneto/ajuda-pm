param()

$projectToken = $env:SUPABASE_ACCESS_TOKEN_AJUDA_PM
if (-not $projectToken) {
  Write-Error 'A variável SUPABASE_ACCESS_TOKEN_AJUDA_PM não está definida. Defina com: setx SUPABASE_ACCESS_TOKEN_AJUDA_PM "SEU_TOKEN"'
  exit 1
}

$env:SUPABASE_ACCESS_TOKEN = $projectToken

& supabase functions serve generate-user-story --no-verify-jwt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
