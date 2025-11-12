#!/usr/bin/env bash
# Script para regenerar el schema base desde la base de datos local
# Uso: ./scripts/regenerate_base_schema.sh
# Opcionalmente: DB_HOST=127.0.0.1 DB_USER=root DB_PASS=secret ./scripts/regenerate_base_schema.sh

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-}
DB_NAME=${DB_NAME:-artyco_financial_rbac}
SCHEMA_FILE="schema/000_base_schema.sql"
BACKUP_DIR="database/backups/schema_regeneration"

# Banner
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Regenerador de Schema Base - Artyco Financial${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar que mysqldump existe
if ! command -v mysqldump >/dev/null 2>&1; then
  echo -e "${RED}❌ Error: mysqldump no está instalado.${NC}" >&2
  echo "   Instala MySQL client y vuelve a intentar."
  exit 1
fi

# Establecer contraseña si se proporciona
if [[ -n "${DB_PASS}" ]]; then
  export MYSQL_PWD="${DB_PASS}"
fi

# Crear directorio de backup si no existe
mkdir -p "${BACKUP_DIR}"

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "   Base de datos: ${DB_NAME}"
echo "   Host: ${DB_HOST}:${DB_PORT}"
echo "   Usuario: ${DB_USER}"
echo "   Archivo destino: ${SCHEMA_FILE}"
echo ""

# Confirmar con el usuario
echo -e "${YELLOW}⚠️  Este script sobrescribirá el archivo existente: ${SCHEMA_FILE}${NC}"
echo -n "¿Continuar? (y/N): "
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
  echo -e "${RED}❌ Operación cancelada por el usuario.${NC}"
  exit 0
fi

# Crear backup del schema actual
if [[ -f "${SCHEMA_FILE}" ]]; then
  BACKUP_FILE="${BACKUP_DIR}/000_base_schema_$(date +%Y%m%d_%H%M%S).sql"
  echo -e "${BLUE}📦 Creando backup del schema actual...${NC}"
  cp "${SCHEMA_FILE}" "${BACKUP_FILE}"
  echo -e "${GREEN}   ✓ Backup guardado en: ${BACKUP_FILE}${NC}"
fi

# Generar el nuevo schema
echo -e "${BLUE}🔄 Generando nuevo schema base desde ${DB_HOST}...${NC}"

mysqldump \
  -h "${DB_HOST}" \
  -P "${DB_PORT}" \
  -u "${DB_USER}" \
  --single-transaction \
  --routines \
  --triggers \
  --skip-comments \
  --skip-extended-insert \
  "${DB_NAME}" > "${SCHEMA_FILE}"

if [[ $? -eq 0 ]]; then
  echo -e "${GREEN}✅ Schema base regenerado exitosamente${NC}"

  # Mostrar estadísticas
  echo ""
  echo -e "${BLUE}📊 Estadísticas del schema generado:${NC}"
  echo "   Tamaño: $(ls -lh "${SCHEMA_FILE}" | awk '{print $5}')"
  echo "   Líneas: $(wc -l < "${SCHEMA_FILE}")"
  echo "   Tablas: $(grep -c "CREATE TABLE" "${SCHEMA_FILE}" || true)"
  echo "   Vistas: $(grep -c "CREATE.*VIEW" "${SCHEMA_FILE}" || true)"
  echo ""

  # Verificar integridad básica
  if grep -q "CREATE TABLE" "${SCHEMA_FILE}" && grep -q "artyco_financial_rbac" "${SCHEMA_FILE}"; then
    echo -e "${GREEN}✓ Verificación de integridad: OK${NC}"
  else
    echo -e "${YELLOW}⚠️  Advertencia: El schema generado puede estar incompleto${NC}"
  fi

  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  Schema regenerado con éxito${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Próximos pasos:"
  echo "  1. Revisa el schema generado: ${SCHEMA_FILE}"
  echo "  2. Prueba la instalación en un ambiente limpio"
  echo "  3. Haz commit del nuevo schema"
  echo ""
else
  echo -e "${RED}❌ Error al generar el schema${NC}" >&2
  echo "   Revisa la configuración de conexión a la base de datos"

  # Restaurar backup si existe
  if [[ -n "${BACKUP_FILE:-}" && -f "${BACKUP_FILE}" ]]; then
    echo -e "${YELLOW}🔄 Restaurando backup anterior...${NC}"
    cp "${BACKUP_FILE}" "${SCHEMA_FILE}"
    echo -e "${GREEN}   ✓ Schema anterior restaurado${NC}"
  fi

  exit 1
fi
