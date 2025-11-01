#!/bin/bash
# Script para limpiar archivos Python innecesarios en SiteGround
# Ejecutar DESPUÉS de desplegar el backend en Render.com

set -e  # Exit on error

echo "🧹 Limpiando archivos Python de SiteGround..."
echo "⚠️  IMPORTANTE: Asegúrate de tener backup antes de continuar"
echo ""
read -p "¿Estás seguro de que quieres continuar? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Operación cancelada"
    exit 1
fi

# Directorio base (ajustar según sea necesario)
BASE_DIR="${HOME}/www/cfg.artycoec.com/public_html"
cd "$BASE_DIR" || exit 1

echo ""
echo "📦 Creando backup de archivos Python..."
BACKUP_FILE="backup_python_files_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP_FILE" \
    --ignore-failed-read \
    *.py \
    venv/ \
    requirements*.txt \
    .env \
    database/ \
    routes/ \
    config.py \
    logs/ \
    2>/dev/null || true

if [ -f "$BACKUP_FILE" ]; then
    echo "✅ Backup creado: $BACKUP_FILE"
    echo "   Tamaño: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "⚠️  No se creó backup (puede que los archivos no existan)"
fi

echo ""
echo "🗑️  Eliminando archivos Python..."

# Eliminar directorios
rm -rf venv/ 2>/dev/null || echo "  - venv/ no existe"
rm -rf database/ 2>/dev/null || echo "  - database/ no existe"
rm -rf routes/ 2>/dev/null || echo "  - routes/ no existe"
rm -rf __pycache__/ 2>/dev/null || echo "  - __pycache__/ no existe"
rm -rf logs/ 2>/dev/null || echo "  - logs/ no existe"

# Eliminar archivos Python
rm -f *.py 2>/dev/null || echo "  - *.py no existen"
rm -f requirements*.txt 2>/dev/null || echo "  - requirements*.txt no existen"
rm -f .env 2>/dev/null || echo "  - .env no existe"

# Eliminar archivos relacionados con deployment
rm -f passenger_wsgi.py 2>/dev/null || echo "  - passenger_wsgi.py no existe"

echo ""
echo "✅ Limpieza completada"
echo ""
echo "📁 Archivos restantes en public_html:"
ls -lah "$BASE_DIR" | head -20

echo ""
echo "⚠️  SIGUIENTE PASO:"
echo "   1. Actualizar .htaccess para servir solo SPA"
echo "   2. Verificar que dist/ está actualizado con nuevo build"
echo "   3. Probar el sitio: https://cfg.artycoec.com"
