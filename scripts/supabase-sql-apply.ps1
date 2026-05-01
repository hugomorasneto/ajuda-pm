param(
  [string]$EnvFile = '.env.local',
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$SqlFile
)

. (Join-Path $PSScriptRoot 'supabase-context.ps1')

function Resolve-SqlFilePath {
  param(
    [string]$RepoRoot,
    [string]$Path
  )

  if ([System.IO.Path]::IsPathRooted($Path)) {
    return $Path
  }

  return Join-Path $RepoRoot $Path
}

try {
  $context = Assert-SupabaseProjectContext -EnvFile $EnvFile -RequireToken
  $sqlFilePath = Resolve-SqlFilePath -RepoRoot $context.RepoRoot -Path $SqlFile

  if (-not (Test-Path -LiteralPath $sqlFilePath)) {
    throw "SQL file not found: $sqlFilePath"
  }

  $query = [System.IO.File]::ReadAllText($sqlFilePath)
  if ([string]::IsNullOrWhiteSpace($query)) {
    throw "SQL file is empty: $sqlFilePath"
  }

  $headers = @{
    Authorization = "Bearer $($context.TokenValue)"
    'Content-Type' = 'application/json'
  }

  $body = @{ query = $query } | ConvertTo-Json -Depth 4
  $endpoint = "https://api.supabase.com/v1/projects/$($context.ProjectRef)/database/query"

  Write-Host "Applying SQL to project $($context.ProjectRef)"
  Write-Host "  File: $sqlFilePath"

  $response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $body -ErrorAction Stop
  if ($null -ne $response) {
    $response | ConvertTo-Json -Depth 10
  }
} catch {
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
    Write-Error $_.ErrorDetails.Message
  } else {
    Write-Error $_.Exception.Message
  }
  exit 1
}
