@echo off
REM Double-click entry point for Career Nova. Runs start.ps1 without needing the
REM PowerShell execution policy to be changed.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
if errorlevel 1 pause
