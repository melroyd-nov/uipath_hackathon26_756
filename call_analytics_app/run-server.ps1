# Start the local ML API server. Usage:  .\run-server.ps1
Set-Location -Path $PSScriptRoot
Write-Host "Starting call-analytics API on http://0.0.0.0:8000 ..." -ForegroundColor Cyan
# Launch uvicorn as a module via python.exe (NOT the uvicorn.exe console-script
# shim): Windows Application Control / Smart App Control blocks the freshly built,
# unsigned uvicorn.exe (os error 4551). python.exe -m uvicorn avoids that shim.
& "$PSScriptRoot\.venv\Scripts\python.exe" -m uvicorn call_analytics.api.main:app --host 0.0.0.0 --port 8000
