param([ValidateSet('Protect','Unprotect')][string]$Action)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
try {
  $text = [Console]::In.ReadToEnd()
  if ($Action -eq 'Protect') {
    $plain = [Text.Encoding]::UTF8.GetBytes($text)
    try { [Console]::Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($plain, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser))) }
    finally { [Array]::Clear($plain, 0, $plain.Length) }
  } else {
    $encrypted = [Convert]::FromBase64String($text)
    $plain = [Security.Cryptography.ProtectedData]::Unprotect($encrypted, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    try { [Console]::Write([Text.Encoding]::UTF8.GetString($plain)) }
    finally { [Array]::Clear($plain, 0, $plain.Length) }
  }
} catch { [Console]::Error.WriteLine('Private SMTP checkpoint operation failed.'); exit 1 }
