# Запуск с Windows (PowerShell) из корня проекта:
#   cd C:\Users\user\Desktop\aicrmpro
#   .\deploy\upload-and-deploy.ps1
#
# Потребуется пароль root@83.222.18.141

$ErrorActionPreference = "Stop"
$Server = "root@83.222.18.141"
$RemoteDir = "/opt/aicrmpro"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Plink = "C:\Program Files\PuTTY\plink.exe"
$Pscp = "C:\Program Files\PuTTY\pscp.exe"
$HostKey = "ssh-ed25519 255 SHA256:GgQtsUv6ZDFQiRfZ4s7Ue3Tq4R3ttdyhxl9O0GXo5Jk"

Write-Host "Project: $ProjectRoot" -ForegroundColor Cyan
Write-Host "Server:  $Server" -ForegroundColor Cyan
Write-Host "Remote:  $RemoteDir" -ForegroundColor Cyan

$zipPath = Join-Path $env:TEMP "aicrmpro-deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Write-Host "`n==> Packing project (without node_modules)..." -ForegroundColor Yellow
$staging = Join-Path $env:TEMP "aicrmpro-staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

$excludeDirs = @('node_modules', '.git', 'dist', 'frontend\node_modules', 'frontend\dist', 'backend\node_modules', 'bot\node_modules', 'telegram-bot\node_modules')

Get-ChildItem $ProjectRoot -Force | Where-Object {
    $name = $_.Name
    $name -notin @('node_modules', '.git') -and $name -notlike '.env'
} | ForEach-Object {
    if ($_.PSIsContainer) {
        $dest = Join-Path $staging $_.Name
        robocopy $_.FullName $dest /E /XD node_modules .git dist frontend\node_modules frontend\dist backend\node_modules bot\node_modules telegram-bot\node_modules /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
        if ($LASTEXITCODE -ge 8) { throw "robocopy failed for $($_.Name)" }
    } else {
        Copy-Item $_.FullName -Destination (Join-Path $staging $_.Name)
    }
}

Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -Force
Remove-Item $staging -Recurse -Force
Write-Host "Archive: $zipPath ($([math]::Round((Get-Item $zipPath).Length/1MB, 2)) MB)" -ForegroundColor Green

Write-Host "`n==> Creating remote folder..." -ForegroundColor Yellow
ssh $Server "mkdir -p $RemoteDir"

Write-Host "`n==> Uploading archive..." -ForegroundColor Yellow
scp $zipPath "${Server}:/tmp/aicrmpro-deploy.zip"

Write-Host "`n==> Unpacking and installing on server..." -ForegroundColor Yellow
$remoteScript = @"
set -e
apt-get update -qq 2>/dev/null || true
apt-get install -y -qq unzip curl 2>/dev/null || true
rm -rf $RemoteDir/*
unzip -oq /tmp/aicrmpro-deploy.zip -d $RemoteDir
chmod +x $RemoteDir/deploy/install-server.sh
bash $RemoteDir/deploy/install-server.sh
"@

ssh $Server $remoteScript

Write-Host "`n==> Checking site..." -ForegroundColor Yellow
ssh $Server "curl -sf http://127.0.0.1:3000/api/health; echo ''; curl -skI https://woner.ru/api/health 2>/dev/null | head -3 || true"

Write-Host "`n==> SUCCESS" -ForegroundColor Green
Write-Host "Open: https://woner.ru"
Write-Host "If /m/ links 404: bash $RemoteDir/deploy/setup-nginx-on-vps.sh your@email.ru"
Write-Host "Edit env: ssh $Server `"nano $RemoteDir/.env`""
