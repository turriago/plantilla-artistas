$ErrorActionPreference = "Continue"
Set-Location -LiteralPath $PSScriptRoot

function Paso($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }

Paso "1. Docker Desktop"
$dockerDesktop = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  if (Test-Path $dockerDesktop) {
    Write-Host "Abriendo Docker Desktop..."
    Start-Process -FilePath $dockerDesktop
  } else {
    Write-Host "ERROR: No esta Docker Desktop." -ForegroundColor Red
    exit 1
  }
  foreach ($i in 1..36) {
    Start-Sleep -Seconds 5
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Write-Host "Esperando Docker... $($i*5)s"
  }
  docker info 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker no arranco. Abrelo a mano y vuelve a intentar." -ForegroundColor Red
    exit 1
  }
}
Write-Host "Docker listo"

Paso "2. Configuracion local (.env)"
if (-not (Test-Path ".env")) {
  $sesion = [guid]::NewGuid().ToString("N")
  @(
    "DATABASE_URL=postgresql://postgres:postgres@localhost:5433/historias",
    "ADMIN_PASSWORD=0000",
    "SECRET_KEY=$sesion",
    "PORT=8080",
    ""
  ) | Set-Content -LiteralPath ".env" -Encoding UTF8
  Write-Host "Creado .env (clave del admin: 0000)"
} else {
  Write-Host ".env ya existe"
}

Paso "3. Base de datos historias"
$nombre = "portafolio-historias-pg"
$existe = docker ps -a --filter "name=^/${nombre}$" --format "{{.Names}}"
if (-not $existe) {
  Write-Host "Creando contenedor PostgreSQL..."
  docker run -d --name $nombre `
    -e POSTGRES_USER=postgres `
    -e POSTGRES_PASSWORD=postgres `
    -e POSTGRES_DB=historias `
    -p 5433:5432 `
    postgres:16 | Out-Null
} else {
  $estado = docker inspect -f "{{.State.Running}}" $nombre 2>$null
  if ($estado -ne "true") {
    Write-Host "Encendiendo la base..."
    docker start $nombre | Out-Null
  }
}

foreach ($i in 1..20) {
  docker exec $nombre pg_isready -U postgres 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 2
}
docker exec $nombre pg_isready -U postgres 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: PostgreSQL no responde." -ForegroundColor Red
  exit 1
}
Write-Host "Base lista en puerto 5433"

Paso "4. Puerto 8080 libre"
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    try { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } catch {}
  }

Paso "5. Arrancando el sitio"
Write-Host "Sitio:  http://127.0.0.1:8080"
Write-Host "Admin:  http://127.0.0.1:8080/admin"
Write-Host "La clave del admin esta en el archivo .env (ADMIN_PASSWORD)"
Write-Host ""
python server.py

