# Start the local ML API server. Usage:  .\run-server.ps1
Set-Location -Path $PSScriptRoot
Write-Host "Starting call-analytics API on http://0.0.0.0:8000 ..." -ForegroundColor Cyan
uv run uvicorn call_analytics.api.main:app --host 0.0.0.0 --port 8000
