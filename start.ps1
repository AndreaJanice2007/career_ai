# Starts Career Nova: checks the environment, frees stale ports, brings up the
# API, waits until it is healthy, then runs the web app.
#
#   powershell -ExecutionPolicy Bypass -File start.ps1
#
# or double-click start.cmd. Everything here is idempotent and safe to re-run;
# no accounts, saved paths, models or configuration are ever removed.

[CmdletBinding()]
param(
    # Skips the hosts-file check, which is the only step that can prompt for
    # administrator rights.
    [switch]$SkipHostname
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$apiPort = 8000
$webPort = 80
$brandHost = 'careernova'
$logDir = Join-Path $root 'logs'

function Write-Step($text) {
    Write-Host "  $text" -ForegroundColor DarkGray
}

function Write-Ok($text) {
    Write-Host "  $text" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Career Nova' -ForegroundColor Cyan
Write-Host '-----------' -ForegroundColor Cyan

# --- Toolchain ---------------------------------------------------------------

$nodeDir = 'C:\Program Files\nodejs'
if ((Test-Path $nodeDir) -and ($env:Path -notlike "*$nodeDir*")) {
    $env:Path = "$nodeDir;$env:Path"
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw 'Python was not found on PATH. Install Python 3.10+ and reopen the terminal.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js was not found on PATH. Install it with: winget install OpenJS.NodeJS.LTS"
}

# --- Python packages ---------------------------------------------------------

& python -c 'import fastapi, uvicorn, sklearn, joblib, pandas, numpy' 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Step 'Installing backend packages (first run only)...'
    & python -m pip install --disable-pip-version-check -q -r (Join-Path $root 'backend\requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Installing backend packages failed.' }
}
Write-Ok 'Backend packages ready'

# --- Frontend packages -------------------------------------------------------

if (-not (Test-Path (Join-Path $root 'frontend\node_modules'))) {
    Write-Step 'Installing frontend packages (first run only)...'
    Push-Location (Join-Path $root 'frontend')
    try { & npm install } finally { Pop-Location }
}
Write-Ok 'Frontend packages ready'

# --- Model artifact ----------------------------------------------------------

$artifact = Join-Path $root 'backend\artifacts\model.joblib'
if (-not (Test-Path $artifact)) {
    Write-Step 'No trained model found. Training now (about a minute)...'
    & python (Join-Path $root 'backend\train.py')
    if (-not (Test-Path $artifact)) { throw 'Training did not produce backend\artifacts\model.joblib.' }
}
Write-Ok "Model artifact ready ($([math]::Round((Get-Item $artifact).Length / 1MB, 1)) MB)"

# --- Stale production build --------------------------------------------------

# The API also serves frontend\dist when it exists. An out-of-date build there
# would hand out an old copy of the app on port 8000, so drop it and let
# `npm run build` recreate it when a production bundle is actually wanted.
$dist = Join-Path $root 'frontend\dist'
if (Test-Path $dist) {
    $builtAt = (Get-Item $dist).LastWriteTime
    $newestSource = Get-ChildItem (Join-Path $root 'frontend\src') -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if ($newestSource -and $newestSource.LastWriteTime -gt $builtAt) {
        Write-Step 'Removing an out-of-date production build (frontend\dist)'
        Remove-Item $dist -Recurse -Force
    }
}

# --- Hostname ----------------------------------------------------------------

if (-not $SkipHostname) {
    $hostsFile = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
    $pattern = '^\s*127\.0\.0\.1\s+' + [regex]::Escape($brandHost) + '\s*$'
    $entry = @(Get-Content -Path $hostsFile -ErrorAction SilentlyContinue) -match $pattern

    if (-not $entry) {
        Write-Step "Adding the '$brandHost' hosts entry (needs administrator once)..."
        try {
            & (Join-Path $root 'setup_hostname.ps1')
            $entry = $true
        }
        catch {
            # Declining the prompt should not stop the app: it stays reachable
            # at http://127.0.0.1, just without the branded name.
            Write-Host "  Could not add the hosts entry: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    if ($entry) {
        Write-Ok "http://$brandHost resolves to this machine"
    }
    else {
        Write-Host "  http://$brandHost is unavailable; use http://127.0.0.1 for now." -ForegroundColor Yellow
    }
}

# --- Ports -------------------------------------------------------------------

function Get-PortOwner([int]$port) {
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $connection) { return $null }
    Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue
}

function Clear-Port([int]$port, [string]$label) {
    $owner = Get-PortOwner $port
    if (-not $owner) { return }

    $commandLine = [string]$owner.CommandLine
    $isOurs = ($commandLine -like '*uvicorn*backend.app.main*') -or ($commandLine -like '*vite*')

    if ($isOurs) {
        Write-Step "Stopping a leftover $label on port $port (PID $($owner.ProcessId))"
        Stop-Process -Id $owner.ProcessId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 700
        return
    }

    if ($owner.Name -eq 'System') {
        throw "Port $port is held by Windows itself (http.sys), usually IIS or the Web Deployment service. Free it from an elevated prompt with 'net stop http', or change the port in start.ps1 and frontend/vite.config.js."
    }

    throw "Port $port is in use by $($owner.Name) (PID $($owner.ProcessId)). Close it and run this script again."
}

Clear-Port $apiPort 'API'
Clear-Port $webPort 'web app'
Write-Ok "Ports $apiPort and $webPort are free"

# --- API ---------------------------------------------------------------------

New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$outLog = Join-Path $logDir 'api.out.log'
$errLog = Join-Path $logDir 'api.err.log'

$api = Start-Process -PassThru -FilePath 'python' -WindowStyle Hidden `
    -ArgumentList '-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', "$apiPort" `
    -WorkingDirectory $root `
    -RedirectStandardOutput $outLog -RedirectStandardError $errLog

try {
    Write-Step 'Waiting for the API to load the model...'
    $health = $null
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        if ($api.HasExited) { break }
        try {
            $health = Invoke-RestMethod "http://127.0.0.1:$apiPort/api/health" -TimeoutSec 3
            if ($health.status -eq 'ok') { break }
        }
        catch {
            # Not listening yet; keep polling until the deadline.
        }
        Start-Sleep -Milliseconds 700
    }

    if (-not $health -or $health.status -ne 'ok') {
        Write-Host 'The API did not come up. Last lines of logs\api.err.log:' -ForegroundColor Red
        Get-Content $errLog -Tail 20 -ErrorAction SilentlyContinue |
            ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        throw 'API startup failed.'
    }

    Write-Ok "API healthy on http://127.0.0.1:$apiPort ($($health.careers) careers loaded)"

    $addresses = @(
        Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -ne '127.0.0.1' -and
                $_.PrefixOrigin -ne 'WellKnown' -and
                $_.IPAddress -notlike '169.254.*'
            } |
            Select-Object -ExpandProperty IPAddress
    )

    Write-Host ''
    Write-Host "  Open:            http://$brandHost" -ForegroundColor Cyan
    foreach ($address in $addresses) {
        Write-Host "  Phone / other PC: http://$address" -ForegroundColor DarkCyan
    }
    Write-Host '  Press Ctrl+C to stop both servers.' -ForegroundColor DarkGray
    Write-Host ''

    Push-Location (Join-Path $root 'frontend')
    try { & npm run dev } finally { Pop-Location }
}
finally {
    if ($api -and -not $api.HasExited) {
        Write-Host 'Stopping the API...' -ForegroundColor DarkGray
        Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue
    }
}
