#!/bin/bash
# ============================================================================
# FASE 0: Validación Pre-Migración Multitenant
# Fecha: 2025-11-14
# Propósito: Verificar estado actual de la base de datos ANTES de migraciones
# ============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Configuración
DB_NAME="artyco_financial_rbac"
DB_USER="artyco_user"
DB_PASSWORD="artyco_password123"

MYSQL_CMD="docker compose exec mysql-rbac mysql -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -N -s"

echo -e "${CYAN}================================================================================${NC}"
echo -e "${WHITE}         VALIDACIÓN PRE-MIGRACIÓN MULTITENANT - $(date +%Y-%m-%d_%H:%M:%S)${NC}"
echo -e "${CYAN}================================================================================${NC}"

# Contadores
ERRORS=0
WARNINGS=0

#=============================================================================
# 1. VERIFICACIÓN DE TABLAS CRÍTICAS
#=============================================================================
echo -e "\n${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}1. VERIFICACIÓN DE TABLAS CRÍTICAS${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

CRITICAL_TABLES=(
    "companies"
    "users"
    "cotizaciones"
    "productos"
    "pagos"
    "plan_diario_produccion"
    "financial_scenarios"
    "sales_transactions"
    "financial_data"
    "balance_data"
    "raw_account_data"
)

TABLES_MISSING=0
for table in "${CRITICAL_TABLES[@]}"; do
    EXISTS=$(${MYSQL_CMD} -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='${table}';")
    if [ "$EXISTS" -eq 1 ]; then
        echo -e "${GREEN}✅ Tabla '${table}' existe${NC}"
    else
        echo -e "${RED}❌ Tabla '${table}' NO EXISTE${NC}"
        ((ERRORS++))
        ((TABLES_MISSING++))
    fi
done

if [ $TABLES_MISSING -eq 0 ]; then
    echo -e "\n${GREEN}✅ Todas las ${#CRITICAL_TABLES[@]} tablas críticas existen${NC}"
fi

#=============================================================================
# 2. ANÁLISIS DE COLUMNA company_id
#=============================================================================
echo -e "\n${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}2. ANÁLISIS DE COLUMNA company_id${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

TABLES_WITH_COMPANY_ID=0
TABLES_WITHOUT_COMPANY_ID=0

for table in "${CRITICAL_TABLES[@]}"; do
    # Skip companies table (it's the parent table)
    if [ "$table" = "companies" ]; then
        continue
    fi

    HAS_COLUMN=$(${MYSQL_CMD} -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${DB_NAME}' AND table_name='${table}' AND column_name='company_id';")
    if [ "$HAS_COLUMN" -eq 1 ]; then
        echo -e "${GREEN}✅ '${table}' tiene company_id${NC}"
        ((TABLES_WITH_COMPANY_ID++))
    else
        echo -e "${RED}❌ '${table}' NO tiene company_id${NC}"
        ((TABLES_WITHOUT_COMPANY_ID++))
    fi
done

TOTAL_CHECKED=$((TABLES_WITH_COMPANY_ID + TABLES_WITHOUT_COMPANY_ID))
PERCENTAGE=$((TABLES_WITH_COMPANY_ID * 100 / TOTAL_CHECKED))
echo -e "\n${WHITE}Resumen:${NC}"
echo -e "  ✅ Con company_id: ${TABLES_WITH_COMPANY_ID}/${TOTAL_CHECKED} (${PERCENTAGE}%)"
echo -e "  ❌ Sin company_id: ${TABLES_WITHOUT_COMPANY_ID}/${TOTAL_CHECKED}"

if [ $TABLES_WITHOUT_COMPANY_ID -gt 0 ]; then
    ((WARNINGS++))
fi

#=============================================================================
# 3. VERIFICACIÓN DE FOREIGN KEYS
#=============================================================================
echo -e "\n${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}3. VERIFICACIÓN DE FOREIGN KEYS A COMPANIES${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

TABLES_WITH_FK=0
TABLES_WITHOUT_FK=0

for table in "${CRITICAL_TABLES[@]}"; do
    # Solo verificar tablas que tienen company_id
    HAS_COLUMN=$(${MYSQL_CMD} -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${DB_NAME}' AND table_name='${table}' AND column_name='company_id';")

    if [ "$HAS_COLUMN" -eq 1 ]; then
        HAS_FK=$(${MYSQL_CMD} -e "SELECT COUNT(*) FROM information_schema.key_column_usage WHERE table_schema='${DB_NAME}' AND table_name='${table}' AND column_name='company_id' AND referenced_table_name='companies';")

        if [ "$HAS_FK" -eq 1 ]; then
            echo -e "${GREEN}✅ '${table}' tiene FK a companies${NC}"
            ((TABLES_WITH_FK++))
        else
            echo -e "${YELLOW}⚠️  '${table}' NO tiene FK a companies${NC}"
            ((TABLES_WITHOUT_FK++))
        fi
    fi
done

if [ $TABLES_WITH_COMPANY_ID -gt 0 ]; then
    FK_PERCENTAGE=$((TABLES_WITH_FK * 100 / TABLES_WITH_COMPANY_ID))
    echo -e "\n${WHITE}Resumen:${NC}"
    echo -e "  ✅ Con FK: ${TABLES_WITH_FK}/${TABLES_WITH_COMPANY_ID} (${FK_PERCENTAGE}%)"
    echo -e "  ⚠️  Sin FK: ${TABLES_WITHOUT_FK}/${TABLES_WITH_COMPANY_ID}"

    if [ $TABLES_WITHOUT_FK -gt 0 ]; then
        ((WARNINGS++))
    fi
fi

#=============================================================================
# 4. VERIFICACIÓN DE REGISTROS HUÉRFANOS
#=============================================================================
echo -e "\n${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}4. VERIFICACIÓN DE REGISTROS HUÉRFANOS${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

ORPHANED_FOUND=0

for table in "${CRITICAL_TABLES[@]}"; do
    HAS_COLUMN=$(${MYSQL_CMD} -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${DB_NAME}' AND table_name='${table}' AND column_name='company_id';")

    if [ "$HAS_COLUMN" -eq 1 ]; then
        ORPHANED=$(${MYSQL_CMD} -e "SELECT COUNT(*) FROM ${table} WHERE company_id IS NULL OR company_id NOT IN (SELECT id FROM companies);")

        if [ "$ORPHANED" -gt 0 ]; then
            echo -e "${RED}❌ '${table}': ${ORPHANED} registros huérfanos${NC}"
            ((ORPHANED_FOUND++))
            ((ERRORS++))
        else
            echo -e "${GREEN}✅ '${table}': Sin registros huérfanos${NC}"
        fi
    fi
done

if [ $ORPHANED_FOUND -eq 0 ]; then
    echo -e "\n${GREEN}✅ Ningún registro huérfano encontrado${NC}"
else
    echo -e "\n${RED}⚠️  CRÍTICO: Hay registros huérfanos que fallarán al agregar FK${NC}"
fi

#=============================================================================
# 5. CONTEO DE DATOS ACTUALES
#=============================================================================
echo -e "\n${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}5. CONTEO DE DATOS ACTUALES${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

TABLES_TO_COUNT=("companies" "users" "cotizaciones" "productos" "pagos" "plan_diario_produccion" "sales_transactions" "financial_data")

for table in "${TABLES_TO_COUNT[@]}"; do
    COUNT=$(${MYSQL_CMD} -e "SELECT COUNT(*) FROM ${table};" 2>/dev/null || echo "0")
    if [ "$COUNT" -gt 0 ]; then
        echo -e "${BLUE}ℹ️  '${table}': ${COUNT} registros${NC}"
    else
        echo -e "${YELLOW}⚠️  '${table}': Tabla vacía${NC}"
    fi
done

#=============================================================================
# 6. ANÁLISIS DE TABLA COMPANIES
#=============================================================================
echo -e "\n${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"
echo -e "${YELLOW}6. ANÁLISIS DE TABLA COMPANIES${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────────${NC}"

COMPANIES_EXISTS=$(${MYSQL_CMD} -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='companies';")

if [ "$COMPANIES_EXISTS" -eq 0 ]; then
    echo -e "${RED}❌ Tabla 'companies' NO EXISTE${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ Tabla 'companies' existe${NC}"

    # Verificar columnas SaaS
    echo -e "\n${WHITE}Columnas SaaS:${NC}"
    SAAS_COLUMNS=("slug" "is_active" "subscription_tier" "subscription_expires_at" "max_users")

    for col in "${SAAS_COLUMNS[@]}"; do
        HAS_COL=$(${MYSQL_CMD} -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${DB_NAME}' AND table_name='companies' AND column_name='${col}';")
        if [ "$HAS_COL" -eq 1 ]; then
            echo -e "${GREEN}✅ Columna '${col}' existe${NC}"
        else
            echo -e "${YELLOW}⚠️  Columna '${col}' NO existe (se agregará)${NC}"
            ((WARNINGS++))
        fi
    done

    # Contar empresas
    COMPANY_COUNT=$(${MYSQL_CMD} -e "SELECT COUNT(*) FROM companies;")
    echo -e "\n${WHITE}Total empresas:${NC} ${COMPANY_COUNT}"

    if [ "$COMPANY_COUNT" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No hay empresas registradas (se creará empresa por defecto)${NC}"
        ((WARNINGS++))
    fi

    # Verificar empresa id=1
    DEFAULT_EXISTS=$(${MYSQL_CMD} -e "SELECT COUNT(*) FROM companies WHERE id=1;")
    if [ "$DEFAULT_EXISTS" -eq 1 ]; then
        echo -e "${GREEN}✅ Empresa por defecto (id=1) existe${NC}"
    else
        echo -e "${YELLOW}⚠️  Empresa por defecto (id=1) NO existe (se creará)${NC}"
        ((WARNINGS++))
    fi
fi

#=============================================================================
# REPORTE FINAL
#=============================================================================
echo -e "\n${CYAN}================================================================================${NC}"
echo -e "${WHITE}                    REPORTE DE VALIDACIÓN PRE-MIGRACIÓN${NC}"
echo -e "${CYAN}================================================================================${NC}"

echo -e "\n${WHITE}Estado General:${NC}"
echo -e "  • Tablas verificadas: ${#CRITICAL_TABLES[@]}"
echo -e "  • Tablas con company_id: ${TABLES_WITH_COMPANY_ID} (${PERCENTAGE}%)"
echo -e "  • Tablas sin company_id: ${TABLES_WITHOUT_COMPANY_ID}"
echo -e "  • Tablas con FK: ${TABLES_WITH_FK}"
echo -e "  • Tablas sin FK: ${TABLES_WITHOUT_FK}"
echo -e "  • Registros huérfanos: $([ $ORPHANED_FOUND -gt 0 ] && echo 'SÍ' || echo 'NO')"

echo -e "\n${WHITE}Resumen de Validación:${NC}"
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Sistema listo para migración!${NC}"
    EXIT_CODE=0
elif [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}🚫 Sistema NO está listo para migración${NC}"
    echo -e "${RED}   Errores críticos: ${ERRORS}${NC}"
    echo -e "${YELLOW}   Advertencias: ${WARNINGS}${NC}"
    EXIT_CODE=1
else
    echo -e "${YELLOW}⚠️  Sistema puede migrarse con precauciones${NC}"
    echo -e "${YELLOW}   Advertencias: ${WARNINGS}${NC}"
    EXIT_CODE=0
fi

# Guardar reporte
REPORT_DIR="database/backups/multitenant"
REPORT_FILE="${REPORT_DIR}/validation_report_$(date +%Y%m%d_%H%M%S).txt"

mkdir -p "${REPORT_DIR}"

cat > "${REPORT_FILE}" <<EOF
REPORTE DE VALIDACIÓN PRE-MIGRACIÓN
====================================
Fecha: $(date)

Estado: $([ $EXIT_CODE -eq 0 ] && echo 'LISTO' || echo 'NO LISTO')
Errores: ${ERRORS}
Advertencias: ${WARNINGS}

Resultados:
  - Tablas verificadas: ${#CRITICAL_TABLES[@]}
  - Tablas con company_id: ${TABLES_WITH_COMPANY_ID}
  - Tablas sin company_id: ${TABLES_WITHOUT_COMPANY_ID}
  - Tablas con FK: ${TABLES_WITH_FK}
  - Tablas sin FK: ${TABLES_WITHOUT_FK}
  - Registros huérfanos: $([ $ORPHANED_FOUND -gt 0 ] && echo 'SÍ' || echo 'NO')
EOF

echo -e "\n${BLUE}ℹ️  Reporte guardado en: ${REPORT_FILE}${NC}"
echo ""

exit $EXIT_CODE
