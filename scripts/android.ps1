param([ValidateSet('build','bundle','check')][string]$Action='build')
$ErrorActionPreference='Stop'
$projectPath=Join-Path $PSScriptRoot '..\mobile\android'
$projectPath=(Resolve-Path -LiteralPath $projectPath).Path
if(-not $env:JAVA_HOME){$javaPath='C:\Program Files\Android\Android Studio\jbr';if(Test-Path -LiteralPath (Join-Path $javaPath 'bin\java.exe')){$env:JAVA_HOME=$javaPath}}
if(-not $env:ANDROID_HOME){$sdkPath=Join-Path $env:LOCALAPPDATA 'Android\Sdk';if(Test-Path -LiteralPath $sdkPath){$env:ANDROID_HOME=$sdkPath}}
if(-not $env:JAVA_HOME -or -not $env:ANDROID_HOME){throw 'Install Android Studio, its JDK and Android SDK, then set JAVA_HOME and ANDROID_HOME.'}
[string[]]$gradleTasks=switch($Action){'build'{@('assembleDebug')};'bundle'{@('bundleRelease')};'check'{@('lintDebug','testDebugUnitTest')}}
Push-Location -LiteralPath $projectPath
try { & .\gradlew.bat @gradleTasks '--console=plain';if($LASTEXITCODE -ne 0){throw "Android build failed ($LASTEXITCODE)."} }
finally {Pop-Location}
if($Action -eq 'build'){
 $artifactPath=Join-Path $PSScriptRoot '..\artifacts\android'
 New-Item -ItemType Directory -Force -Path $artifactPath | Out-Null
 Copy-Item -LiteralPath (Join-Path $projectPath 'app\build\outputs\apk\debug\app-debug.apk') -Destination (Join-Path $artifactPath 'membership-management-debug.apk')
 Write-Output "APK: $artifactPath\membership-management-debug.apk"
}

