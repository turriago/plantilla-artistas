param(
  [string]$Numero = "",
  [string]$Base = "",
  [switch]$Auto,
  [switch]$MantenerSesion
)

$ErrorActionPreference = "Continue"
Set-Location -LiteralPath $PSScriptRoot

function Paso($texto) { Write-Host ""; Write-Host "== $texto" -ForegroundColor Cyan }
function Falla($texto) { Write-Host ""; Write-Host "ERROR: $texto" -ForegroundColor Red; exit 1 }
function Refrescar-Ruta {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [Environment]::GetEnvironmentVariable("Path", "User") + ";" + (Join-Path $env:APPDATA "npm")
}
function Existe($comando) { [bool](Get-Command $comando -ErrorAction SilentlyContinue) }

Paso "1. Revisando Node.js"
Refrescar-Ruta
if (-not (Existe "node.exe")) {
  if (Existe "winget.exe") {
    Write-Host "Instalando Node.js. Acepta si Windows lo pide."
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    Refrescar-Ruta
  }
  if (-not (Existe "node.exe")) {
    Falla "Falta Node.js. Instalalo desde https://nodejs.org (version LTS), cierra esta ventana y vuelve a abrir configurar.cmd."
  }
}
Write-Host ("Node " + (node.exe -v))

Paso "2. Revisando Vercel"
if (-not (Existe "vercel.cmd")) {
  Write-Host "Instalando Vercel. Tarda un minuto."
  npm.cmd install -g vercel
  Refrescar-Ruta
  if (-not (Existe "vercel.cmd")) { Falla "No se pudo instalar Vercel. Cierra la ventana y vuelve a intentar." }
}
$cuenta = (vercel.cmd whoami 2>$null | Select-Object -Last 1)
if ($LASTEXITCODE -ne 0 -or -not $cuenta) {
  Write-Host "Inicia sesion en el navegador con tu cuenta de Vercel."
  vercel.cmd login
  $cuenta = (vercel.cmd whoami 2>$null | Select-Object -Last 1)
  if ($LASTEXITCODE -ne 0 -or -not $cuenta) { Falla "No se inicio la sesion de Vercel." }
}
Write-Host "Cuenta de Vercel: $cuenta"

Paso "3. Datos de este artista"
$numeroValido = { $Numero -match '^\d{1,2}$' -and [int]$Numero -ge 1 -and [int]$Numero -le 30 }
if ($Auto -and -not (& $numeroValido)) { Falla "El numero del artista debe ir de 1 a 30." }
while (-not (& $numeroValido)) {
  $Numero = Read-Host "Numero del artista (1 a 30)"
}
$nn = "{0:D2}" -f [int]$Numero
$proyecto = "portafolio-$nn"
Write-Host "Proyecto: $proyecto   Base de Neon: portafolio$([int]$Numero)"
if (-not $Base -and (Test-Path -LiteralPath "base.txt")) {
  $Base = (Get-Content -LiteralPath "base.txt" -Raw).Trim().Trim('"').Trim("'")
  Remove-Item -LiteralPath "base.txt" -Force
  Write-Host "Direccion tomada de base.txt (el archivo ya se borro)."
}
if ($Auto -and $Base -notmatch '^postgres(ql)?://\S+$') {
  Falla "Falta base.txt con la direccion de Neon de portafolio$([int]$Numero)."
}
while ($Base -notmatch '^postgres(ql)?://\S+$') {
  $Base = (Read-Host "Pega la direccion de la base portafolio$([int]$Numero) (Neon > Connect)").Trim().Trim('"').Trim("'")
}
if (-not (Test-Path -LiteralPath "schema.sql")) { Falla "Falta schema.sql en esta carpeta." }

Paso "4. Creando el proyecto en Vercel"
vercel.cmd project add $proyecto 2>&1 | Out-Null
vercel.cmd link --yes --project $proyecto
if ($LASTEXITCODE -ne 0) { Falla "No se pudo vincular la carpeta con $proyecto." }
Remove-Item -LiteralPath ".env.local" -Force -ErrorAction SilentlyContinue
vercel.cmd project update $proyecto --framework flask 2>&1 | Out-Null

Paso "5. Guardando la base y las claves en Vercel"
$sesion = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
$variables = [ordered]@{ DATABASE_URL = $Base; ADMIN_PASSWORD = "0000"; SECRET_KEY = $sesion }
foreach ($nombre in $variables.Keys) {
  vercel.cmd env add $nombre production --value $variables[$nombre] --sensitive --force --yes 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Falla "No se pudo guardar $nombre en Vercel." }
  Write-Host "$nombre guardada"
}

Paso "6. Publicando (tarda uno o dos minutos)"
$salida = (vercel.cmd deploy --prod --yes 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) { Write-Host $salida; Falla "La publicacion fallo." }
$despliegue = [regex]::Matches($salida, 'https://[a-z0-9-]+\.vercel\.app') | ForEach-Object { $_.Value } | Select-Object -First 1
if (-not $despliegue) { Write-Host $salida; Falla "No encontre el enlace publicado." }
$detalle = (vercel.cmd inspect $despliegue 2>&1 | Out-String)
$alias = ($detalle -split "Aliases", 2)[-1]
$enlace = [regex]::Matches($alias, 'https://[a-z0-9-]+\.vercel\.app') | ForEach-Object { $_.Value } |
  Sort-Object Length | Select-Object -First 1
if (-not $enlace) { $enlace = $despliegue }

Paso "7. Creando las tablas y probando el admin"
$listo = $false
foreach ($intento in 1..6) {
  try {
    $r = Invoke-WebRequest -Uri "$enlace/admin/login" -UseBasicParsing -TimeoutSec 60
    if ($r.StatusCode -eq 200 -and $r.Content -match "Clave") { $listo = $true; break }
  } catch { Start-Sleep -Seconds 5 }
}
if (-not $listo) { Falla "La pagina publico, pero el admin no responde. Revisa la direccion de la base." }

Set-Content -LiteralPath "enlace.txt" -Value "$proyecto`r`n$enlace`r`n$enlace/admin  (clave 0000)" -Encoding UTF8
Write-Host ""
Write-Host "LISTO" -ForegroundColor Green
Write-Host "Enlace: $enlace"
Write-Host "Admin:  $enlace/admin   clave 0000"
Write-Host "Quedo anotado en enlace.txt"

if (-not $MantenerSesion) {
  $cerrar = if ($Auto) { "S" } else { Read-Host "Cerrar la sesion de Vercel en este computador? (S/N)" }
  if ($cerrar -notmatch '^[nN]') { vercel.cmd logout | Out-Null; Write-Host "Sesion de Vercel cerrada." }
}
