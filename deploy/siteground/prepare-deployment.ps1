# =====================================================
# Script de Empaquetado Automatizado para SiteGround
# Artyco Financial App - RBAC
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PREPARANDO DEPLOYMENT PARA SITEGROUND" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Obtener ruta del proyecto (2 niveles arriba desde deploy/siteground)
$PROJECT_ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$BUILD_DIR = Join-Path $PSScriptRoot "build"
$ZIP_FILE = Join-Path $PSScriptRoot "artyco-siteground.zip"

Write-Host "[1/6] Verificando que existe el build del frontend..." -ForegroundColor Yellow
$DIST_PATH = Join-Path $PROJECT_ROOT "dist"
if (-not (Test-Path $DIST_PATH)) {
    Write-Host "ERROR: No existe la carpeta 'dist'. Ejecuta 'npm run build' primero." -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Frontend buildeado encontrado" -ForegroundColor Green

Write-Host ""
Write-Host "[2/6] Limpiando directorio de build anterior..." -ForegroundColor Yellow
if (Test-Path $BUILD_DIR) {
    Remove-Item -Recurse -Force $BUILD_DIR
    Write-Host "  ✓ Directorio limpiado" -ForegroundColor Green
}
New-Item -ItemType Directory -Path $BUILD_DIR | Out-Null
Write-Host "  ✓ Directorio de build creado" -ForegroundColor Green

Write-Host ""
Write-Host "[3/6] Copiando archivos del backend Python..." -ForegroundColor Yellow
# Backend Python
Copy-Item (Join-Path $PROJECT_ROOT "api_server_rbac.py") $BUILD_DIR
Copy-Item (Join-Path $PROJECT_ROOT "config.py") $BUILD_DIR

# Carpetas del backend
$BACKEND_FOLDERS = @("routes", "auth", "models", "database", "utils")
foreach ($folder in $BACKEND_FOLDERS) {
    $source = Join-Path $PROJECT_ROOT $folder
    if (Test-Path $source) {
        $dest = Join-Path $BUILD_DIR $folder
        Copy-Item $source $dest -Recurse
        Write-Host "  ✓ Copiado: $folder" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "[4/6] Copiando frontend (dist), archivos de config y SQL..." -ForegroundColor Yellow
# Frontend
Copy-Item $DIST_PATH (Join-Path $BUILD_DIR "dist") -Recurse
Write-Host "  ✓ Frontend (dist) copiado" -ForegroundColor Green

# Scripts SQL
$SQL_SOURCE = Join-Path $PROJECT_ROOT "docker\mysql"
if (Test-Path $SQL_SOURCE) {
    $SQL_DEST = Join-Path $BUILD_DIR "sql"
    Copy-Item $SQL_SOURCE $SQL_DEST -Recurse
    Write-Host "  ✓ Scripts SQL copiados" -ForegroundColor Green
}

# Archivos de configuración para SiteGround
Copy-Item (Join-Path $PSScriptRoot "passenger_wsgi.py") $BUILD_DIR
Copy-Item (Join-Path $PSScriptRoot ".htaccess") $BUILD_DIR
Copy-Item (Join-Path $PROJECT_ROOT "requirements_siteground.txt") (Join-Path $BUILD_DIR "requirements.txt")
Write-Host "  ✓ Archivos de configuración copiados" -ForegroundColor Green

# Crear carpetas vacías necesarias
$EMPTY_FOLDERS = @("uploads", "logs")
foreach ($folder in $EMPTY_FOLDERS) {
    $path = Join-Path $BUILD_DIR $folder
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    # Crear .gitkeep para preservar la carpeta
    New-Item -ItemType File -Path (Join-Path $path ".gitkeep") -Force | Out-Null
}
Write-Host "  ✓ Carpetas uploads/ y logs/ creadas" -ForegroundColor Green

Write-Host ""
Write-Host "[5/6] Creando archivo .env de ejemplo..." -ForegroundColor Yellow
$ENV_CONTENT = @"
# Configuración para SiteGround - cfg.artycoec.com
ENVIRONMENT=production
SITEGROUND=true

# Base de Datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dbhvwc3icpvb0z
DB_USER=u6ugyggyggw7u
DB_PASSWORD=WBfwbn-yPeYp7d5

# Seguridad JWT (CAMBIA ESTE SECRET!)
JWT_SECRET_KEY=GENERA_UN_SECRET_ALEATORIO_AQUI_CON_openssl_rand_hex_32
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS (tu dominio de producción)
CORS_ORIGINS=https://cfg.artycoec.com

# Debug
DEBUG=false
RELOAD=false

# Opcional: Anthropic AI (si usas módulo Brain)
# ANTHROPIC_API_KEY=tu_api_key_aqui
"@

$ENV_CONTENT | Out-File -FilePath (Join-Path $BUILD_DIR ".env.example") -Encoding UTF8
Write-Host "  ✓ Archivo .env.example creado" -ForegroundColor Green
Write-Host "  ⚠ RECUERDA: Renombrar a .env y generar JWT_SECRET_KEY en el servidor" -ForegroundColor Yellow

Write-Host ""
Write-Host "[6/6] Comprimiendo archivos en ZIP..." -ForegroundColor Yellow
if (Test-Path $ZIP_FILE) {
    Remove-Item -Force $ZIP_FILE
}

Compress-Archive -Path "$BUILD_DIR\*" -DestinationPath $ZIP_FILE -CompressionLevel Optimal
Write-Host "  ✓ Archivo ZIP creado" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✓ EMPAQUETADO COMPLETADO CON ÉXITO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Archivo generado:" -ForegroundColor White
Write-Host "  → $ZIP_FILE" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tamaño del archivo:" -ForegroundColor White
$zipSize = (Get-Item $ZIP_FILE).Length / 1MB
Write-Host ("  → {0:N2} MB" -f $zipSize) -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Sube el archivo ZIP a SiteGround via SFTP/SSH" -ForegroundColor White
Write-Host "  2. Descomprime en ~/public_html/" -ForegroundColor White
Write-Host "  3. Sigue las instrucciones en DEPLOYMENT_INSTRUCTIONS.md" -ForegroundColor White
Write-Host ""
