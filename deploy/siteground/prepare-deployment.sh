#!/bin/bash

# =====================================================
# Script de Empaquetado Automatizado para SiteGround
# Artyco Financial App - RBAC
# =====================================================

echo "========================================"
echo "  PREPARANDO DEPLOYMENT PARA SITEGROUND"
echo "========================================"
echo ""

# Variables
PROJECT_ROOT="/mnt/c/Users/dpaul/OneDrive/Escritorio/artyco-financial-app-rbac"
DEPLOY_DIR="$PROJECT_ROOT/deploy/siteground"
BUILD_DIR="$DEPLOY_DIR/build"
ZIP_FILE="$DEPLOY_DIR/artyco-siteground.zip"

echo "[1/6] Verificando que existe el build del frontend..."
if [ ! -d "$PROJECT_ROOT/dist" ]; then
    echo "ERROR: No existe la carpeta 'dist'"
    exit 1
fi
echo "  ✓ Frontend buildeado encontrado"

echo ""
echo "[2/6] Limpiando directorio de build anterior..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
echo "  ✓ Directorio de build creado"

echo ""
echo "[3/6] Copiando archivos del backend Python..."
# Backend Python
cp "$PROJECT_ROOT/api_server_rbac.py" "$BUILD_DIR/"
cp "$PROJECT_ROOT/config.py" "$BUILD_DIR/"

# Carpetas del backend
for folder in routes auth models database utils; do
    if [ -d "$PROJECT_ROOT/$folder" ]; then
        cp -r "$PROJECT_ROOT/$folder" "$BUILD_DIR/"
        echo "  ✓ Copiado: $folder"
    fi
done

echo ""
echo "[4/6] Copiando frontend (dist), archivos de config y SQL..."
# Frontend
cp -r "$PROJECT_ROOT/dist" "$BUILD_DIR/"
echo "  ✓ Frontend (dist) copiado"

# Scripts SQL
if [ -d "$PROJECT_ROOT/docker/mysql" ]; then
    cp -r "$PROJECT_ROOT/docker/mysql" "$BUILD_DIR/sql"
    echo "  ✓ Scripts SQL copiados"
fi

# Archivos de configuración para SiteGround
cp "$DEPLOY_DIR/passenger_wsgi.py" "$BUILD_DIR/"
cp "$DEPLOY_DIR/.htaccess" "$BUILD_DIR/"
cp "$PROJECT_ROOT/requirements_siteground.txt" "$BUILD_DIR/requirements.txt"
echo "  ✓ Archivos de configuración copiados"

# Crear carpetas vacías necesarias
mkdir -p "$BUILD_DIR/uploads"
mkdir -p "$BUILD_DIR/logs"
touch "$BUILD_DIR/uploads/.gitkeep"
touch "$BUILD_DIR/logs/.gitkeep"
echo "  ✓ Carpetas uploads/ y logs/ creadas"

echo ""
echo "[5/6] Creando archivo .env de ejemplo..."
cat > "$BUILD_DIR/.env.example" << 'EOF'
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
EOF
echo "  ✓ Archivo .env.example creado"
echo "  ⚠ RECUERDA: Renombrar a .env y generar JWT_SECRET_KEY en el servidor"

echo ""
echo "[6/6] Comprimiendo archivos en ZIP..."
cd "$BUILD_DIR"
rm -f "$ZIP_FILE"
zip -r "$ZIP_FILE" . > /dev/null 2>&1
echo "  ✓ Archivo ZIP creado"

echo ""
echo "========================================"
echo "  ✓ EMPAQUETADO COMPLETADO CON ÉXITO"
echo "========================================"
echo ""
echo "Archivo generado:"
echo "  → $ZIP_FILE"
echo ""
echo "Tamaño del archivo:"
ls -lh "$ZIP_FILE" | awk '{print "  →", $5}'
echo ""
echo "Próximos pasos:"
echo "  1. Sube el archivo ZIP a SiteGround via SFTP/SSH"
echo "  2. Descomprime en ~/public_html/"
echo "  3. Sigue las instrucciones en DEPLOYMENT_INSTRUCTIONS.md"
echo ""
