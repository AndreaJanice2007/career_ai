# Kept so existing notes and shortcuts keep working. start.ps1 is the real
# entry point; it performs the same job with environment and port checks.

$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'start.ps1') @args
