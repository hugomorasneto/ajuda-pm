Set-StrictMode -Version Latest

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Resolve-ContextEnvFilePath {
  param(
    [string]$RepoRoot,
    [string]$EnvFile
  )

  if ([System.IO.Path]::IsPathRooted($EnvFile)) {
    return $EnvFile
  }

  return Join-Path $RepoRoot $EnvFile
}

function Read-KeyValueEnvFile {
  param([string]$Path)

  $values = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $values
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
      continue
    }

    $separatorIndex = $trimmed.IndexOf('=')
    if ($separatorIndex -lt 1) {
      continue
    }

    $key = $trimmed.Substring(0, $separatorIndex).Trim()
    $value = $trimmed.Substring($separatorIndex + 1).Trim()

    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $values[$key] = $value
  }

  return $values
}

function Get-ContextConfigValue {
  param(
    [string]$Name,
    [hashtable]$FileValues
  )

  $processValue = [Environment]::GetEnvironmentVariable($Name)
  if (-not [string]::IsNullOrWhiteSpace($processValue)) {
    return $processValue.Trim()
  }

  if ($FileValues.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace([string]$FileValues[$Name])) {
    return [string]$FileValues[$Name]
  }

  return $null
}

function Get-ProjectRefFromUrl {
  param([string]$SupabaseUrl)

  if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) {
    return $null
  }

  try {
    $uri = [Uri]$SupabaseUrl
  } catch {
    return $null
  }

  if ($uri.Host -match '^([a-z0-9-]+)\.supabase\.co$') {
    return $Matches[1]
  }

  return $null
}

function Get-ConfigTomlProjectRef {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*project_id\s*=\s*"([^"]+)"') {
      return $Matches[1]
    }
  }

  return $null
}

function Resolve-SupabaseProjectContext {
  param(
    [string]$EnvFile = '.env.local',
    [switch]$AllowDerivedProjectRef
  )

  $repoRoot = Get-RepoRoot
  $envFilePath = Resolve-ContextEnvFilePath -RepoRoot $repoRoot -EnvFile $EnvFile
  $fileValues = Read-KeyValueEnvFile -Path $envFilePath

  $projectRef = Get-ContextConfigValue -Name 'SUPABASE_PROJECT_REF' -FileValues $fileValues
  $supabaseUrl = Get-ContextConfigValue -Name 'VITE_SUPABASE_URL' -FileValues $fileValues
  $anonKey = Get-ContextConfigValue -Name 'VITE_SUPABASE_ANON_KEY' -FileValues $fileValues
  $tokenEnvName = Get-ContextConfigValue -Name 'SUPABASE_ACCESS_TOKEN_ENV' -FileValues $fileValues

  $warnings = @()

  if (-not $projectRef -and $AllowDerivedProjectRef) {
    $derivedProjectRef = Get-ProjectRefFromUrl -SupabaseUrl $supabaseUrl
    if ($derivedProjectRef) {
      $projectRef = $derivedProjectRef
      $warnings += 'SUPABASE_PROJECT_REF is not set explicitly. Using the project ref derived from VITE_SUPABASE_URL.'
    }
  }

  $tokenValue = $null
  if (-not [string]::IsNullOrWhiteSpace($tokenEnvName)) {
    $tokenValue = [Environment]::GetEnvironmentVariable($tokenEnvName)
  }

  $configTomlPath = Join-Path $repoRoot 'supabase/config.toml'
  $configProjectRef = Get-ConfigTomlProjectRef -Path $configTomlPath

  return [PSCustomObject]@{
    RepoRoot         = $repoRoot
    EnvFile          = $EnvFile
    EnvFilePath      = $envFilePath
    ProjectRef       = $projectRef
    SupabaseUrl      = $supabaseUrl
    AnonKey          = $anonKey
    TokenEnvName     = $tokenEnvName
    TokenValue       = $tokenValue
    ConfigTomlPath   = $configTomlPath
    ConfigProjectRef = $configProjectRef
    Warnings         = $warnings
  }
}

function Test-SupabaseProjectContext {
  param(
    [psobject]$Context,
    [switch]$RequireToken
  )

  $errors = @()
  $warnings = @($Context.Warnings)

  if ([string]::IsNullOrWhiteSpace($Context.ProjectRef)) {
    $errors += "Missing SUPABASE_PROJECT_REF. Define it in $($Context.EnvFilePath) or in the current shell."
  }

  if ([string]::IsNullOrWhiteSpace($Context.SupabaseUrl)) {
    $errors += "Missing VITE_SUPABASE_URL. Define it in $($Context.EnvFilePath) or in the current shell."
  }

  if ([string]::IsNullOrWhiteSpace($Context.AnonKey)) {
    $errors += "Missing VITE_SUPABASE_ANON_KEY. Define it in $($Context.EnvFilePath) or in the current shell."
  }

  if ([string]::IsNullOrWhiteSpace($Context.TokenEnvName)) {
    $errors += 'Missing SUPABASE_ACCESS_TOKEN_ENV. Define the variable name that stores the correct account token.'
  }

  $supabaseUri = $null
  if (-not [string]::IsNullOrWhiteSpace($Context.SupabaseUrl)) {
    try {
      $supabaseUri = [Uri]$Context.SupabaseUrl
    } catch {
      $errors += 'VITE_SUPABASE_URL is not a valid absolute URL.'
    }
  }

  if ($supabaseUri) {
    if (-not $supabaseUri.IsAbsoluteUri) {
      $errors += 'VITE_SUPABASE_URL must be an absolute URL.'
    }

    if ($supabaseUri.Host -match '\.supabase\.co$') {
      if (
        -not [string]::IsNullOrWhiteSpace($Context.ProjectRef) -and
        $supabaseUri.Host -ne "$($Context.ProjectRef).supabase.co"
      ) {
        $errors += 'VITE_SUPABASE_URL host does not match SUPABASE_PROJECT_REF.'
      }
    } else {
      $warnings += 'VITE_SUPABASE_URL does not use the default *.supabase.co host. Host validation was skipped.'
    }
  }

  if ([string]::IsNullOrWhiteSpace($Context.ConfigProjectRef)) {
    $errors += "Could not read project_id from $($Context.ConfigTomlPath)."
  } elseif (
    -not [string]::IsNullOrWhiteSpace($Context.ProjectRef) -and
    $Context.ConfigProjectRef -ne $Context.ProjectRef
  ) {
    $errors += 'supabase/config.toml project_id does not match SUPABASE_PROJECT_REF.'
  }

  if ([string]::IsNullOrWhiteSpace($Context.TokenValue)) {
    $message = "The access token environment variable '$($Context.TokenEnvName)' is not available in the current shell."
    if ($RequireToken) {
      $errors += $message
    } else {
      $warnings += $message
    }
  }

  return [PSCustomObject]@{
    IsValid  = ($errors.Count -eq 0)
    Errors   = $errors
    Warnings = $warnings
    Context  = $Context
  }
}

function Assert-SupabaseProjectContext {
  param(
    [string]$EnvFile = '.env.local',
    [switch]$RequireToken
  )

  $context = Resolve-SupabaseProjectContext -EnvFile $EnvFile
  $result = Test-SupabaseProjectContext -Context $context -RequireToken:$RequireToken

  foreach ($warning in $result.Warnings) {
    Write-Warning $warning
  }

  if (-not $result.IsValid) {
    $message = ($result.Errors | ForEach-Object { "- $_" }) -join [Environment]::NewLine
    throw "Supabase project context is invalid:`n$message"
  }

  return $result.Context
}

function Use-SupabaseAccessToken {
  param([psobject]$Context)

  if ([string]::IsNullOrWhiteSpace($Context.TokenValue)) {
    throw "Cannot export SUPABASE_ACCESS_TOKEN because '$($Context.TokenEnvName)' is empty."
  }

  $env:SUPABASE_ACCESS_TOKEN = $Context.TokenValue
}
