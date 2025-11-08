#!/bin/bash
# validate_schema.sh - Validación completa de esquema
# Ejecutar desde la raíz del proyecto: ./scripts/validate_schema.sh

DB_HOST="${DB_HOST:-34.68.83.86}"
DB_USER="${DB_USER:-artycofinancial}"
DB_PASS="${DB_PASS:-Artyco.2025}"
DB_NAME="artyco_financial_rbac"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  VALIDACIÓN DE ESQUEMA"
echo "========================================"
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo ""

# Expected counts (from local Docker environment)
read -r -d '' REQUIRED_TABLES <<'EOF'
account_transactions
audit_logs
balance_config
balance_data
breakeven_data
chart_of_accounts
companies
cotizaciones
dashboard_configs
data_audit_log
file_uploads
financial_data
financial_scenarios
pagos
permissions
plan_diario_produccion
production_combined_data
production_config
production_data
productos
raw_account_data
raw_balance_data
role_permissions
roles
sales_alerts
sales_kpis_cache
sales_saved_filters
sales_transactions
user_configurations
user_roles
user_sessions
users
EOF

read -r -d '' REQUIRED_VIEWS <<'EOF'
user_permissions_view
v_financial_summary
v_production_summary
v_sales_summary
EOF

EXPECTED_TABLES=$(echo "$REQUIRED_TABLES" | grep -c '.')
EXPECTED_VIEWS=$(echo "$REQUIRED_VIEWS" | grep -c '.')
EXPECTED_USERS_MIN=1  # At least admin
EXPECTED_ROLES=6
EXPECTED_PERMISSIONS=82

# Get actual counts
echo "Obteniendo métricas actuales..."
ACTUAL_TABLES=$(MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_type='BASE TABLE';")
ACTUAL_VIEWS=$(MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_type='VIEW';")
ACTUAL_USERS=$(MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM users;")
ACTUAL_ROLES=$(MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM roles;")
ACTUAL_PERMISSIONS=$(MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM permissions;")
ACTUAL_ROLE_PERMS=$(MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM role_permissions;")

echo ""
echo "========================================"
echo "  RESUMEN DE VALIDACIÓN"
echo "========================================"

# Validate
check_count() {
    local name=$1
    local actual=$2
    local expected=$3
    local comparison=$4  # eq, ge, gt

    local result=""
    if [ "$comparison" = "eq" ]; then
        if [ "$actual" -eq "$expected" ]; then
            result="${GREEN}✅${NC}"
        else
            result="${RED}❌${NC}"
        fi
    elif [ "$comparison" = "ge" ]; then
        if [ "$actual" -ge "$expected" ]; then
            result="${GREEN}✅${NC}"
        else
            result="${YELLOW}⚠️${NC}"
        fi
    fi

    echo -e "$name: $actual/$expected $result"
}

check_count "Tablas    " "$ACTUAL_TABLES" "$EXPECTED_TABLES" "eq"
check_count "Vistas    " "$ACTUAL_VIEWS" "$EXPECTED_VIEWS" "eq"
check_count "Usuarios  " "$ACTUAL_USERS" "$EXPECTED_USERS_MIN" "ge"
check_count "Roles     " "$ACTUAL_ROLES" "$EXPECTED_ROLES" "eq"
check_count "Permisos  " "$ACTUAL_PERMISSIONS" "$EXPECTED_PERMISSIONS" "eq"

echo ""
echo "Role-Permissions: $ACTUAL_ROLE_PERMS (esperado ~338)"

# List missing tables
echo ""
echo "========================================"
echo "  TABLAS FALTANTES"
echo "========================================"

tmp_expected_tables=$(mktemp)
tmp_actual_tables=$(mktemp)
printf "%s\n" "$REQUIRED_TABLES" | sed '/^$/d' | sort > "$tmp_expected_tables"
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "
SELECT table_name FROM information_schema.tables
WHERE table_schema='$DB_NAME' AND table_type='BASE TABLE'
ORDER BY table_name;" > "$tmp_actual_tables"
MISSING_TABLES=$(comm -23 "$tmp_expected_tables" "$tmp_actual_tables")
rm -f "$tmp_expected_tables" "$tmp_actual_tables"

if [ -z "$MISSING_TABLES" ]; then
    echo -e "${GREEN}✓ Todas las tablas esperadas están presentes${NC}"
else
    echo -e "${RED}✗ Tablas faltantes:${NC}"
    echo "$MISSING_TABLES" | while read -r table; do
        echo "  - $table"
    done
fi

# List missing views
echo ""
echo "========================================"
echo "  VISTAS FALTANTES"
echo "========================================"

tmp_expected_views=$(mktemp)
tmp_actual_views=$(mktemp)
printf "%s\n" "$REQUIRED_VIEWS" | sed '/^$/d' | sort > "$tmp_expected_views"
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "
SELECT table_name FROM information_schema.tables
WHERE table_schema='$DB_NAME' AND table_type='VIEW'
ORDER BY table_name;" > "$tmp_actual_views"
MISSING_VIEWS=$(comm -23 "$tmp_expected_views" "$tmp_actual_views")
rm -f "$tmp_expected_views" "$tmp_actual_views"

if [ -z "$MISSING_VIEWS" ]; then
    echo -e "${GREEN}✓ Todas las vistas esperadas están presentes${NC}"
else
    echo -e "${RED}✗ Vistas faltantes:${NC}"
    echo "$MISSING_VIEWS" | while read -r view; do
        echo "  - $view"
    done
fi

# Check RBAC completeness
echo ""
echo "========================================"
echo "  VALIDACIÓN RBAC"
echo "========================================"

echo "Usuarios registrados:"
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -e "
SELECT
    id,
    username,
    email,
    CASE WHEN is_superuser THEN 'Sí' ELSE 'No' END as superuser,
    CASE WHEN is_active THEN 'Activo' ELSE 'Inactivo' END as estado
FROM users
ORDER BY id;
" -t

echo ""
echo "Roles definidos:"
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -e "
SELECT
    r.id,
    r.name,
    COUNT(rp.permission_id) as num_permisos,
    COUNT(ur.user_id) as num_usuarios
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN user_roles ur ON r.id = ur.role_id
GROUP BY r.id, r.name
ORDER BY r.id;
" -t

echo ""
echo "Recursos con permisos:"
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -e "
SELECT
    resource,
    COUNT(*) as num_permisos,
    GROUP_CONCAT(DISTINCT action ORDER BY action SEPARATOR ', ') as acciones
FROM permissions
GROUP BY resource
ORDER BY resource;
" -t

# Data completeness check
echo ""
echo "========================================"
echo "  COMPLETITUD DE DATOS"
echo "========================================"

MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -e "
SELECT
    table_name,
    table_rows,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = '$DB_NAME'
    AND table_type = 'BASE TABLE'
    AND table_rows > 0
ORDER BY table_rows DESC;
" -t

# Overall status
echo ""
echo "========================================"
echo "  ESTADO GENERAL"
echo "========================================"

TOTAL_ISSUES=0

if [ "$ACTUAL_TABLES" -lt "$EXPECTED_TABLES" ]; then
    ((TOTAL_ISSUES++))
fi

if [ "$ACTUAL_VIEWS" -lt "$EXPECTED_VIEWS" ]; then
    ((TOTAL_ISSUES++))
fi

if [ "$ACTUAL_PERMISSIONS" -lt "$EXPECTED_PERMISSIONS" ]; then
    ((TOTAL_ISSUES++))
fi

if [ "$TOTAL_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}"
    echo "✅ VALIDACIÓN EXITOSA"
    echo "El esquema de base de datos está completo y listo para producción."
    echo -e "${NC}"
    exit 0
else
    echo -e "${RED}"
    echo "❌ VALIDACIÓN INCOMPLETA"
    echo "Se encontraron $TOTAL_ISSUES problemas que requieren atención."
    echo "Por favor revise los detalles arriba."
    echo -e "${NC}"
    exit 1
fi
