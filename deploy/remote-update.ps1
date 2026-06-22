# Обновление на VPS через PuTTY (пароль root из панели хостинга)
#   cd C:\Users\user\Desktop\aicrmpro
#   .\deploy\remote-update.ps1 -RootPassword 'ВАШ_ПАРОЛЬ'

param(
    [Parameter(Mandatory = $true)]
    [string]$RootPassword,
    [string]$Server = 'root@83.222.18.141',
    [string]$HostKey = 'ssh-ed25519 255 SHA256:GgQtsUv6ZDFQiRfZ4s7Ue3Tq4R3ttdyhxl9O0GXo5Jk',
    [string]$RemoteDir = '/opt/aicrmpro'
)

$ErrorActionPreference = 'Stop'
$Plink = 'C:\Program Files\PuTTY\plink.exe'
$Pscp = 'C:\Program Files\PuTTY\pscp.exe'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

if (-not (Test-Path $Plink)) { throw "Установите PuTTY: $Plink" }

Write-Host '==> Packing...' -ForegroundColor Yellow
& (Join-Path $PSScriptRoot 'make-deploy-zip.ps1')
$zipPath = Join-Path $PSScriptRoot 'aicrmpro-deploy.zip'

Write-Host '==> Upload...' -ForegroundColor Yellow
& $Pscp -pw $RootPassword -hostkey $HostKey $zipPath "${Server}:/tmp/aicrmpro-deploy.zip"

$remoteScript = @"
set -e
mkdir -p $RemoteDir/uploads
test -f $RemoteDir/.env && cp -a $RemoteDir/.env /tmp/aicrmpro.env.bak || true
test -d $RemoteDir/uploads && cp -a $RemoteDir/uploads /tmp/aicrmpro-uploads.bak || true
rm -rf $RemoteDir/*
unzip -oq /tmp/aicrmpro-deploy.zip -d $RemoteDir
test -f /tmp/aicrmpro.env.bak && cp -a /tmp/aicrmpro.env.bak $RemoteDir/.env
test -d /tmp/aicrmpro-uploads.bak && rm -rf $RemoteDir/uploads && cp -a /tmp/aicrmpro-uploads.bak $RemoteDir/uploads
find $RemoteDir -name '*.sh' -exec sed -i 's/\r$//' {} \;
chmod +x $RemoteDir/deploy/install-server.sh
bash $RemoteDir/deploy/install-server.sh
bash $RemoteDir/deploy/apply-pending-migrations.sh || true
docker compose -f $RemoteDir/docker-compose.prod-external-ssl.yml exec -T backend npm run migrate:client-names || true
curl -sf http://127.0.0.1:3000/api/health && echo ''
"@

Write-Host '==> Deploy on server...' -ForegroundColor Yellow
& $Plink -ssh $Server -pw $RootPassword -batch -hostkey $HostKey $remoteScript

Write-Host '==> Done: https://woner.ru' -ForegroundColor Green
