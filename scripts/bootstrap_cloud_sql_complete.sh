#!/bin/bash
# bootstrap_cloud_sql_complete.sh - Bootstrap completo para Cloud SQL
# Ejecutar desde la raíz del proyecto: ./scripts/bootstrap_cloud_sql_complete.sh

set -e  # Exit on error

DB_HOST="${DB_HOST:-34.68.83.86}"
DB_USER="${DB_USER:-artycofinancial}"
DB_PASS="${DB_PASS:-Artyco.2025}"
DB_NAME="artyco_financial_rbac"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  BOOTSTRAP CLOUD SQL DATABASE"
echo "========================================"
echo "Host: $DB_HOST"
echo "User: $DB_USER"
echo "Database: $DB_NAME"
echo ""

# Test connection
echo -n "Testing connection... "
if MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" -e "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "Cannot connect to database. Please check credentials and network access."
    exit 1
fi

# Backup current state
echo ""
echo "========================================"
echo "  CREATING BACKUP"
echo "========================================"
BACKUP_FILE="database/backups/pre_bootstrap_$(date +%Y%m%d_%H%M%S).sql"
echo "Backing up to: $BACKUP_FILE"
mkdir -p database/backups
MYSQL_PWD="$DB_PASS" mysqldump -h "$DB_HOST" -u "$DB_USER" \
    --single-transaction \
    --routines \
    --triggers \
    "$DB_NAME" > "$BACKUP_FILE"
echo -e "${GREEN}Backup created successfully${NC}"

SCHEMA_BASE="schema/000_base_schema.sql"
MIGRATION_DIR="schema/migrations"

echo ""
echo "========================================"
echo "  [1/2] Aplicando esquema base"
echo "========================================"
if [ -f "$SCHEMA_BASE" ]; then
    MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < "$SCHEMA_BASE"
    echo -e "${GREEN}✓ ${SCHEMA_BASE} aplicado${NC}"
else
    echo -e "${YELLOW}⚠ No se encontró ${SCHEMA_BASE}. Usando scripts legacy.${NC}"
    LEGACY_SQL_FILES=(
      "docker/mysql/03-rbac-schema.sql"
      "docker/mysql/01-create-financial-tables.sql"
      "docker/mysql/02-create-raw-table.sql"
      "docker/mysql/04-align-production-metrics.sql"
      "docker/mysql/05-add-production-rbac.sql"
      "docker/mysql/06-create-production-config.sql"
      "docker/mysql/07-create-sales-bi-module.sql"
      "database/cloud_run_additions.sql"
    )
    for file in "${LEGACY_SQL_FILES[@]}"; do
      if [ -f "$file" ]; then
        echo "▶️  Aplicando ${file}..."
        MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < "$file"
      else
        echo -e "${YELLOW}⚠ Archivo no encontrado: ${file}${NC}"
      fi
    done
fi

echo ""
echo "========================================"
echo "  [2/2] Aplicando migraciones"
echo "========================================"
shopt -s nullglob
APPLIED_MIGRATIONS=0
for migration in "${MIGRATION_DIR}"/*.sql; do
    echo "▶️  ${migration}"
    MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < "$migration"
    ((APPLIED_MIGRATIONS++))
done
shopt -u nullglob
if [ "$APPLIED_MIGRATIONS" -eq 0 ]; then
    echo -e "${YELLOW}⚠ No se encontraron migraciones en ${MIGRATION_DIR}${NC}"
else
    echo -e "${GREEN}✓ ${APPLIED_MIGRATIONS} migraciones aplicadas${NC}"
fi

# Verificación
echo ""
echo "========================================"
echo "  VERIFICACIÓN POST-BOOTSTRAP"
echo "========================================"
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -e "
SELECT
    'Tablas' as tipo,
    COUNT(*) as total
FROM information_schema.tables
WHERE table_schema='$DB_NAME' AND table_type='BASE TABLE'
UNION ALL
SELECT
    'Vistas' as tipo,
    COUNT(*) as total
FROM information_schema.tables
WHERE table_schema='$DB_NAME' AND table_type='VIEW'
UNION ALL
SELECT
    'Usuarios' as tipo,
    COUNT(*) as total
FROM users
UNION ALL
SELECT
    'Roles' as tipo,
    COUNT(*) as total
FROM roles
UNION ALL
SELECT
    'Permisos' as tipo,
    COUNT(*) as total
FROM permissions
UNION ALL
SELECT
    'Role-Permissions' as tipo,
    COUNT(*) as total
FROM role_permissions;
"

echo ""
echo -e "${GREEN}========================================"
echo "  BOOTSTRAP COMPLETADO EXITOSAMENTE"
echo "========================================${NC}"
echo ""
echo "Siguiente paso: Ejecutar el script de validación"
echo "  ./scripts/validate_schema.sh"
