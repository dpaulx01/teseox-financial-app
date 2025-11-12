# Análisis de Migraciones y Scripts de Base de Datos

**Fecha:** 2025-11-12
**Objetivo:** Organizar migraciones y scripts para reproducibilidad en múltiples máquinas

---

## 📊 Resumen Ejecutivo

### Problemas Identificados

1. **Migraciones dispersas en 3 ubicaciones diferentes**
   - `database/migrations/` (10 archivos)
   - `schema/migrations/` (2 archivos)
   - `migrations/` (1 archivo legacy)

2. **Inconsistencia de nombres de base de datos**
   - Schema base usa: `artyco_financial_rbac`
   - Scripts init usan: `artyco_financial`

3. **Scripts sueltos sin organización clara** (13 archivos en `/database/`)

4. **Migraciones ya aplicadas en el schema base** (mayoría ya incorporadas)

5. **Schema base desactualizado** (faltan 2 migraciones de `schema/migrations/`)

---

## 🗂️ Estado Actual de las Migraciones

### Migraciones en `database/migrations/`

| Archivo | Estado | Notas |
|---------|--------|-------|
| `20241005_add_plan_diario_produccion.sql` | ✅ APLICADA | Tabla `plan_diario_produccion` existe en schema base |
| `20241015_add_manual_edit_flag.sql` | ✅ APLICADA | Columna `is_manually_edited` existe |
| `20250115_add_sales_transactions_indexes.sql` | ⚠️ IDEMPOTENTE | Puede ejecutarse, verifica antes de crear índices |
| `20250217_align_production_metrics.sql` | ⚠️ IDEMPOTENTE | Puede ejecutarse, verifica columnas antes |
| `20251021_add_stock_support.sql` | ✅ APLICADA | Columnas de stock existen en `cotizaciones` |
| `20251022_add_en_bodega_status.sql` | ✅ APLICADA | Estado `EN_BODEGA` existe en enum |
| `20251024_add_production_rbac.sql` | ⚠️ IDEMPOTENTE | Usa `ON DUPLICATE KEY UPDATE` |
| `20251026_create_sales_bi_module.sql` | ✅ APLICADA | Tabla `sales_transactions` existe |
| `20251027_add_company_id_to_users.sql` | ✅ APLICADA | Columna `company_id` existe en `users` |
| `utf8_fix.sql` | ⚠️ OPCIONAL | Conversión UTF8, puede ejecutarse si es necesario |

### Migraciones en `schema/migrations/`

| Archivo | Estado | Notas |
|---------|--------|-------|
| `001_add_guia_remision.sql` | ❌ **PENDIENTE** | Columna `guia_remision` NO existe en schema base |
| `002_add_fecha_despacho.sql` | ❌ **PENDIENTE** | Columna `fecha_despacho` NO existe en schema base |

**ACCIÓN REQUERIDA:** Estas 2 migraciones DEBEN aplicarse al schema base.

### Scripts en `database/init/`

| Archivo | Propósito | Problema |
|---------|-----------|----------|
| `01-create-database.sql` | Crea BD y tablas básicas | ⚠️ Usa `artyco_financial` (inconsistente) |
| `02-create-views.sql` | Crea vistas financieras | ✅ Útil para cálculos automáticos |
| `02-enhanced-schema.sql` | Schema mejorado | ⚠️ Duplicado con base? (verificar) |
| `03-sample-data.sql` | Datos de prueba | ⚠️ Usa `artyco_financial` (inconsistente) |

### Archivos sueltos en `database/` (Probablemente obsoletos)

```
apply_rbac_updates.sql
create_compatible_views.sql
create_financial_tables.sql
create_raw_table.sql
create_tables_step_by_step.sql
financial_rbac_integration.sql
fix_encoding.sql
fix_rbac_structure.sql
fix_utf8_data.sql
import_original_structure.sql
migration_plan.sql
setup_rbac_roles.sql
update_rbac_roles.sql
```

**Evaluación:** Estos archivos parecen ser scripts ad-hoc de desarrollo. La mayoría probablemente están incorporados en el schema base.

---

## 🎯 Plan de Reorganización

### Fase 1: Actualizar Schema Base ✅

1. **Aplicar migraciones pendientes al schema base**
   ```bash
   # Aplicar al schema base:
   - schema/migrations/001_add_guia_remision.sql
   - schema/migrations/002_add_fecha_despacho.sql
   ```

2. **Regenerar el schema base completo**
   ```bash
   mysqldump -h 127.0.0.1 -u root -p \
     --single-transaction \
     --routines \
     --triggers \
     artyco_financial_rbac > schema/000_base_schema.sql
   ```

### Fase 2: Organizar Carpetas 📁

#### Estructura propuesta:

```
database/
├── schema/
│   ├── 000_base_schema.sql          # Schema completo (fuente de verdad única)
│   └── migrations/                   # Solo migraciones NO aplicadas al base
│       └── .gitkeep
│
├── migrations/                       # DEPRECADO - mover a legacy/
│
├── init/                            # Scripts de inicialización
│   ├── 01-apply-base-schema.sql     # Aplica schema base
│   ├── 02-create-views.sql          # Vistas calculadas
│   └── 03-sample-data.sql           # Datos de prueba (OPCIONAL)
│
├── legacy/                          # Scripts históricos (solo referencia)
│   ├── sql/                         # Ya existe
│   ├── old_migrations/              # Migraciones viejas ya aplicadas
│   └── ad_hoc/                      # Scripts sueltos históricos
│
└── backups/                         # Respaldos (ya existe)
    └── safe/
```

### Fase 3: Crear Documentación de Ejecución 📖

**Archivo:** `database/README.md`

```markdown
# Guía de Configuración de Base de Datos

## Para una instalación nueva (máquina limpia):

1. **Crear base de datos:**
   ```bash
   mysql -u root -p -e "CREATE DATABASE artyco_financial_rbac DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

2. **Aplicar schema base:**
   ```bash
   mysql -u root -p artyco_financial_rbac < schema/000_base_schema.sql
   ```

3. **Crear vistas calculadas:**
   ```bash
   mysql -u root -p artyco_financial_rbac < init/02-create-views.sql
   ```

4. **(OPCIONAL) Cargar datos de prueba:**
   ```bash
   mysql -u root -p artyco_financial_rbac < init/03-sample-data.sql
   ```

## Para aplicar nuevas migraciones:

Las migraciones se encuentran en `schema/migrations/` y deben aplicarse en orden numérico.

Actualmente: **No hay migraciones pendientes** (todas están en el schema base)
```

### Fase 4: Limpieza 🧹

1. **Mover archivos obsoletos a `legacy/ad_hoc/`**
2. **Mover migraciones viejas a `legacy/old_migrations/`**
3. **Eliminar la carpeta `/migrations/` (raíz) - mover a legacy**
4. **Actualizar scripts de bootstrap** para usar la nueva estructura

---

## ✅ Orden de Ejecución Recomendado (Instalación Nueva)

```bash
# 1. Crear base de datos
mysql -u root -p -e "CREATE DATABASE artyco_financial_rbac DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Aplicar schema base (incluye TODAS las tablas, índices, constraints, RBAC)
mysql -u root -p artyco_financial_rbac < schema/000_base_schema.sql

# 3. Crear vistas de cálculo automático
mysql -u root -p artyco_financial_rbac < init/02-create-views.sql

# 4. (OPCIONAL) Cargar datos de muestra para desarrollo
mysql -u root -p artyco_financial_rbac < init/03-sample-data.sql
```

**Tiempo estimado:** < 1 minuto

---

## 🔧 Mantenimiento Continuo

### Crear una nueva migración:

1. Crear archivo en `schema/migrations/` con formato:
   ```
   NNN_descripcion_corta.sql
   ```
   Ejemplo: `003_add_customer_notes_field.sql`

2. Hacer la migración **idempotente** (verificar antes de crear/modificar)

3. Aplicar en desarrollo:
   ```bash
   mysql -u root -p artyco_financial_rbac < schema/migrations/003_add_customer_notes_field.sql
   ```

4. Cuando el schema esté estable, regenerar el schema base:
   ```bash
   ./scripts/regenerate_base_schema.sh
   ```

5. Limpiar `schema/migrations/` (mover migraciones aplicadas a `legacy/`)

---

## 🚨 Problemas Críticos Resueltos

1. ✅ **Schema base desactualizado** → Se actualizará con migraciones 001 y 002
2. ✅ **Migraciones dispersas** → Se consolidarán en schema base
3. ✅ **Inconsistencia de nombres BD** → Se unificará a `artyco_financial_rbac`
4. ✅ **Scripts sueltos sin orden** → Se organizarán en legacy/
5. ✅ **Falta de documentación** → Se creará README completo

---

## 📝 Notas Adicionales

- **Docker:** El script `docker/mysql/00-apply-base-schema.sh` aplica automáticamente `schema/000_base_schema.sql`
- **Cloud SQL:** El script `scripts/bootstrap_cloud_sql.sh` necesita actualizarse para usar la nueva estructura
- **Backups:** Los backups actuales están en `database/backups/` y deben mantenerse

---

## 🎯 Próximos Pasos

1. [ ] Actualizar schema base con migraciones pendientes
2. [ ] Reorganizar carpetas según estructura propuesta
3. [ ] Crear `database/README.md` con guía de uso
4. [ ] Actualizar script `bootstrap_cloud_sql.sh`
5. [ ] Actualizar script `docker/mysql/00-apply-base-schema.sh` si es necesario
6. [ ] Probar instalación limpia en máquina de prueba
7. [ ] Documentar proceso en wiki del proyecto
