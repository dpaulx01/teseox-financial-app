# Análisis de Migraciones y Scripts de Base de Datos

**Fecha de última revisión:** 2025-11-12  
**Objetivo:** Mantener un flujo reproducible con un único schema base y scripts históricos aislados.

---

## 📊 Situación Actual

- ✅ **Carpetas unificadas:** Toda la lógica de BD vive ahora en `database/` (init, migraciones opcionales, legacy) y `schema/` (fuente de verdad).
- ✅ **Schema base sincronizado:** `schema/000_base_schema.sql` ya incluye `guia_remision` y `fecha_despacho` junto con las tablas nuevas de producción y BI.
- ✅ **Scripts obsoletos aislados:** 13 archivos ad-hoc se movieron a `database/legacy/ad_hoc/` y 9 migraciones ya aplicadas residen en `database/legacy/old_migrations/`.
- ⚠️ **Scripts init heredados:** `database/init/01-create-database.sql` y `03-sample-data.sql` siguen apuntando a `artyco_financial` (documentados como deprecados).
- ⚠️ **Migrations opcionales:** Persisten 4 migraciones idempotentes en `database/migrations/` para ejecuciones bajo demanda.

---

## 🗂️ Estado por carpeta

### `schema/`
- `000_base_schema.sql`: volcado completo (tablas, vistas, rutinas) sin datos.
- `migrations/`: vacío, sólo `README.md` con lineamientos; cualquier migración nueva se crea aquí y luego se archiva en `legacy/old_migrations/` tras regenerar el schema.

### `database/migrations/` (idempotentes)

| Archivo | Propósito | ¿Incluido en schema base? | Acción recomendada |
|---------|-----------|---------------------------|--------------------|
| `20250115_add_sales_transactions_indexes.sql` | Índices adicionales para `sales_transactions` | Parcial | Ejecutar sólo si la carga de BI lo requiere |
| `20250217_align_production_metrics.sql` | Alias/metas en `production_data` | Sí (produce `no-op`) | Mantener como verificación idempotente |
| `20251024_add_production_rbac.sql` | Permisos/roles módulo producción | Sí (usa `ON DUPLICATE`) | Ejecutar al refrescar ambientes RBAC |
| `utf8_fix.sql` | Normaliza collation UTF8 | No aplica a estructuras | Usar solo ante incidencias de encoding |

### `database/init/`
- `02-create-views.sql`: único script requerido tras aplicar el schema base.
- `03-sample-data.sql`: datos de ejemplo (requiere reemplazar `USE artyco_financial;` antes de ejecutar).
- `02-enhanced-schema.sql` y `01-create-database.sql`: marcados como deprecados; se mantienen como referencia.

### `database/legacy/`
- `ad_hoc/`: scripts auxiliares (RBAC fixes, importadores, etc.) ya incorporados al schema.
- `old_migrations/`: migraciones históricas (`001_add_guia_remision.sql`, `20241005_add_plan_diario_produccion.sql`, etc.).
- `sql/`: estructura previa al esquema unificado (solo consulta).

---

## ✅ Flujo Recomendado

1. **Instalación nueva**
   ```bash
   mysql -u root -p -e "CREATE DATABASE artyco_financial_rbac DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u root -p artyco_financial_rbac < schema/000_base_schema.sql
   mysql -u root -p artyco_financial_rbac < database/init/02-create-views.sql
   ```
   *(Opcional)* editar `database/init/03-sample-data.sql` para apuntar a `artyco_financial_rbac` y ejecutar si se necesitan datos demo.

2. **Agregar una migración nueva**
   - Crear archivo idempotente en `schema/migrations/NNN_descripcion.sql`.
   - Probar dos veces en local.
   - Regenerar `schema/000_base_schema.sql` con `scripts/regenerate_base_schema.sh`.
   - Mover el archivo a `database/legacy/old_migrations/`.

3. **Limpiar scripts viejos**
   - Cualquier SQL puntual debe guardarse en `database/legacy/ad_hoc/` con contexto en `README.md`.

---

Con esta reorganización, el repositorio queda limpio, los scripts históricos están contenidos y la instalación se reduce a tres pasos reproducibles.

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

1. ✅ **Schema base desactualizado** → `schema/000_base_schema.sql` ahora incluye todas las columnas y vistas vigentes.
2. ✅ **Migraciones dispersas** → Archivos aplicados viven en `database/legacy/old_migrations/`; sólo quedan 4 migraciones opcionales idempotentes.
3. ✅ **Inconsistencias de nombres de BD** → Todos los docs/scripts oficiales apuntan a `artyco_financial_rbac` (excepto los dos scripts legacy documentados).
4. ✅ **Scripts sueltos sin orden** → Los 13 SQL ad-hoc fueron movidos a `database/legacy/ad_hoc/` con README explicativo.
5. ✅ **Documentación** → Nuevos READMEs (`database/README.md`, `schema/migrations/README.md`, `database/legacy/README.md`) cubren instalación, migraciones y legado.

---

## 📝 Notas Adicionales

- **Docker:** El script `docker/mysql/00-apply-base-schema.sh` aplica automáticamente `schema/000_base_schema.sql`
- **Cloud SQL:** El script `scripts/bootstrap_cloud_sql.sh` necesita actualizarse para usar la nueva estructura
- **Backups:** Los backups actuales están en `database/backups/` y deben mantenerse

---

## 🎯 Próximos Pasos

1. [ ] Actualizar `database/init/01-create-database.sql` y `03-sample-data.sql` para que usen `artyco_financial_rbac`.
2. [ ] Revisar si las migraciones opcionales pueden archivarse tras validarlas en todos los entornos.
3. [ ] Ejecutar `scripts/validate_schema.sh` en los entornos activos y documentar la verificación.
4. [ ] Sincronizar esta guía con la wiki/equipos para que sigan el nuevo flujo.
