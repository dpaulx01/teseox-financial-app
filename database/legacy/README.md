# Carpeta Legacy - Scripts Históricos

Esta carpeta contiene scripts SQL históricos que ya NO deben ejecutarse en nuevas instalaciones.

⚠️ **IMPORTANTE:** Estos archivos son solo para referencia histórica. NO ejecutes estos scripts.

---

## 📁 Estructura

```
legacy/
├── old_migrations/          # Migraciones ya incorporadas al schema base
├── ad_hoc/                  # Scripts de desarrollo ad-hoc (obsoletos)
├── sql/                     # Scripts SQL antiguos (pre-reorganización)
└── README_MIGRATION.md      # Documentación de migración antigua
```

---

## 📜 old_migrations/

Migraciones que ya fueron aplicadas y ahora están incluidas en `schema/000_base_schema.sql`.

**No es necesario ejecutar estos archivos** en una instalación nueva.

### Contenido

- `001_add_guia_remision.sql` - ✅ Incluido en schema base
- `002_add_fecha_despacho.sql` - ✅ Incluido en schema base
- `20241005_add_plan_diario_produccion.sql` - ✅ Incluido en schema base
- `20241015_add_manual_edit_flag.sql` - ✅ Incluido en schema base
- `20251021_add_stock_support.sql` - ✅ Incluido en schema base
- `20251022_add_en_bodega_status.sql` - ✅ Incluido en schema base
- `20251026_create_sales_bi_module.sql` - ✅ Incluido en schema base
- `20251027_add_company_id_to_users.sql` - ✅ Incluido en schema base
- `add_raw_account_data_table.sql` - ✅ Incluido en schema base

---

## 🔧 ad_hoc/

Scripts de desarrollo creados para resolver problemas específicos o hacer cambios puntuales.

**Estos scripts son obsoletos** y solo se mantienen por si se necesita consultar la historia.

### Contenido

- `apply_rbac_updates.sql` - Actualizaciones RBAC (ya en schema base)
- `create_compatible_views.sql` - Vistas de compatibilidad (obsoleto)
- `create_financial_tables.sql` - Creación de tablas financieras (ya en schema base)
- `create_raw_table.sql` - Creación de tabla raw (ya en schema base)
- `create_tables_step_by_step.sql` - Script de desarrollo (obsoleto)
- `financial_rbac_integration.sql` - Integración RBAC (ya en schema base)
- `fix_encoding.sql` - Fix de encoding UTF8 (ad-hoc)
- `fix_rbac_structure.sql` - Fix de estructura RBAC (ad-hoc)
- `fix_utf8_data.sql` - Fix de datos UTF8 (ad-hoc)
- `import_original_structure.sql` - Importación de estructura antigua (obsoleto)
- `migration_plan.sql` - Plan de migración (obsoleto)
- `setup_rbac_roles.sql` - Setup de roles (ya en schema base)
- `update_rbac_roles.sql` - Actualización de roles (ya en schema base)

---

## 📁 sql/

Scripts SQL pre-reorganización (anterior a nov 2025).

Estos archivos fueron reemplazados por el schema base unificado.

---

## 🚫 ¿Por Qué NO Ejecutar Estos Scripts?

1. **Redundancia:** Todo está en `schema/000_base_schema.sql`
2. **Inconsistencias:** Pueden usar nombres de BD antiguos (`artyco_financial` vs `artyco_financial_rbac`)
3. **Desorden:** No hay garantía de orden de ejecución
4. **Obsoletos:** Algunos scripts fueron reemplazados por versiones mejoradas

---

## ✅ ¿Qué Debo Usar en Su Lugar?

Para una instalación nueva, sigue esta guía:

1. **Aplicar schema base:**
   ```bash
   mysql -u root -p artyco_financial_rbac < schema/000_base_schema.sql
   ```

2. **Aplicar vistas:**
   ```bash
   mysql -u root -p artyco_financial_rbac < database/init/02-create-views.sql
   ```

3. **(Opcional) Datos de prueba:**
   ```bash
   mysql -u root -p artyco_financial_rbac < database/init/03-sample-data.sql
   ```

Ver documentación completa en: [database/README.md](../README.md)

---

## 🔍 ¿Cuándo Consultar Legacy?

Solo consulta estos archivos si:

- Necesitas entender cómo evolucionó el schema
- Estás investigando un bug histórico
- Quieres ver la implementación original de una feature

**No uses estos archivos para crear nuevas instalaciones.**

---

## 📅 Historial de Reorganización

**Fecha:** 2025-11-12
**Razón:** Consolidar migraciones dispersas en un schema base único
**Por:** Claude Code - Análisis automático de migraciones

### Cambios Realizados

1. ✅ Todas las migraciones consolidadas en `schema/000_base_schema.sql`
2. ✅ Scripts ad-hoc archivados en `legacy/ad_hoc/`
3. ✅ Migraciones aplicadas archivadas en `legacy/old_migrations/`
4. ✅ Documentación actualizada en `database/README.md`
5. ✅ Guía de nuevas migraciones en `schema/migrations/README.md`

---

**Mantenido por:** Equipo Artyco Financial
**Última actualización:** 2025-11-12
