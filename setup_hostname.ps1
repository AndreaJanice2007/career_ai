# Maps http://careernova to this machine by adding a hosts file entry.
# Requires administrator rights; run_dev.ps1 calls this automatically when the
# entry is missing.
#
#   powershell -ExecutionPolicy Bypass -File setup_hostname.ps1

$ErrorActionPreference = 'Stop'

$hostname = 'careernova'
$hostsFile = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$pattern = '^\s*127\.0\.0\.1\s+' + [regex]::Escape($hostname) + '\s*$'

$isAdmin = ([Security.Principal.WindowsPrincipal] `
        [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host 'Administrator rights are required to edit the hosts file.' -ForegroundColor Yellow
    Write-Host 'A UAC prompt will appear...' -ForegroundColor Yellow
    $arguments = @(
        '-ExecutionPolicy', 'Bypass',
        '-NoProfile',
        '-File', "`"$PSCommandPath`""
    )
    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments `
        -Verb RunAs -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "Elevated setup failed with exit code $($process.ExitCode)."
    }
    exit 0
}

# The elevated pass runs in its own window, so failures are logged to disk
# where the caller can read them.
$log = Join-Path $env:TEMP 'careernova-hostname-setup.log'

try {
    $existing = @(Get-Content -Path $hostsFile -ErrorAction SilentlyContinue)

    if ($existing -match $pattern) {
        "hosts entry for '$hostname' already present." | Tee-Object -FilePath $log
        exit 0
    }

    # Keep a one-time backup before the first modification.
    $backup = "$hostsFile.careernova.bak"
    if (-not (Test-Path $backup)) {
        Copy-Item -Path $hostsFile -Destination $backup -Force
    }

    $lines = @()
    if ($existing.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($existing[-1])) {
        $lines += ''
    }
    $lines += '# Career Nova local development'
    $lines += "127.0.0.1 $hostname"

    Add-Content -Path $hostsFile -Value $lines -Encoding ASCII -ErrorAction Stop

    if (@(Get-Content -Path $hostsFile) -match $pattern) {
        "Added '127.0.0.1 $hostname' to the hosts file." | Tee-Object -FilePath $log
        ipconfig /flushdns | Out-Null
        exit 0
    }

    throw 'Entry was written but could not be read back.'
}
catch {
    "FAILED: $($_.Exception.GetType().FullName): $($_.Exception.Message)" |
        Tee-Object -FilePath $log
    exit 1
}
