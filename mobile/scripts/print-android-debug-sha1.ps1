# Prints SHA-1 / SHA-256 for the keystore that **actually signs** local debug APKs.
#
# Expo / React Native Gradle uses `android/app/debug.keystore` first. That is what must be
# registered in Firebase — NOT only `%USERPROFILE%\.android\debug.keystore` (they often differ).
# See: https://react-native-google-signin.github.io/docs/setting-up/get-config-file

$ErrorActionPreference = "Stop"
$ktCandidates = @(
  "keytool",
  "${env:ProgramFiles}\Android\Android Studio\jbr\bin\keytool.exe"
)
$kt = $ktCandidates | Where-Object { $_ -eq "keytool" -and (Get-Command keytool -ErrorAction SilentlyContinue) } | Select-Object -First 1
if (-not $kt) {
  $kt = $ktCandidates | Where-Object { $_ -ne "keytool" -and (Test-Path $_) } | Select-Object -First 1
}
if (-not $kt) {
  Write-Error "keytool not found. Install Android Studio or add JDK bin to PATH."
}

$mobileRoot = Split-Path $PSScriptRoot -Parent
$gradleKs = Join-Path $mobileRoot "android\app\debug.keystore"
$userKs = Join-Path $env:USERPROFILE ".android\debug.keystore"

if (Test-Path $gradleKs) {
  Write-Host "Using Gradle signing keystore (register THIS SHA in Firebase):"
  Write-Host "  $gradleKs"
  Write-Host ""
  & $kt -list -v -keystore $gradleKs -alias androiddebugkey -storepass android -keypass android
  exit 0
}

Write-Host "No android\app\debug.keystore yet (run npx expo prebuild). Using user debug keystore:"
Write-Host "  $userKs"
Write-Host ""

$dir = Split-Path $userKs -Parent
New-Item -ItemType Directory -Force -Path $dir | Out-Null
if (-not (Test-Path $userKs)) {
  & $kt -genkeypair -v -keystore $userKs -storepass android -alias androiddebugkey -keypass android `
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
}

& $kt -list -v -keystore $userKs -alias androiddebugkey -storepass android -keypass android
