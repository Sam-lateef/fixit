# Compares tmp/sha-fingerprints.input.txt + local debug keystore against mobile/google-services.json
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File mobile/scripts/compare-google-sha.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$inputFile = Join-Path $repoRoot "tmp\sha-fingerprints.input.txt"
$jsonFile = Join-Path $repoRoot "mobile\google-services.json"
$appJsonFile = Join-Path $repoRoot "mobile\app.json"

function Normalize-Hex([string]$raw) {
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
  return ($raw -replace "[^0-9A-Fa-f]", "").ToLower()
}

function Normalize-Sha1([string]$raw) {
  $hex = Normalize-Hex $raw
  if ($null -eq $hex -or $hex.Length -ne 40) { return $null }
  return $hex
}

function Normalize-Sha256([string]$raw) {
  $hex = Normalize-Hex $raw
  if ($null -eq $hex -or $hex.Length -ne 64) { return $null }
  return $hex
}

function Format-Sha1([string]$normalized) {
  if (-not $normalized) { return "" }
  $parts = @()
  for ($i = 0; $i - 40; $i += 2) {
    $parts += $normalized.Substring($i, 2).ToUpper()
  }
  return ($parts -join ":")
}

function Format-Sha256([string]$normalized) {
  if (-not $normalized) { return "" }
  $parts = @()
  for ($i = 0; $i - 64; $i += 2) {
    $parts += $normalized.Substring($i, 2).ToUpper()
  }
  return ($parts -join ":")
}

function Read-InputShas([string]$path) {
  $map = @{}
  if (-not (Test-Path $path)) {
    return $map
  }
  foreach ($line in Get-Content $path -Encoding UTF8) {
    $t = $line.Trim()
    if ($t.Length -eq 0 -or $t.StartsWith("#")) { continue }
    if ($t -match "^([A-Za-z0-9_.]+)\s*=\s*(.+)$") {
      $label = $Matches[1]
      $val = $Matches[2]
      $sha1 = Normalize-Sha1 $val
      if ($sha1) {
        $map[$label] = @{ Kind = "sha1"; Hex = $sha1 }
        continue
      }
      $sha256 = Normalize-Sha256 $val
      if ($sha256) {
        $map[$label] = @{ Kind = "sha256"; Hex = $sha256 }
      }
    } else {
      $sha1 = Normalize-Sha1 $t
      if ($sha1) { $map["LINE_$($map.Count)"] = @{ Kind = "sha1"; Hex = $sha1 } }
    }
  }
  return $map
}

function Read-JsonAndroidClients([string]$path) {
  $json = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
  $rows = @()
  foreach ($client in $json.client) {
    $pkg = $client.client_info.android_client_info.package_name
    foreach ($oauth in @($client.oauth_client)) {
      if ($oauth.client_type -eq 1 -and $oauth.android_info) {
        $rows += [PSCustomObject]@{
          Package = $oauth.android_info.package_name
          Sha1Normalized = Normalize-Sha1 $oauth.android_info.certificate_hash
          AndroidOAuthClientId = $oauth.client_id
        }
      }
    }
  }
  return $rows
}

function Get-LocalGradleSha1() {
  $gradleKs = Join-Path $repoRoot "mobile\android\app\debug.keystore"
  if (-not (Test-Path $gradleKs)) { return $null }
  $ktCandidates = @(
    "keytool",
    "${env:ProgramFiles}\Android\Android Studio\jbr\bin\keytool.exe"
  )
  $kt = $ktCandidates | Where-Object { $_ -eq "keytool" -and (Get-Command keytool -ErrorAction SilentlyContinue) } | Select-Object -First 1
  if (-not $kt) {
    $kt = $ktCandidates | Where-Object { $_ -ne "keytool" -and (Test-Path $_) } | Select-Object -First 1
  }
  if (-not $kt) { return $null }
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $out = & $kt -list -v -keystore $gradleKs -alias androiddebugkey -storepass android -keypass android 2>&1 | Out-String
  } finally {
    $ErrorActionPreference = $prevEap
  }
  if ($out -match "SHA1:\s*([0-9A-F:]+)") {
    return Normalize-Sha1 $Matches[1]
  }
  return $null
}

Write-Host ""
Write-Host "=== FixIt Google SHA / google-services.json check ===" -ForegroundColor Cyan
Write-Host ""

$appJson = Get-Content $appJsonFile -Raw | ConvertFrom-Json
$expoPackage = $appJson.expo.android.package
Write-Host "Expo app.json android.package: $expoPackage"
Write-Host ""

$jsonRows = Read-JsonAndroidClients $jsonFile
Write-Host "--- Android OAuth clients IN google-services.json (type 1 + certificate_hash) ---" -ForegroundColor Yellow
if ($jsonRows.Count -eq 0) {
  Write-Host "  (none - Google Sign-In will fail on native Android until Firebase adds SHA for your package)"
} else {
  foreach ($row in $jsonRows) {
    Write-Host "  package: $($row.Package)"
    Write-Host "  SHA-1:   $(Format-Sha1 $row.Sha1Normalized)"
    Write-Host "  client:  $($row.AndroidOAuthClientId)"
    Write-Host ""
  }
}

$iqInJson = $jsonRows | Where-Object { $_.Package -eq "com.fixitiq.app" }
if (-not $iqInJson) {
  Write-Host "WARN: com.fixitiq.app has NO Android OAuth + SHA in google-services.json." -ForegroundColor Red
  Write-Host "      EAS preview APKs use this package - add EAS SHA-1 in Firebase, re-download JSON." -ForegroundColor Red
  Write-Host ""
}

$inputShas = Read-InputShas $inputFile
$gradleSha = Get-LocalGradleSha1

Write-Host "--- Fingerprints from tmp/sha-fingerprints.input.txt + local keystore ---" -ForegroundColor Yellow
$allChecks = @{}
foreach ($kv in $inputShas.GetEnumerator()) {
  $allChecks[$kv.Key] = $kv.Value
}
if ($gradleSha) {
  $allChecks["LOCAL_KEYTOOL_GRADLE"] = @{ Kind = "sha1"; Hex = $gradleSha }
}

foreach ($kv in $allChecks.GetEnumerator() | Sort-Object Name) {
  $entry = $kv.Value
  if ($entry -is [string]) {
    Write-Host "  [$($kv.Key)] $(Format-Sha1 $entry)"
  } elseif ($entry.Kind -eq "sha256") {
    Write-Host "  [$($kv.Key)] SHA-256 $(Format-Sha256 $entry.Hex) (console only; json stores SHA-1)" -ForegroundColor DarkGray
  } else {
    Write-Host "  [$($kv.Key)] $(Format-Sha1 $entry.Hex)"
  }
}
Write-Host ""

Write-Host "--- Match results (SHA-1 vs google-services.json certificate_hash) ---" -ForegroundColor Yellow
foreach ($kv in $allChecks.GetEnumerator() | Sort-Object Name) {
  $entry = $kv.Value
  if ($entry -is [hashtable] -and $entry.Kind -eq "sha256") {
    Write-Host "  INFO $($kv.Key) SHA-256 registered in Firebase (not stored in google-services.json)" -ForegroundColor DarkGray
    continue
  }
  $sha = if ($entry -is [string]) { $entry } else { $entry.Hex }
  $matched = @($jsonRows | Where-Object { $_.Sha1Normalized -eq $sha })
  if ($matched.Count -gt 0) {
    $pkgs = ($matched | ForEach-Object { $_.Package }) -join ", "
    Write-Host "  OK   $($kv.Key) -> in google-services.json for: $pkgs" -ForegroundColor Green
  } else {
    Write-Host "  MISS $($kv.Key) -> NOT in google-services.json (add in Firebase for correct package)" -ForegroundColor Red
  }
}

if ($expoPackage -and -not ($jsonRows.Package -contains $expoPackage)) {
  Write-Host ""
  Write-Host "  WARN: app.json package '$expoPackage' has no Android OAuth+SHA row in google-services.json." -ForegroundColor Red
}

Write-Host ""
Write-Host "Edit: tmp/sha-fingerprints.input.txt (paste EAS SHA-1, re-run this script)." -ForegroundColor DarkGray
Write-Host "EAS SHA: cd mobile && npx eas-cli credentials -p android" -ForegroundColor DarkGray
Write-Host ""
