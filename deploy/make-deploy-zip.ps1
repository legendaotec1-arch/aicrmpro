# Создаёт архив для ручной заливки (Beget консоль / когда SSH не работает)
$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$zipPath = Join-Path $PSScriptRoot "aicrmpro-deploy.zip"

$staging = Join-Path $env:TEMP "aicrmpro-staging-pack"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

Get-ChildItem $ProjectRoot -Force | Where-Object {
    $_.Name -notin @('node_modules', '.git', '.env') -and $_.Name -notlike '.env'
} | ForEach-Object {
    if ($_.PSIsContainer) {
        robocopy $_.FullName (Join-Path $staging $_.Name) /E /XD node_modules .git dist frontend\node_modules frontend\dist backend\node_modules bot\node_modules telegram-bot\node_modules /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    } else {
        Copy-Item $_.FullName -Destination (Join-Path $staging $_.Name)
    }
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Get-ChildItem $staging -Recurse -Filter '*.sh' | ForEach-Object {
    $c = [IO.File]::ReadAllText($_.FullName) -replace "`r`n", "`n"
    [IO.File]::WriteAllText($_.FullName, $c)
}
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -Force
Remove-Item $staging -Recurse -Force

Write-Host "OK: $zipPath ($([math]::Round((Get-Item $zipPath).Length/1MB, 2)) MB)" -ForegroundColor Green
