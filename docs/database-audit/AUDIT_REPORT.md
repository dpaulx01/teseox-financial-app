# Reporte de Auditoría de Base de Datos
## Artyco Financial App RBAC

**Fecha**: 2025-11-08
**Auditor**: Claude Code
**Entornos Auditados**:
- Local Docker MySQL (127.0.0.1:3307)
- Cloud SQL Production (34.68.83.86)

---

## 1. RESUMEN EJECUTIVO

### 1.1 Estado General
- **Scripts SQL encontrados**: 43 archivos
- **Tablas en Local**: 36 (+ 4 vistas)
- **Tablas en Cloud**: 25 (+ 0 vistas)
- **Diferencia**: 11 tablas y 4 vistas ausentes en Cloud

### 1.2 Problemas Críticos Identificados

#### ⚠️ CRÍTICO: Sistema RBAC Incompleto en Cloud
- **Permissions**: Local tiene 82 permisos en 15 recursos vs Cloud con solo 8 permisos en 3 recursos
- **Role_permissions**: Local tiene 338 asignaciones vs Cloud con solo 13
- **Roles**: Local tiene 6 roles vs Cloud tiene 4 roles (faltan 'produccion' y 'financiero')
- **Users**: Local tiene 3 usuarios vs Cloud tiene solo 1 (admin)
- **User_roles**: Local tiene 9 asignaciones vs Cloud tiene 0

**IMPACTO**: El sistema de autorización en producción está prácticamente no funcional.

#### ⚠️ CRÍTICO: Vistas Ausentes en Cloud
Todas las vistas definidas en local están ausentes en Cloud:
- `user_permissions_view`
- `v_financial_summary`
- `v_production_summary`
- `v_sales_summary`

#### ⚠️ ALTO: Tablas Faltantes en Cloud
11 tablas completas no existen en producción:
1. `account_transactions`
2. `breakeven_data`
3. `chart_of_accounts`
4. `dashboard_configs`
5. `data_audit_log`
6. `file_uploads`
7. `user_configurations`
8. `financial_data_enhanced` (falta en ambos)
9. `analysis_config` (definida en cloud_run_additions.sql pero no existe)
10. `mixed_costs` (definida en cloud_run_additions.sql pero no existe)
11. `operational_metrics` (mencionada en SESSION_CONTEXT pero no definida)

---

## 2. COMPARACIÓN DETALLADA POR MÓDULO

### 2.1 Módulo RBAC (Role-Based Access Control)

| Tabla | Local | Cloud | Diferencia Datos |
|-------|-------|-------|------------------|
| users | ✅ (3 rows) | ✅ (1 row) | -2 usuarios faltantes |
| roles | ✅ (6 rows) | ✅ (4 rows) | -2 roles (produccion, financiero) |
| permissions | ✅ (82 rows) | ✅ (8 rows) | -74 permisos críticos |
| user_roles | ✅ (9 rows) | ✅ (0 rows) | Sistema sin asignaciones |
| role_permissions | ✅ (338 rows) | ✅ (13 rows) | -325 asignaciones |
| user_sessions | ✅ (74 rows) | ✅ (29 rows) | Sesiones activas |
| audit_logs | ✅ (55 rows) | ✅ (52 rows) | Similar |
| user_permissions_view | ✅ Vista | ❌ | Vista faltante |

**Archivos fuente**: `docker/mysql/03-rbac-schema.sql`

### 2.2 Módulo Financiero (P&G)

| Tabla | Local | Cloud | Diferencia Datos |
|-------|-------|-------|------------------|
| companies | ✅ (0 rows) | ✅ (0 rows) | Vacía en ambos |
| financial_data | ✅ (21 rows) | ✅ (9 rows) | -12 registros |
| financial_data_enhanced | ❌ | ❌ | Definida pero no creada |
| raw_account_data | ✅ (1639 rows) | ✅ (592 rows) | -1047 registros |
| chart_of_accounts | ✅ (7 rows) | ❌ | Tabla completa faltante |
| account_transactions | ✅ (0 rows) | ❌ | Tabla completa faltante |
| financial_scenarios | ✅ (0 rows) | ✅ (0 rows) | Vacía en ambos |
| v_financial_summary | ✅ Vista | ❌ | Vista faltante |

**Archivos fuente**:
- `docker/mysql/01-create-financial-tables.sql`
- `docker/mysql/02-create-raw-table.sql`
- `database/init/02-enhanced-schema.sql` (no aplicado)

### 2.3 Módulo de Producción

| Tabla | Local | Cloud | Estado |
|-------|-------|-------|--------|
| production_data | ✅ (0 rows) | ✅ (0 rows) | Vacía |
| production_config | ✅ (0 rows) | ✅ (0 rows) | Vacía |
| production_combined_data | ✅ (0 rows) | ✅ (0 rows) | Vacía |
| breakeven_data | ✅ (0 rows) | ❌ | Falta en Cloud |
| mixed_costs | ❌ | ❌ | Definida en cloud_run pero no existe |
| operational_metrics | ❌ | ❌ | Mencionada pero no definida |
| v_production_summary | ✅ Vista | ❌ | Vista faltante |

**Archivos fuente**:
- `docker/mysql/01-create-financial-tables.sql`
- `docker/mysql/04-align-production-metrics.sql`
- `docker/mysql/06-create-production-config.sql`
- `database/cloud_run_additions.sql` (parcialmente aplicado)

### 2.4 Módulo Status Producción/Cotizaciones

| Tabla | Local | Cloud | Diferencia Datos |
|-------|-------|-------|------------------|
| cotizaciones | ✅ (25 rows) | ✅ (23 rows) | -2 registros |
| productos | ✅ (83 rows) | ✅ (81 rows) | -2 registros |
| plan_diario_produccion | ✅ (0 rows) | ✅ (0 rows) | Vacía |
| pagos | ✅ (28 rows) | ✅ (26 rows) | -2 registros |

**Estado**: ✅ Estructuralmente completo
**Archivos fuente**: `database/cloud_run_additions.sql`

### 2.5 Módulo Balance General

| Tabla | Local | Cloud | Diferencia Datos |
|-------|-------|-------|------------------|
| balance_data | ✅ (99 rows) | ✅ (99 rows) | Sincronizado |
| raw_balance_data | ✅ (99 rows) | ✅ (99 rows) | Sincronizado |
| balance_config | ✅ (0 rows) | ✅ (0 rows) | Vacía |

**Estado**: ✅ Completamente sincronizado
**Archivos fuente**: `database/cloud_run_additions.sql`

### 2.6 Módulo BI Ventas

| Tabla | Local | Cloud | Diferencia Datos |
|-------|-------|-------|------------------|
| sales_transactions | ✅ (1019 rows) | ✅ (1019 rows) | Sincronizado |
| sales_kpis_cache | ✅ (0 rows) | ✅ (0 rows) | Vacía |
| sales_alerts | ✅ (0 rows) | ✅ (0 rows) | Vacía |
| sales_saved_filters | ✅ (0 rows) | ✅ (0 rows) | Vacía |
| v_sales_summary | ✅ Vista | ❌ | Vista faltante |

**Estado**: ⚠️ Estructura completa pero vista faltante
**Archivos fuente**: `docker/mysql/07-create-sales-bi-module.sql`

### 2.7 Módulo Utilidades

| Tabla | Local | Cloud | Estado |
|-------|-------|-------|--------|
| file_uploads | ✅ (0 rows) | ❌ | Falta en Cloud |
| dashboard_configs | ✅ (0 rows) | ❌ | Falta en Cloud |
| data_audit_log | ✅ (0 rows) | ❌ | Falta en Cloud |
| user_configurations | ✅ (0 rows) | ❌ | Falta en Cloud |

**Estado**: ❌ Completamente ausente en Cloud
**Archivos fuente**: `docker/mysql/01-create-financial-tables.sql`

---

## 3. ANÁLISIS DE SCRIPTS SQL

### 3.1 Scripts Base Docker (Ejecutados al iniciar contenedor)
```
docker/mysql/
├── 01-create-financial-tables.sql  ✅ Aplicado en Local
├── 02-create-raw-table.sql         ✅ Aplicado en Local y Cloud
├── 03-rbac-schema.sql              ⚠️ Parcialmente en Cloud
├── 04-align-production-metrics.sql ✅ Aplicado
├── 05-add-production-rbac.sql      ⚠️ Permisos no en Cloud
├── 06-create-production-config.sql ✅ Aplicado
└── 07-create-sales-bi-module.sql   ⚠️ Permisos y vista no en Cloud
```

### 3.2 Scripts de Migraciones
```
database/migrations/
├── 20241005_add_plan_diario_produccion.sql      ✅
├── 20241015_add_manual_edit_flag.sql            ?
├── 20251021_add_stock_support.sql               ?
├── 20251022_add_en_bodega_status.sql            ?
├── 20251024_add_production_rbac.sql             ⚠️
├── 20251026_create_sales_bi_module.sql          ⚠️
├── 20251027_add_company_id_to_users.sql         ?
└── 20250115_add_sales_transactions_indexes.sql  ?
```

### 3.3 Script Cloud Run
```
database/cloud_run_additions.sql
```
- Define `analysis_config` pero NO existe en Cloud
- Define `mixed_costs` pero NO existe en ningún entorno
- ✅ Cotizaciones, productos, pagos aplicados
- ✅ Balance aplicado
- ✅ Financial scenarios aplicado

---

## 4. TABLAS ESPERADAS PERO NO DEFINIDAS

Según `SESSION_CONTEXT.md`, estas tablas deberían existir pero no tienen definición en los scripts:

1. **financial_data_enhanced** - Mencionada pero solo existe en `database/init/02-enhanced-schema.sql` (no en docker/)
2. **analysis_types** - No definida en ningún script
3. **analysis_type_config** - No definida en ningún script
4. **analysis_visual_config** - No definida en ningún script
5. **account_exclusion_patterns** - No definida en ningún script
6. **operational_metrics** - No definida en ningún script

---

## 5. DIFERENCIAS DE DATOS CRÍTICAS

### 5.1 Usuarios y Autenticación
```
Local:
- admin@artyco.com (superuser)
- produccion@artyco.com
- financiero@artyco.com

Cloud:
- admin@artyco.com (superuser) SOLAMENTE
```

### 5.2 Permisos por Recurso (Local vs Cloud)

**Local (82 permisos totales)**:
- financial_data: read, write, delete, export
- pyg_analysis: read, execute, configure
- brain_system: query, train, configure
- portfolio: read, analyze, manage
- risk_analysis: read, execute
- transactions: read, analyze
- users: read, write, delete
- roles: read, write, assign
- system: admin, audit
- production_*: Múltiples permisos
- bi, bi_comercial, bi_financiero: Múltiples permisos
- sales: view_all, view_own, upload, manage

**Cloud (8 permisos totales)**:
- Datos extremadamente limitados (solo permisos básicos)

### 5.3 Datos Faltantes en Cloud
- **financial_data**: -12 registros
- **raw_account_data**: -1047 registros (60% menos)
- **permissions**: -74 permisos
- **role_permissions**: -325 asignaciones
- **roles**: -2 roles
- **users**: -2 usuarios
- **cotizaciones/productos/pagos**: Pequeñas diferencias (~2 registros)

---

## 6. RECOMENDACIONES Y PLAN DE ACCIÓN

### 6.1 Prioridad CRÍTICA (Ejecutar de inmediato)

#### 6.1.1 Restaurar Sistema RBAC Completo en Cloud
```bash
# Opción 1: Ejecutar script RBAC base
MYSQL_PWD='Artyco.2025' mysql -h 34.68.83.86 -u artycofinancial artyco_financial_rbac < docker/mysql/03-rbac-schema.sql

# Opción 2: Ejecutar permisos adicionales
MYSQL_PWD='Artyco.2025' mysql -h 34.68.83.86 -u artycofinancial artyco_financial_rbac < docker/mysql/05-add-production-rbac.sql
MYSQL_PWD='Artyco.2025' mysql -h 34.68.83.86 -u artycofinancial artyco_financial_rbac < docker/mysql/07-create-sales-bi-module.sql
```

#### 6.1.2 Crear Vistas Faltantes
```bash
# Extraer CREATE VIEW de scripts y aplicar
MYSQL_PWD='Artyco.2025' mysql -h 34.68.83.86 -u artycofinancial artyco_financial_rbac < vistas_faltantes.sql
```

### 6.2 Prioridad ALTA

#### 6.2.1 Crear Tablas Faltantes
```bash
# Tablas de utilidades
MYSQL_PWD='Artyco.2025' mysql -h 34.68.83.86 -u artycofinancial artyco_financial_rbac < docker/mysql/01-create-financial-tables.sql
```

#### 6.2.2 Sincronizar Usuarios
Crear usuarios 'produccion' y 'financiero' con sus respectivos roles.

### 6.3 Prioridad MEDIA

#### 6.3.1 Sincronizar Datos Financieros
Evaluar qué registros de `financial_data` y `raw_account_data` deben migrarse a Cloud.

#### 6.3.2 Aplicar cloud_run_additions.sql Completo
Verificar que todas las definiciones estén aplicadas, especialmente:
- `analysis_config`
- `mixed_costs`

### 6.4 Prioridad BAJA

#### 6.4.1 Crear Tablas Avanzadas
Definir e implementar:
- `financial_data_enhanced`
- `analysis_types`, `analysis_type_config`, `analysis_visual_config`
- `account_exclusion_patterns`
- `operational_metrics`

---

## 7. SCRIPT DE BOOTSTRAP REPRODUCIBLE

### 7.1 Orden de Ejecución Recomendado

```bash
#!/bin/bash
# bootstrap_cloud_sql.sh - Actualización completa
# Ejecutar desde la raíz del proyecto

DB_HOST="${DB_HOST:-34.68.83.86}"
DB_USER="${DB_USER:-artycofinancial}"
DB_PASS="${DB_PASS:-Artyco.2025}"
DB_NAME="artyco_financial_rbac"

echo "=== BOOTSTRAP CLOUD SQL DATABASE ==="
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"

# 1. Core RBAC (usuarios, roles, permisos básicos)
echo "[1/8] Aplicando RBAC base..."
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < docker/mysql/03-rbac-schema.sql

# 2. Tablas financieras (companies, financial_data, production, breakeven, etc.)
echo "[2/8] Aplicando tablas financieras..."
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < docker/mysql/01-create-financial-tables.sql

# 3. Raw account data
echo "[3/8] Aplicando raw_account_data..."
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < docker/mysql/02-create-raw-table.sql

# 4. Production metrics alignment
echo "[4/8] Alineando métricas de producción..."
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < docker/mysql/04-align-production-metrics.sql

# 5. Production RBAC permissions
echo "[5/8] Aplicando permisos de producción..."
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < docker/mysql/05-add-production-rbac.sql

# 6. Production config
echo "[6/8] Aplicando configuración de producción..."
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < docker/mysql/06-create-production-config.sql

# 7. Sales BI module
echo "[7/8] Aplicando módulo BI de ventas..."
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < docker/mysql/07-create-sales-bi-module.sql

# 8. Cloud-specific additions
echo "[8/8] Aplicando adiciones para Cloud Run..."
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < database/cloud_run_additions.sql

echo "=== VERIFICACIÓN ==="
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
FROM permissions;
"

echo "=== BOOTSTRAP COMPLETADO ==="
```

### 7.2 Script de Validación Post-Bootstrap

```bash
#!/bin/bash
# validate_schema.sh - Validación de esquema

DB_HOST="${DB_HOST:-34.68.83.86}"
DB_USER="${DB_USER:-artycofinancial}"
DB_PASS="${DB_PASS:-Artyco.2025}"
DB_NAME="artyco_financial_rbac"

echo "=== VALIDACIÓN DE ESQUEMA ==="

# Expected counts
EXPECTED_TABLES=36
EXPECTED_VIEWS=4
EXPECTED_USERS=3
EXPECTED_ROLES=6
EXPECTED_PERMISSIONS=82

# Get actual counts
ACTUAL_TABLES=$(MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_type='BASE TABLE';")
ACTUAL_VIEWS=$(MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_type='VIEW';")
ACTUAL_USERS=$(MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM users;")
ACTUAL_ROLES=$(MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM roles;")
ACTUAL_PERMISSIONS=$(MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -N -e "SELECT COUNT(*) FROM permissions;")

# Validate
echo "Tablas: $ACTUAL_TABLES/$EXPECTED_TABLES $([ $ACTUAL_TABLES -eq $EXPECTED_TABLES ] && echo '✅' || echo '❌')"
echo "Vistas: $ACTUAL_VIEWS/$EXPECTED_VIEWS $([ $ACTUAL_VIEWS -eq $EXPECTED_VIEWS ] && echo '✅' || echo '❌')"
echo "Usuarios: $ACTUAL_USERS/$EXPECTED_USERS $([ $ACTUAL_USERS -ge $EXPECTED_USERS ] && echo '✅' || echo '⚠️')"
echo "Roles: $ACTUAL_ROLES/$EXPECTED_ROLES $([ $ACTUAL_ROLES -eq $EXPECTED_ROLES ] && echo '✅' || echo '❌')"
echo "Permisos: $ACTUAL_PERMISSIONS/$EXPECTED_PERMISSIONS $([ $ACTUAL_PERMISSIONS -eq $EXPECTED_PERMISSIONS ] && echo '✅' || echo '❌')"

# List missing tables
echo ""
echo "=== TABLAS FALTANTES ==="
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -e "
SELECT 'account_transactions' as tabla WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='account_transactions')
UNION SELECT 'breakeven_data' WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='breakeven_data')
UNION SELECT 'chart_of_accounts' WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='chart_of_accounts')
UNION SELECT 'dashboard_configs' WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='dashboard_configs')
UNION SELECT 'data_audit_log' WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='data_audit_log')
UNION SELECT 'file_uploads' WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='file_uploads')
UNION SELECT 'user_configurations' WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='user_configurations')
UNION SELECT 'analysis_config' WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='analysis_config')
UNION SELECT 'mixed_costs' WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='mixed_costs');
"

echo ""
echo "=== VISTAS FALTANTES ==="
MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" -e "
SELECT 'user_permissions_view' as vista WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='user_permissions_view')
UNION SELECT 'v_financial_summary' WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='v_financial_summary')
UNION SELECT 'v_production_summary' WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='v_production_summary')
UNION SELECT 'v_sales_summary' WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='v_sales_summary');
"
```

---

## 8. NOTAS ADICIONALES

### 8.1 Scripts de Respaldo Encontrados
- `database/backups/full_backup_latest.sql`
- `database/backups/backup_20251026_212942.sql`
- `local_status_backup.sql`
- `cloud_status_produccion.sql`
- `cloud_status_produccion_data.sql`

### 8.2 Procedimientos Almacenados
Local tiene el procedimiento `check_user_permission` definido en RBAC schema.
**Estado en Cloud**: No verificado.

### 8.3 Índices
No se realizó auditoría completa de índices, pero estructura de tablas parece consistente donde existen.

---

## 9. CONCLUSIONES

1. **Cloud SQL está significativamente desactualizado** respecto al entorno local
2. **El sistema RBAC en producción es no funcional** debido a permisos insuficientes
3. **11 tablas completas faltan** en producción, afectando múltiples módulos
4. **Todas las vistas están ausentes** en Cloud, lo que puede causar errores en queries del backend
5. **Los scripts base de docker/ deberían ser la fuente de verdad** para ambos entornos
6. **cloud_run_additions.sql no se aplicó completamente** en Cloud
7. **Necesidad urgente de un proceso de bootstrap automatizado y verificable**

### Próximos Pasos Recomendados:
1. Ejecutar script de bootstrap en Cloud SQL inmediatamente
2. Validar con script de verificación
3. Crear proceso de CI/CD para sincronización automática
4. Documentar todas las tablas faltantes mencionadas en SESSION_CONTEXT
5. Implementar tests de integración que validen esquema completo

---

**Fin del Reporte**
