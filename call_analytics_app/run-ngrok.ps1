# Expose the local server (port 8000) via ngrok. Run AFTER run-server.ps1 is up.
# Usage:  .\run-ngrok.ps1
$port = 8000

# Find ngrok: prefer PATH, else the winget install location.
$ngrok = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
if (-not $ngrok) {
    $winget = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"
    if (Test-Path $winget) { $ngrok = $winget }
}
if (-not $ngrok) {
    Write-Error "ngrok not found on PATH or in the winget package folder. Install it or fix the path in run-ngrok.ps1."
    exit 1
}

Write-Host "Exposing http://localhost:$port via ngrok ..." -ForegroundColor Cyan
& $ngrok http $port
