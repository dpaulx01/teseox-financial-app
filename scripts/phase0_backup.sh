#!/bin/bash
# ============================================================================
# FASE 0: Backup Completo de Base de Datos
# Fecha: 2025-11-14
# Propósito: Crear backup completo ANTES de migraciones multitenant
# ============================================================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
BACKUP_DIR="database/backups/multitenant"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_pre_multitenant_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Info de conexión (local Docker)
DB_HOST="127.0.0.1"
DB_PORT="3307"
DB_NAME="artyco_financial_rbac"
DB_USER="artyco_user"
DB_PASSWORD="artyco_password123"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  FASE 0: Backup Pre-Multitenant${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Crear directorio de backups si no existe
echo -e "${YELLOW}📁 Creando directorio de backups...${NC}"
mkdir -p "${BACKUP_DIR}"

# 2. Verificar que MySQL esté corriendo
echo -e "${YELLOW}🔍 Verificando conexión a MySQL...${NC}"
if ! docker compose exec mysql-rbac mysqladmin ping -h localhost --silent; then
    echo -e "${RED}❌ ERROR: MySQL no está corriendo${NC}"
    echo -e "${YELLOW}💡 Ejecuta: docker compose up -d mysql-rbac${NC}"
    exit 1
fi
echo -e "${GREEN}✅ MySQL está corriendo${NC}"

# 3. Verificar que la base de datos existe
echo -e "${YELLOW}🔍 Verificando base de datos...${NC}"
DB_EXISTS=$(docker compose exec mysql-rbac mysql -u ${DB_USER} -p${DB_PASSWORD} \
    -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='${DB_NAME}';" -N -s)

if [ -z "$DB_EXISTS" ]; then
    echo -e "${RED}❌ ERROR: Base de datos '${DB_NAME}' no existe${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Base de datos '${DB_NAME}' existe${NC}"

# 4. Obtener estadísticas antes del backup
echo -e "${YELLOW}📊 Obteniendo estadísticas de la base de datos...${NC}"
docker compose exec mysql-rbac mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} <<'EOF'
SELECT
    'TABLAS TOTALES' as Metrica,
    COUNT(*) as Valor
FROM information_schema.tables
WHERE table_schema = 'artyco_financial_rbac'
UNION ALL
SELECT
    'REGISTROS TOTALES',
    SUM(table_rows)
FROM information_schema.tables
WHERE table_schema = 'artyco_financial_rbac';
EOF

# 5. Crear backup completo
echo -e "${YELLOW}💾 Creando backup completo...${NC}"
echo -e "${BLUE}   Archivo: ${BACKUP_PATH}${NC}"

docker compose exec mysql-rbac mysqldump \
    -u ${DB_USER} \
    -p${DB_PASSWORD} \
    --single-transaction \
    --no-tablespaces \
    --skip-routines \
    --skip-events \
    --triggers \
    --set-gtid-purged=OFF \
    ${DB_NAME} \
    > "${BACKUP_PATH}"

# 6. Verificar que el backup se creó correctamente
if [ ! -f "${BACKUP_PATH}" ]; then
    echo -e "${RED}❌ ERROR: Backup no se creó${NC}"
    exit 1
fi

BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
echo -e "${GREEN}✅ Backup creado exitosamente${NC}"
echo -e "${GREEN}   Tamaño: ${BACKUP_SIZE}${NC}"

# 7. Verificar integridad del backup
echo -e "${YELLOW}🔍 Verificando integridad del backup...${NC}"
if grep -q "Dump completed" "${BACKUP_PATH}"; then
    echo -e "${GREEN}✅ Backup completado correctamente${NC}"
else
    echo -e "${RED}⚠️  ADVERTENCIA: Backup puede estar incompleto${NC}"
fi

# 8. Crear backup comprimido
echo -e "${YELLOW}📦 Comprimiendo backup...${NC}"
gzip -c "${BACKUP_PATH}" > "${BACKUP_PATH}.gz"
COMPRESSED_SIZE=$(du -h "${BACKUP_PATH}.gz" | cut -f1)
echo -e "${GREEN}✅ Backup comprimido: ${COMPRESSED_SIZE}${NC}"

# 9. Crear link al último backup
echo -e "${YELLOW}🔗 Creando link al último backup...${NC}"
ln -sf "${BACKUP_FILE}" "${BACKUP_DIR}/latest.sql"
ln -sf "${BACKUP_FILE}.gz" "${BACKUP_DIR}/latest.sql.gz"

# 10. Guardar metadata del backup
METADATA_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}_metadata.txt"
cat > "${METADATA_FILE}" <<METADATA
BACKUP METADATA
===============
Fecha: $(date)
Archivo: ${BACKUP_FILE}
Tamaño original: ${BACKUP_SIZE}
Tamaño comprimido: ${COMPRESSED_SIZE}
Base de datos: ${DB_NAME}
Host: ${DB_HOST}:${DB_PORT}
Usuario: ${DB_USER}

Propósito: Backup pre-migración multitenant (Fase 0)

Tablas incluidas:
$(docker compose exec mysql-rbac mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "SHOW TABLES;" -N)
METADATA

echo -e "${GREEN}✅ Metadata guardada en: ${METADATA_FILE}${NC}"

# 11. Resumen final
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ BACKUP COMPLETADO EXITOSAMENTE${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📁 Archivos creados:"
echo -e "   • ${BACKUP_PATH}"
echo -e "   • ${BACKUP_PATH}.gz"
echo -e "   • ${METADATA_FILE}"
echo ""
echo -e "📋 Para restaurar el backup:"
echo -e "   ${BLUE}docker compose exec mysql-rbac mysql -u ${DB_USER} -p${DB_PASSWORD} < ${BACKUP_PATH}${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Guarda este backup en un lugar seguro antes de continuar con migraciones${NC}"
echo ""
