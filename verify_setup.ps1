# Read-only health check for the Career Nova setup. Changes nothing, deletes
# nothing; it only reports what is present and what is missing.
#
#   powershell -ExecutionPolicy Bypass -File verify_setup.ps1
#   powershell -ExecutionPolicy Bypass -File verify_setup.ps1 -Build
#
# -Build additionally runs the production build to confirm the frontend compiles.

[CmdletBinding()]
param(
    [switch]$Build
)

$root = $PSScriptRoot
$apiPort = 8000
$webPort = 80
$brandHost = 'careernova'
$failures = 0

function Test-Item($label, $ok, $detail) {
    if ($ok) {
        Write-Host ('  [ ok ] ' + $label.PadRight(28) + $detail) -ForegroundColor Green
    }
    else {
        Write-Host ('  [fail] ' + $label.PadRight(28) + $detail) -ForegroundColor Red
        $script:failures++
    }
}

function Test-Note($label, $detail) {
    Write-Host ('  [note] ' + $label.PadRight(28) + $detail) -ForegroundColor DarkGray
}

$nodeDir = 'C:\Program Files\nodejs'
if ((Test-Path $nodeDir) -and ($env:Path -notlike "*$nodeDir*")) {
    $env:Path = "$nodeDir;$env:Path"
}

Write-Host ''
Write-Host 'Career Nova setup check' -ForegroundColor Cyan
Write-Host '-----------------------' -ForegroundColor Cyan

# --- Toolchain ---------------------------------------------------------------

$python = Get-Command python -ErrorAction SilentlyContinue
Test-Item 'Python on PATH' ([bool]$python) $(if ($python) { (& python --version) } else { 'not found' })

if ($python) {
    & python -c 'import fastapi, uvicorn, sklearn, joblib, pandas, numpy' 2>$null
    Test-Item 'Backend packages' ($LASTEXITCODE -eq 0) `
        $(if ($LASTEXITCODE -eq 0) { 'fastapi, uvicorn, scikit-learn, pandas' } else { 'run: python -m pip install -r backend\requirements.txt' })
}

$node = Get-Command node -ErrorAction SilentlyContinue
Test-Item 'Node.js on PATH' ([bool]$node) $(if ($node) { (& node --version) } else { 'winget install OpenJS.NodeJS.LTS' })
Test-Item 'Frontend packages' (Test-Path (Join-Path $root 'frontend\node_modules')) 'frontend\node_modules'

# --- Data and model ----------------------------------------------------------

$artifact = Join-Path $root 'backend\artifacts\model.joblib'
Test-Item 'Model artifact' (Test-Path $artifact) `
    $(if (Test-Path $artifact) { "$([math]::Round((Get-Item $artifact).Length / 1MB, 1)) MB, trained $((Get-Item $artifact).LastWriteTime)" } else { 'run: python backend\train.py' })

$dataDir = Join-Path $root 'backend\data'
foreach ($file in 'users.json', 'saved_paths.json', 'sessions.json', 'avatars.json') {
    $path = Join-Path $dataDir $file
    if (Test-Path $path) {
        $json = Get-Content $path -Raw | ConvertFrom-Json
        # Saved paths are a list; accounts, sessions and avatars are keyed maps.
        $count = if ($json -is [array]) { $json.Count }
        else { @($json.PSObject.Properties).Count }
        Test-Note $file "$count entr$(if ($count -eq 1) { 'y' } else { 'ies' })"
    }
    else {
        Test-Note $file 'not created yet (written on first use)'
    }
}

# --- Hostname ----------------------------------------------------------------

$hostsFile = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$pattern = '^\s*127\.0\.0\.1\s+' + [regex]::Escape($brandHost) + '\s*$'
$hasEntry = [bool](@(Get-Content -Path $hostsFile -ErrorAction SilentlyContinue) -match $pattern)
Test-Item 'Hosts entry' $hasEntry `
    $(if ($hasEntry) { "127.0.0.1 $brandHost" } else { 'run: powershell -ExecutionPolicy Bypass -File setup_hostname.ps1' })

try {
    $resolved = [System.Net.Dns]::GetHostAddresses($brandHost) | Select-Object -First 1
    Test-Item 'Hostname resolves' ($resolved.IPAddressToString -eq '127.0.0.1') "$brandHost -> $resolved"
}
catch {
    Test-Item 'Hostname resolves' $false "$brandHost does not resolve"
}

# --- Ports -------------------------------------------------------------------

function Show-Port([int]$port, [string]$label) {
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $connection) {
        Test-Note "Port $port ($label)" 'free'
        return
    }
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue
    $commandLine = [string]$owner.CommandLine
    $mine = ($commandLine -like '*uvicorn*backend.app.main*') -or ($commandLine -like '*vite*')
    Test-Note "Port $port ($label)" "$($owner.Name) PID $($owner.ProcessId)$(if ($mine) { ' - Career Nova' } else { ' - NOT Career Nova' })"
}

Show-Port $apiPort 'API'
Show-Port $webPort 'web app'

# --- Live services -----------------------------------------------------------

try {
    $health = Invoke-RestMethod "http://127.0.0.1:$apiPort/api/health" -TimeoutSec 3
    Test-Item 'API responding' ($health.status -eq 'ok') "status=$($health.status), careers=$($health.careers)"
}
catch {
    Test-Note 'API responding' 'not running (start.ps1 will start it)'
}

try {
    $page = Invoke-WebRequest "http://$brandHost/" -TimeoutSec 3 -UseBasicParsing
    Test-Item 'Web app responding' ($page.StatusCode -eq 200) "http://$brandHost returned $($page.StatusCode)"

    $proxied = Invoke-RestMethod "http://$brandHost/api/health" -TimeoutSec 3
    Test-Item 'Frontend -> API proxy' ($proxied.status -eq 'ok') "http://$brandHost/api/health -> $($proxied.status)"
}
catch {
    Test-Note 'Web app responding' 'not running (start.ps1 will start it)'
}

# --- Optional build ----------------------------------------------------------

if ($Build) {
    Write-Host ''
    Write-Host '  Building the frontend...' -ForegroundColor DarkGray
    Push-Location (Join-Path $root 'frontend')
    try {
        & npm run build
        Test-Item 'Production build' ($LASTEXITCODE -eq 0) 'npm run build'
    }
    finally { Pop-Location }
}

Write-Host ''
if ($failures -eq 0) {
    Write-Host '  Everything checks out.' -ForegroundColor Green
}
else {
    Write-Host "  $failures check(s) need attention." -ForegroundColor Yellow
}
Write-Host ''
exit $failures
