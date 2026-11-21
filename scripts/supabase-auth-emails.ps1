param(
  [ValidateSet('Plan','Apply','Verify','Rollback')][string]$Action = 'Plan',
  [string]$EnvFile = '.env.local',
  [string]$Checkpoint
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'supabase-context.ps1')
$context = Assert-SupabaseProjectContext -EnvFile $EnvFile -RequireToken
$headers = @{ Authorization = "Bearer $($context.TokenValue)" }
$endpoint = "https://api.supabase.com/v1/projects/$($context.ProjectRef)/config/auth"
$json = & node (Join-Path $PSScriptRoot 'auth-email-templates.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Cannot generate validated email templates' }
$candidate = ($json -join "`n") | ConvertFrom-Json
$keys = @($candidate.PSObject.Properties.Name | Sort-Object)
function Get-Hash($Value) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 40 -Compress))
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() }
  finally { $sha.Dispose() }
}
function Select-Fields($Config) {
  $selected = [ordered]@{}
  foreach ($key in $keys) {
    $property = $Config.PSObject.Properties[$key]
    if ($null -eq $property) { throw "Missing template setting: $key" }
    $selected[$key] = $property.Value
  }
  return $selected
}
function Protected-Settings($Config) {
  $selected = [ordered]@{}
  foreach ($property in ($Config.PSObject.Properties | Sort-Object Name)) {
    if ($property.Name -match '^(smtp_|site_url$|uri_allow_list$|hook_|rate_limit_|security_|disable_signup$|external_email_enabled$|mailer_autoconfirm$|mailer_secure_email_change_enabled$|mailer_notifications_)') {
      $selected[$property.Name] = $property.Value
    }
  }
  return Get-Hash $selected
}
function Update-Templates($Patch) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($Patch | ConvertTo-Json -Depth 20))
  try { Invoke-RestMethod $endpoint -Method Patch -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $bytes | Out-Null }
  catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'network error' }
    throw "Auth template update failed ($status). Check project scope and auth_config_write permission. No SMTP or redirect setting was submitted."
  }
}
$current = Invoke-RestMethod $endpoint -Headers $headers
$protectedHash = Protected-Settings $current
$candidateHash = Get-Hash (Select-Fields $candidate)
if ($Action -eq 'Apply') {
  if (-not $Checkpoint -or -not [IO.Path]::IsPathRooted($Checkpoint)) { throw 'Apply requires an absolute private checkpoint path outside the repository' }
  $fullPath = [IO.Path]::GetFullPath($Checkpoint)
  $repo = (Get-RepoRoot).TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
  if ($fullPath.StartsWith($repo, [StringComparison]::OrdinalIgnoreCase)) { throw 'Checkpoint must stay outside the repository' }
  $saved = [ordered]@{ project_ref=$context.ProjectRef; captured_at=[DateTime]::UtcNow.ToString('o'); candidate_sha256=$candidateHash; previous=(Select-Fields $current) }
  $bytes = [Text.Encoding]::UTF8.GetBytes(($saved | ConvertTo-Json -Depth 20))
  $stream = [IO.File]::Open($fullPath, [IO.FileMode]::CreateNew)
  try { $stream.Write($bytes,0,$bytes.Length) } finally { $stream.Dispose() }
  Update-Templates $candidate
} elseif ($Action -eq 'Rollback') {
  if (-not $Checkpoint) { throw 'Rollback requires the checkpoint from the application' }
  $saved = Get-Content -Raw -Encoding UTF8 -LiteralPath $Checkpoint | ConvertFrom-Json
  if ($saved.project_ref -ne $context.ProjectRef) { throw 'Checkpoint belongs to another project' }
  if ((Get-Hash (Select-Fields $current)) -ne $saved.candidate_sha256) { throw 'Templates changed since application; review before rollback' }
  if (@($saved.previous.PSObject.Properties).Count -ne $keys.Count) { throw 'Unexpected checkpoint fields' }
  $previous = Select-Fields $saved.previous
  Update-Templates $previous
  $candidateHash = Get-Hash $previous
} elseif ($Action -eq 'Plan') {
  [pscustomobject]@{ project_ref=$context.ProjectRef; action='read-only plan'; fields=$keys.Count; candidate_sha256=$candidateHash; already_applied=((Get-Hash (Select-Fields $current)) -eq $candidateHash); custom_smtp_configured=[bool]$current.smtp_host } | ConvertTo-Json
  exit 0
}
$after = Invoke-RestMethod $endpoint -Headers $headers
if ((Get-Hash (Select-Fields $after)) -ne $candidateHash) { throw 'Email templates do not match the validated candidate; checkpoint is available for recovery' }
if ((Protected-Settings $after) -ne $protectedHash) { throw 'A protected Auth setting changed concurrently; inspect before proceeding' }
[pscustomobject]@{ project_ref=$context.ProjectRef; action=$Action; fields=$keys.Count; sha256=$candidateHash; protected_settings_preserved=$true } | ConvertTo-Json
