# Clean Start Script for Windows PowerShell

Write-Host "Door Access System - Clean Start Script" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# 1. Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Please run this script as Administrator" -ForegroundColor Red
    exit
}

# 2. Kill processes using required ports
Write-Host "`nChecking for processes using required ports..." -ForegroundColor Yellow
$ports = @(8000, 27017)
foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($process) {
        Write-Host "Killing process using port $port (PID: $process)..." -ForegroundColor Yellow
        Stop-Process -Id $process -Force
    }
}

# 3. Stop MongoDB service if running
Write-Host "`nChecking MongoDB service..." -ForegroundColor Yellow
if (Get-Service MongoDB -ErrorAction SilentlyContinue) {
    Stop-Service MongoDB
    Write-Host "MongoDB service stopped" -ForegroundColor Green
}

# 4. Clean MongoDB data directory
Write-Host "`nCleaning MongoDB data..." -ForegroundColor Yellow
$dataPath = "./data"
if (Test-Path $dataPath) {
    Remove-Item -Path $dataPath -Recurse -Force
    Write-Host "MongoDB data directory cleaned" -ForegroundColor Green
}

# 5. Reset environment files
Write-Host "`nResetting environment files..." -ForegroundColor Yellow
@"
# Environment Variables for Door Access System

# MongoDB connection string
MONGODB_URI=mongodb://mongodb:27017/dooraccess

# Default admin password
ADMIN_PASSWORD=123456
"@ | Set-Content -Path ".env"
Write-Host "Environment files reset" -ForegroundColor Green

# 6. Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit
}

# 7. Build TypeScript
Write-Host "`nBuilding TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build TypeScript" -ForegroundColor Red
    exit
}

Write-Host "`nClean start completed successfully!" -ForegroundColor Green
Write-Host "You can now start the application using either:" -ForegroundColor Yellow
Write-Host "1. npm start" -ForegroundColor Cyan
Write-Host "2. docker-compose up" -ForegroundColor Cyan
Write-Host "`nDefault admin code: 123456" -ForegroundColor Yellow
