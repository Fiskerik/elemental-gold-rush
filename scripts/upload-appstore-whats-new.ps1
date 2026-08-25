[CmdletBinding()]
param(
  [string]$Version = "1.1.5",
  [string]$IssuerId,
  [string]$KeyId,
  [string]$PrivateKeyPath,
  [switch]$WhatsNewOnly,
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$uploaderPath = Join-Path $PSScriptRoot "appstore-metadata.mjs"

if (-not $IssuerId) { $IssuerId = Read-Host "App Store Connect issuer ID" }
if (-not $KeyId) { $KeyId = Read-Host "App Store Connect key ID" }
if (-not $PrivateKeyPath) { $PrivateKeyPath = Read-Host "Path to the App Store Connect .p8 key" }

$PrivateKeyPath = $PrivateKeyPath.Trim().Trim('"')
$resolvedPrivateKeyPath = (Resolve-Path -LiteralPath $PrivateKeyPath).Path
if (-not (Test-Path -LiteralPath $resolvedPrivateKeyPath -PathType Leaf)) {
  throw "The App Store Connect private key path must point to a file."
}
if ([IO.Path]::GetExtension($resolvedPrivateKeyPath) -ne ".p8") {
  throw "The private key must be an App Store Connect .p8 file."
}

$node = Get-Command node -ErrorAction Stop
$credentialNames = @("ASC_ISSUER_ID", "ASC_KEY_ID", "ASC_PRIVATE_KEY", "ASC_PRIVATE_KEY_PATH")
$previousCredentials = @{}
foreach ($name in $credentialNames) {
  $previousCredentials[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}

try {
  $env:ASC_ISSUER_ID = $IssuerId.Trim()
  $env:ASC_KEY_ID = $KeyId.Trim()
  Remove-Item -LiteralPath "Env:ASC_PRIVATE_KEY" -ErrorAction SilentlyContinue
  $env:ASC_PRIVATE_KEY_PATH = $resolvedPrivateKeyPath

  Push-Location -LiteralPath $repositoryRoot
  try {
    & $node.Source $uploaderPath validate --version $Version
    if ($LASTEXITCODE -ne 0) { throw "The $Version release notes did not pass validation." }

    # New App Store versions do not inherit Promotional Text. Upload both
    # localized release-text fields by default so a version is never left blank.
    $scopeArgument = if ($WhatsNewOnly) { "--only-whats-new" } else { "--only-release-text" }
    $uploadArguments = @($uploaderPath, "upload", "--version", $Version, $scopeArgument)
    if ($DryRun) {
      $uploadArguments += "--dry-run"
    } elseif (-not $Force) {
      Write-Host ""
      $scopeLabel = if ($WhatsNewOnly) { "What's New field" } else { "Promotional Text and What's New fields" }
      Write-Host "This will PATCH only the $scopeLabel for all configured locales on iOS $Version."
      $confirmation = Read-Host "Type $Version to confirm"
      if ($confirmation -ne $Version) {
        Write-Host "Upload cancelled."
        return
      }
    }

    & $node.Source @uploadArguments
    if ($LASTEXITCODE -ne 0) { throw "App Store Connect upload failed." }
  } finally {
    Pop-Location
  }
} finally {
  foreach ($name in $credentialNames) {
    $previousValue = $previousCredentials[$name]
    if ($null -eq $previousValue) {
      Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
    } else {
      Set-Item -LiteralPath "Env:$name" -Value $previousValue
    }
  }
}
