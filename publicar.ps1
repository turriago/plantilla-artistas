$ErrorActionPreference = "Continue"
Set-Location -LiteralPath $PSScriptRoot
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [Environment]::GetEnvironmentVariable("Path", "User") + ";" + (Join-Path $env:APPDATA "npm")

if (-not (Get-Command "vercel.cmd" -ErrorAction SilentlyContinue)) {
  Write-Host "Falta Vercel. Usa primero configurar.cmd." -ForegroundColor Red; exit 1
}
if (-not (Test-Path -LiteralPath ".vercel\project.json")) {
  Write-Host "Esta carpeta no esta vinculada. Usa primero configurar.cmd." -ForegroundColor Red; exit 1
}
if (-not (Test-Path -LiteralPath "schema.sql")) {
  Write-Host "Falta schema.sql. Sin ese archivo el admin no arranca." -ForegroundColor Red; exit 1
}

vercel.cmd whoami 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Inicia sesion en el navegador con tu cuenta de Vercel."
  vercel.cmd login
}

Remove-Item -LiteralPath ".env.local" -Force -ErrorAction SilentlyContinue
Write-Host "Publicando (tarda uno o dos minutos)..."
$salida = (vercel.cmd deploy --prod --yes 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) { Write-Host $salida; Write-Host "La publicacion fallo." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "PUBLICADO" -ForegroundColor Green
if (Test-Path -LiteralPath "enlace.txt") { Get-Content -LiteralPath "enlace.txt" | Select-Object -First 2 | Select-Object -Last 1 }

vercel.cmd logout | Out-Null
Write-Host "Sesion de Vercel cerrada."
